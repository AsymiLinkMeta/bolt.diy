import { generateText, type CoreTool, type GenerateTextResult, type Message } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '~/utils/constants';
import { extractCurrentContext, extractPropertiesFromMessage, simplifyBoltActions } from './utils';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('create-summary');

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

export async function createSummary(props: {
  messages: Message[];
  env?: Env;
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, any>;
  promptId?: string;
  contextOptimization?: boolean;
  onFinish?: (resp: GenerateTextResult<Record<string, CoreTool<any, any>>, never>) => void;
}) {
  const { messages, env: serverEnv, apiKeys, providerSettings, onFinish } = props;
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

  let slicedMessages = processedMessages;
  const { summary } = extractCurrentContext(processedMessages);
  let summaryText: string | undefined = undefined;
  let chatId: string | undefined = undefined;

  if (summary && summary.type === 'chatSummary') {
    chatId = summary.chatId;
    summaryText = `Below is the Chat Summary till now:\n${summary.summary}`;
    if (chatId) {
      let index = 0;
      for (let i = 0; i < processedMessages.length; i++) {
        if (processedMessages[i].id === chatId) { index = i; break; }
      }
      slicedMessages = processedMessages.slice(index + 1);
    }
  }

  logger.debug('Sliced Messages:', slicedMessages.length);

  const extractTextContent = (message: Message) =>
    Array.isArray(message.content)
      ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
      : message.content;

  const resp = await generateText({
    system: `You are a software engineer. Summarize the work and chat till now using this format:
---
# Project Overview
- **Project**: {project_name} - {brief_description}
- **Current Phase**: {phase}
- **Tech Stack**: {languages}, {frameworks}, {key_dependencies}

# Conversation Context
- **Last Topic**: {main_discussion_point}
- **Key Decisions**: {important_decisions_made}

# Implementation Status
## Current State
- **Active Feature**: {feature_in_development}
- **Progress**: {what_works_and_what_doesn't}

# Next Actions
- **Immediate**: {next_steps}
---
RULES: Only provide the summary. Do not add anything else.`,
    prompt: `Previous summary:\n<old_summary>\n${summaryText}\n</old_summary>\n\nNew chats:\n${slicedMessages
      .map((x) => `---\n[${x.role}] ${extractTextContent(x)}\n---`)
      .join('\n')}\n\nProvide updated summary.`,
    model: client(currentModel),
  });

  if (onFinish) {
    onFinish(resp);
  }

  return resp.text;
}
