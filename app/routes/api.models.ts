import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';

interface ModelsResponse {
  modelList: ModelInfo[];
  providers: ProviderInfo[];
  defaultProvider: ProviderInfo;
}

export async function loader({
  request,
  params,
  context,
}: {
  request: Request;
  params: { provider?: string };
  context: {
    cloudflare?: {
      env: Record<string, string>;
    };
  };
}): Promise<Response> {
  const llmManager = LLMManager.getInstance(context.cloudflare?.env);

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const providers = llmManager.getAllProviders().map((provider) => ({
    name: provider.name,
    staticModels: provider.staticModels,
    getApiKeyLink: provider.getApiKeyLink,
    labelForGetApiKey: provider.labelForGetApiKey,
    icon: provider.icon,
  }));

  const defaultProvider = llmManager.getDefaultProvider();
  const defaultProviderInfo = {
    name: defaultProvider.name,
    staticModels: defaultProvider.staticModels,
    getApiKeyLink: defaultProvider.getApiKeyLink,
    labelForGetApiKey: defaultProvider.labelForGetApiKey,
    icon: defaultProvider.icon,
  };

  let modelList: ModelInfo[] = [];

  if (params.provider) {
    const provider = llmManager.getProvider(params.provider);
    if (provider) {
      modelList = await llmManager.getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv: context.cloudflare?.env,
      });
    }
  } else {
    modelList = await llmManager.updateModelList({
      apiKeys,
      providerSettings,
      serverEnv: context.cloudflare?.env,
    });
  }

  return json<ModelsResponse>({
    modelList,
    providers,
    defaultProvider: defaultProviderInfo,
  });
}
