import type { LoaderFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ConfiguredProviders');

interface ConfiguredProvider {
  name: string;
  isConfigured: boolean;
  configMethod: 'environment' | 'none';
}

interface ConfiguredProvidersResponse {
  providers: ConfiguredProvider[];
}

const PROVIDER_ENV_KEYS: Record<string, { baseUrlKey?: string; apiTokenKey?: string }> = {
  Ollama: { baseUrlKey: 'OLLAMA_API_BASE_URL' },
  OpenAILike: { baseUrlKey: 'OPENAI_LIKE_API_BASE_URL', apiTokenKey: 'OPENAI_LIKE_API_KEY' },
  LMStudio: { baseUrlKey: 'LMSTUDIO_API_BASE_URL' },
};

/**
 * API endpoint that detects which providers are configured via environment variables.
 * This helps auto-enable providers that have been set up by the user.
 */
export const loader: LoaderFunction = async ({ context }) => {
  try {
    const llmManager = LLMManager.getInstance(context?.cloudflare?.env as any);
    const configuredProviders: ConfiguredProvider[] = [];

    for (const providerName of LOCAL_PROVIDERS) {
      let isConfigured = false;
      let configMethod: 'environment' | 'none' = 'none';

      const envKeys = PROVIDER_ENV_KEYS[providerName];

      if (envKeys) {
        if (envKeys.baseUrlKey) {
          const baseUrlEnvVar = envKeys.baseUrlKey;
          const cloudflareEnv = (context?.cloudflare?.env as Record<string, any>)?.[baseUrlEnvVar];
          const processEnv = typeof process !== 'undefined' ? process.env[baseUrlEnvVar] : undefined;
          const managerEnv = llmManager.env[baseUrlEnvVar];

          const envBaseUrl = cloudflareEnv || processEnv || managerEnv;

          const isValidEnvValue =
            envBaseUrl &&
            typeof envBaseUrl === 'string' &&
            envBaseUrl.trim().length > 0 &&
            !envBaseUrl.includes('your_') &&
            !envBaseUrl.includes('_here') &&
            envBaseUrl.startsWith('http');

          if (isValidEnvValue) {
            isConfigured = true;
            configMethod = 'environment';
          }
        }

        if (envKeys.apiTokenKey && !isConfigured) {
          const apiTokenEnvVar = envKeys.apiTokenKey;
          const envApiToken =
            (context?.cloudflare?.env as Record<string, any>)?.[apiTokenEnvVar] ||
            (typeof process !== 'undefined' ? process.env[apiTokenEnvVar] : undefined) ||
            llmManager.env[apiTokenEnvVar];

          const isValidApiToken =
            envApiToken &&
            typeof envApiToken === 'string' &&
            envApiToken.trim().length > 0 &&
            !envApiToken.includes('your_') &&
            !envApiToken.includes('_here') &&
            envApiToken.length > 10;

          if (isValidApiToken) {
            isConfigured = true;
            configMethod = 'environment';
          }
        }
      }

      configuredProviders.push({
        name: providerName,
        isConfigured,
        configMethod,
      });
    }

    return json<ConfiguredProvidersResponse>({
      providers: configuredProviders,
    });
  } catch (error) {
    logger.error('Error detecting configured providers:', error);

    return json<ConfiguredProvidersResponse>({
      providers: LOCAL_PROVIDERS.map((name) => ({
        name,
        isConfigured: false,
        configMethod: 'none' as const,
      })),
    });
  }
};
