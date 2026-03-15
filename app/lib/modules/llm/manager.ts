import type { ModelInfo, ProviderInfo } from './types';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMManager');

const OLLAMA_MODELS: ModelInfo[] = [];
const OPENAI_LIKE_MODELS: ModelInfo[] = [];

const BUILT_IN_PROVIDERS: ProviderInfo[] = [
  {
    name: 'Ollama',
    staticModels: OLLAMA_MODELS,
    icon: 'i-bolt:ollama',
    async getDynamicModels(apiKeys, settings, serverEnv) {
      const baseUrl =
        settings?.baseUrl ||
        serverEnv?.OLLAMA_API_BASE_URL ||
        (typeof process !== 'undefined' ? process.env?.OLLAMA_API_BASE_URL : undefined) ||
        'http://localhost:11434';
      try {
        const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return [];
        const data = (await response.json()) as { models?: { name: string }[] };
        return (data.models || []).map((m) => ({
          name: m.name,
          label: m.name,
          provider: 'Ollama',
          maxTokenAllowed: 32768,
        }));
      } catch {
        return [];
      }
    },
  },
  {
    name: 'OpenAILike',
    staticModels: OPENAI_LIKE_MODELS,
    icon: 'i-bolt:openai',
    async getDynamicModels(apiKeys, settings, serverEnv) {
      const baseUrl =
        settings?.baseUrl ||
        serverEnv?.OPENAI_LIKE_API_BASE_URL ||
        (typeof process !== 'undefined' ? process.env?.OPENAI_LIKE_API_BASE_URL : undefined);
      if (!baseUrl) return [];
      const apiKey = apiKeys?.OpenAILike || serverEnv?.OPENAI_LIKE_API_KEY;
      try {
        const response = await fetch(`${baseUrl}/models`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return [];
        const data = (await response.json()) as { data?: { id: string }[] };
        return (data.data || []).map((m) => ({
          name: m.id,
          label: m.id,
          provider: 'OpenAILike',
          maxTokenAllowed: 32768,
        }));
      } catch {
        return [];
      }
    },
  },
];

export class LLMManager {
  private static _instance: LLMManager;
  private _env: Record<string, string> = {};

  private constructor(env: Record<string, string>) {
    this._env = env;
  }

  static getInstance(env: Record<string, string> = {}): LLMManager {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env);
    } else if (Object.keys(env).length > 0) {
      LLMManager._instance._env = env;
    }
    return LLMManager._instance;
  }

  get env() {
    return this._env;
  }

  getAllProviders(): ProviderInfo[] {
    return BUILT_IN_PROVIDERS;
  }

  getDefaultProvider(): ProviderInfo {
    return BUILT_IN_PROVIDERS[0];
  }

  getProvider(name: string): ProviderInfo | undefined {
    return BUILT_IN_PROVIDERS.find((p) => p.name === name);
  }

  getModelList(): ModelInfo[] {
    return BUILT_IN_PROVIDERS.flatMap((p) => p.staticModels);
  }

  async updateModelList(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, any>;
    serverEnv?: Record<string, string>;
  }): Promise<ModelInfo[]> {
    const allModels: ModelInfo[] = [];
    for (const provider of BUILT_IN_PROVIDERS) {
      if (provider.getDynamicModels) {
        try {
          const models = await provider.getDynamicModels(
            options.apiKeys,
            options.providerSettings?.[provider.name],
            options.serverEnv,
          );
          allModels.push(...models);
        } catch (err) {
          logger.error(`Error getting models for ${provider.name}:`, err);
        }
      }
    }
    return allModels;
  }

  async getModelListFromProvider(
    providerArg: ProviderInfo,
    options: {
      apiKeys?: Record<string, string>;
      providerSettings?: Record<string, any>;
      serverEnv?: Record<string, string>;
    },
  ): Promise<ModelInfo[]> {
    const provider = BUILT_IN_PROVIDERS.find((p) => p.name === providerArg.name);
    if (!provider) return [];
    if (!provider.getDynamicModels) return provider.staticModels;
    try {
      return await provider.getDynamicModels(
        options.apiKeys,
        options.providerSettings?.[provider.name],
        options.serverEnv,
      );
    } catch {
      return provider.staticModels;
    }
  }

  getStaticModelList(): ModelInfo[] {
    return BUILT_IN_PROVIDERS.flatMap((p) => p.staticModels);
  }

  getStaticModelListFromProvider(providerArg: ProviderInfo): ModelInfo[] {
    const provider = BUILT_IN_PROVIDERS.find((p) => p.name === providerArg.name);
    return provider?.staticModels || [];
  }
}
