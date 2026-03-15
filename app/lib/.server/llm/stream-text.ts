import { convertToCoreMessages, streamText as _streamText, type Message } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { MAX_TOKENS, type FileMap } from './constants';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODIFICATIONS_TAG_NAME, WORK_DIR } from '~/utils/constants';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { allowedHTMLElements } from '~/utils/markdown';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { discussPrompt } from '~/lib/common/prompts/discuss-prompt';
import type { DesignScheme } from '~/types/design-scheme';

export type Messages = Message[];

export interface StreamingOptions extends Omit<Parameters<typeof _streamText>[0], 'model'> {
  supabaseConnection?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: {
      anonKey?: string;
      supabaseUrl?: string;
    };
  };
}

const logger = createScopedLogger('stream-text');

function sanitizeText(text: string): string {
  let sanitized = text.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, '');
  sanitized = sanitized.replace(/<think>.*?<\/think>/s, '');
  sanitized = sanitized.replace(/<boltAction type="file" filePath="package-lock\.json">[\s\S]*?<\/boltAction>/g, '');
  return sanitized.trim();
}

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

export async function streamText(props: {
  messages: Omit<Message, 'id'>[];
  env?: Env;
  options?: StreamingOptions;
  apiKeys?: Record<string, string>;
  files?: FileMap;
  providerSettings?: Record<string, any>;
  promptId?: string;
  contextOptimization?: boolean;
  contextFiles?: FileMap;
  summary?: string;
  messageSliceId?: number;
  chatMode?: 'discuss' | 'build';
  designScheme?: DesignScheme;
}) {
  const {
    messages,
    env: serverEnv,
    options,
    apiKeys,
    files,
    providerSettings,
    promptId,
    contextOptimization,
    contextFiles,
    summary,
    chatMode,
    designScheme,
  } = props;

  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;

  let processedMessages = messages.map((message) => {
    const newMessage = { ...message };
    if (message.role === 'user') {
      const { model, provider, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider;
      newMessage.content = sanitizeText(content);
    } else if (message.role === 'assistant') {
      newMessage.content = sanitizeText(message.content);
    }
    if (Array.isArray(message.parts)) {
      newMessage.parts = message.parts.map((part) =>
        part.type === 'text' ? { ...part, text: sanitizeText(part.text) } : part,
      );
    }
    return newMessage;
  });

  const client = getExternalApiClient({
    providerName: currentProvider,
    apiKeys,
    providerSettings,
    serverEnv: serverEnv as any,
  });

  let systemPrompt =
    PromptLibrary.getPropmtFromLibrary(promptId || 'default', {
      cwd: WORK_DIR,
      allowedHtmlElements: allowedHTMLElements,
      modificationTagName: MODIFICATIONS_TAG_NAME,
      designScheme,
      supabase: {
        isConnected: options?.supabaseConnection?.isConnected || false,
        hasSelectedProject: options?.supabaseConnection?.hasSelectedProject || false,
        credentials: options?.supabaseConnection?.credentials || undefined,
      },
    }) ?? getSystemPrompt();

  if (chatMode === 'build' && contextFiles && contextOptimization) {
    const codeContext = createFilesContext(contextFiles, true);
    systemPrompt = `${systemPrompt}

    Below is the artifact containing the context loaded into context buffer for you to have knowledge of and might need changes to fullfill current user request.
    CONTEXT BUFFER:
    ---
    ${codeContext}
    ---
    `;

    if (summary) {
      systemPrompt = `${systemPrompt}
      below is the chat history till now
      CHAT SUMMARY:
      ---
      ${props.summary}
      ---
      `;

      if (props.messageSliceId) {
        processedMessages = processedMessages.slice(props.messageSliceId);
      } else {
        const lastMessage = processedMessages.pop();
        if (lastMessage) {
          processedMessages = [lastMessage];
        }
      }
    }
  }

  if (files) {
    const lockedFilePaths: string[] = [];
    for (const [filePath, fileDetails] of Object.entries(files)) {
      if (fileDetails?.isLocked) lockedFilePaths.push(filePath);
    }
    if (lockedFilePaths.length > 0) {
      const lockedFilesListString = lockedFilePaths.map((p) => `- ${p}`).join('\n');
      systemPrompt = `${systemPrompt}

    IMPORTANT: The following files are locked and MUST NOT be modified in any way:
    ${lockedFilesListString}
    ---
    `;
    }
  }

  logger.info(`Sending llm call to ${currentProvider} with model ${currentModel}`);

  const { supabaseConnection: _supabase, ...filteredOptions } = options || {};

  return await _streamText({
    model: client(currentModel),
    system: chatMode === 'build' ? systemPrompt : discussPrompt(),
    maxTokens: Math.min(MAX_TOKENS, 16384),
    messages: convertToCoreMessages(processedMessages as any),
    ...filteredOptions,
  });
}
