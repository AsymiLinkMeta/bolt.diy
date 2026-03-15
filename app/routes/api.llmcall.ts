import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import type { ProviderInfo } from '~/types/model';

export async function action(args: ActionFunctionArgs) {
  return llmCallAction(args);
}

const logger = createScopedLogger('api.llmcall');

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

async function llmCallAction({ context, request }: ActionFunctionArgs) {
  const { system, message, model, provider, streamOutput } = await request.json<{
    system: string;
    message: string;
    model: string;
    provider: ProviderInfo;
    streamOutput?: boolean;
  }>();

  const { name: providerName } = provider;

  if (!model || typeof model !== 'string') {
    throw new Response('Invalid or missing model', { status: 400, statusText: 'Bad Request' });
  }

  if (!providerName || typeof providerName !== 'string') {
    throw new Response('Invalid or missing provider', { status: 400, statusText: 'Bad Request' });
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);
  const serverEnv = context.cloudflare?.env as unknown as Record<string, string>;

  if (streamOutput) {
    try {
      const result = await streamText({
        options: { system },
        messages: [{ role: 'user', content: message }],
        env: context.cloudflare?.env as any,
        apiKeys,
        providerSettings,
      });
      return new Response(result.textStream, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (error: unknown) {
      logger.debug(error);
      throw new Response(null, { status: 500, statusText: 'Internal Server Error' });
    }
  } else {
    try {
      const client = getExternalApiClient({ providerName, apiKeys, providerSettings, serverEnv });
      logger.info(`Generating response Provider: ${providerName}, Model: ${model}`);

      const result = await generateText({
        system,
        messages: [{ role: 'user' as const, content: message }],
        model: client(model),
        maxTokens: 16384,
        temperature: 0,
        toolChoice: 'none' as const,
      });

      logger.info('Generated response');
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      logger.debug(error);
      const errorResponse = {
        error: true,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        statusCode: (error as any).statusCode || 500,
        isRetryable: (error as any).isRetryable !== false,
        provider: providerName,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Error',
      });
    }
  }
}
