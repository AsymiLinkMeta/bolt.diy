import { generateText, type CoreTool, type GenerateTextResult, type Message } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import ignore from 'ignore';
import { IGNORE_PATTERNS, type FileMap } from './constants';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '~/utils/constants';
import { createFilesContext, extractCurrentContext, extractPropertiesFromMessage, simplifyBoltActions } from './utils';
import { createScopedLogger } from '~/utils/logger';

const ig = ignore().add(IGNORE_PATTERNS);
const logger = createScopedLogger('select-context');

function getExternalApiClient(options: {
  providerName?: string;
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, any>;
  serverEnv?: Record<string, string>;
}) {
  const { providerName, apiKeys, providerSettings, serverEnv } = options;
  const resolveDockerUrl = (url: string): string => {
    const isDocker =
      (typeof process !== 'undefined' && process.env?.RUNNING_IN_DOCKER === 'true') ||
      serverEnv?.RUNNING_IN_DOCKER === 'true';
    if (!isDocker) return url;
    return url.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
  };

  if (providerName === 'OpenAILike') {
    const baseUrl =
      providerSettings?.OpenAILike?.baseUrl ||
      serverEnv?.OPENAI_LIKE_API_BASE_URL ||
      (typeof process !== 'undefined' ? process.env?.OPENAI_LIKE_API_BASE_URL : undefined) ||
      'http://localhost:11434/v1';
    const apiKey =
      apiKeys?.OpenAILike ||
      serverEnv?.OPENAI_LIKE_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.OPENAI_LIKE_API_KEY : undefined) ||
      'no-key';
    return createOpenAI({ baseURL: resolveDockerUrl(baseUrl), apiKey });
  }

  const baseUrl =
    providerSettings?.Ollama?.baseUrl ||
    serverEnv?.OLLAMA_API_BASE_URL ||
    (typeof process !== 'undefined' ? process.env?.OLLAMA_API_BASE_URL : undefined) ||
    'http://localhost:11434';
  return createOpenAI({ baseURL: resolveDockerUrl(`${baseUrl}/v1`), apiKey: 'ollama' });
}

export async function selectContext(props: {
  messages: Message[];
  env?: Env;
  apiKeys?: Record<string, string>;
  files: FileMap;
  providerSettings?: Record<string, any>;
  promptId?: string;
  contextOptimization?: boolean;
  summary: string;
  onFinish?: (resp: GenerateTextResult<Record<string, CoreTool<any, any>>, never>) => void;
}) {
  const { messages, env: serverEnv, apiKeys, files, providerSettings, summary, onFinish } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;

  const processedMessages = messages.map((message) => {
    if (message.role === 'user') {
      const { model, provider, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider;
      return { ...message, content };
    } else if (message.role === 'assistant') {
      let content = message.content;
      content = simplifyBoltActions(content);
      content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, '');
      content = content.replace(/<think>.*?<\/think>/s, '');
      return { ...message, content };
    }
    return message;
  });

  const client = getExternalApiClient({
    providerName: currentProvider,
    apiKeys,
    providerSettings,
    serverEnv: serverEnv as any,
  });

  const { codeContext } = extractCurrentContext(processedMessages);

  let filePaths = getFilePaths(files || {});
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  let context = '';
  const currrentFiles: string[] = [];
  const contextFiles: FileMap = {};

  if (codeContext?.type === 'codeContext') {
    const codeContextFiles: string[] = codeContext.files;
    Object.keys(files || {}).forEach((path) => {
      let relativePath = path;
      if (path.startsWith('/home/project/')) relativePath = path.replace('/home/project/', '');
      if (codeContextFiles.includes(relativePath)) {
        contextFiles[relativePath] = files[path];
        currrentFiles.push(relativePath);
      }
    });
    context = createFilesContext(contextFiles);
  }

  const summaryText = `Here is the summary of the chat till now: ${summary}`;

  const extractTextContent = (message: Message) =>
    Array.isArray(message.content)
      ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
      : message.content;

  const lastUserMessage = processedMessages.filter((x) => x.role === 'user').pop();

  if (!lastUserMessage) {
    throw new Error('No user message found');
  }

  const resp = await generateText({
    system: `You are a software engineer. You are working on a project. You have access to the following files:

AVAILABLE FILES PATHS
---
${filePaths.map((path) => `- ${path}`).join('\n')}
---

You have following code loaded in the context buffer that you can refer to:

CURRENT CONTEXT BUFFER
---
${context}
---

Now, you are given a task. You need to select the files that are relevant to the task from the list of files above.

RESPONSE FORMAT:
---
<updateContextBuffer>
    <includeFile path="path/to/file"/>
    <excludeFile path="path/to/file"/>
</updateContextBuffer>
---`,
    prompt: `${summaryText}

Users Question: ${extractTextContent(lastUserMessage)}

update the context buffer with the files that are relevant to the task.

CRITICAL RULES:
* Only include relevant files in the context buffer.
* context buffer is extremely expensive, so only include files that are absolutely necessary.
* If no changes are needed, you can leave the response empty updateContextBuffer tag.
* Only 5 files can be placed in the context buffer at a time.
* if the buffer is full, you need to exclude files that is not needed and include files that is relevant.`,
    model: client(currentModel),
  });

  const response = resp.text;
  const updateContextBuffer = response.match(/<updateContextBuffer>([\s\S]*?)<\/updateContextBuffer>/);

  if (!updateContextBuffer) {
    throw new Error('Invalid response. Please follow the response format');
  }

  const includeFiles =
    updateContextBuffer[1]
      .match(/<includeFile path="(.*?)"/gm)
      ?.map((x) => x.replace('<includeFile path="', '').replace('"', '')) || [];
  const excludeFiles =
    updateContextBuffer[1]
      .match(/<excludeFile path="(.*?)"/gm)
      ?.map((x) => x.replace('<excludeFile path="', '').replace('"', '')) || [];

  const filteredFiles: FileMap = {};
  excludeFiles.forEach((path) => { delete contextFiles[path]; });
  includeFiles.forEach((path) => {
    let fullPath = path;
    if (!path.startsWith('/home/project/')) fullPath = `/home/project/${path}`;
    if (!filePaths.includes(fullPath)) {
      logger.error(`File ${path} is not in the list of files above.`);
      return;
    }
    if (currrentFiles.includes(path)) return;
    filteredFiles[path] = files[fullPath];
  });

  if (onFinish) onFinish(resp);

  const totalFiles = Object.keys(filteredFiles).length;
  logger.info(`Total files: ${totalFiles}`);

  if (totalFiles === 0) {
    throw new Error(`Bolt failed to select files`);
  }

  return filteredFiles;
}

export function getFilePaths(files: FileMap) {
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });
  return filePaths;
}
