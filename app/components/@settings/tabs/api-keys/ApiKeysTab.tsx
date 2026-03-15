import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';

interface ProviderKey {
  label: string;
  envKey: string;
  placeholder: string;
  getKeyUrl?: string;
  urlLabel?: string;
}

const PROVIDERS: ProviderKey[] = [
  {
    label: 'Anthropic (Claude)',
    envKey: 'ANTHROPIC_API_KEY',
    placeholder: 'sk-ant-...',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    urlLabel: 'Get key',
  },
  {
    label: 'OpenAI (GPT-4)',
    envKey: 'OPENAI_API_KEY',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    urlLabel: 'Get key',
  },
  {
    label: 'Google (Gemini)',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    placeholder: 'AIza...',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    urlLabel: 'Get key',
  },
  {
    label: 'Groq',
    envKey: 'GROQ_API_KEY',
    placeholder: 'gsk_...',
    getKeyUrl: 'https://console.groq.com/keys',
    urlLabel: 'Get key',
  },
  {
    label: 'Mistral',
    envKey: 'MISTRAL_API_KEY',
    placeholder: 'your-mistral-key',
    getKeyUrl: 'https://console.mistral.ai/api-keys',
    urlLabel: 'Get key',
  },
  {
    label: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    urlLabel: 'Get key',
  },
  {
    label: 'xAI (Grok)',
    envKey: 'XAI_API_KEY',
    placeholder: 'xai-...',
    getKeyUrl: 'https://console.x.ai',
    urlLabel: 'Get key',
  },
  {
    label: 'OpenRouter',
    envKey: 'OPEN_ROUTER_API_KEY',
    placeholder: 'sk-or-...',
    getKeyUrl: 'https://openrouter.ai/keys',
    urlLabel: 'Get key',
  },
  {
    label: 'Perplexity',
    envKey: 'PERPLEXITY_API_KEY',
    placeholder: 'pplx-...',
    getKeyUrl: 'https://www.perplexity.ai/settings/api',
    urlLabel: 'Get key',
  },
  {
    label: 'Together AI',
    envKey: 'TOGETHER_API_KEY',
    placeholder: 'your-together-key',
    getKeyUrl: 'https://api.together.xyz/settings/api-keys',
    urlLabel: 'Get key',
  },
  {
    label: 'Fireworks AI',
    envKey: 'FIREWORKS_API_KEY',
    placeholder: 'your-fireworks-key',
    getKeyUrl: 'https://fireworks.ai/api-keys',
    urlLabel: 'Get key',
  },
  {
    label: 'Cohere',
    envKey: 'COHERE_API_KEY',
    placeholder: 'your-cohere-key',
    getKeyUrl: 'https://dashboard.cohere.com/api-keys',
    urlLabel: 'Get key',
  },
  {
    label: 'HuggingFace',
    envKey: 'HUGGINGFACE_API_KEY',
    placeholder: 'hf_...',
    getKeyUrl: 'https://huggingface.co/settings/tokens',
    urlLabel: 'Get key',
  },
];

const LOCAL_ENDPOINTS: ProviderKey[] = [
  {
    label: 'Ollama Base URL',
    envKey: 'OLLAMA_API_BASE_URL',
    placeholder: 'http://localhost:11434',
  },
  {
    label: 'LM Studio Base URL',
    envKey: 'LMSTUDIO_API_BASE_URL',
    placeholder: 'http://localhost:1234',
  },
];

type KeyState = Record<string, string>;
type ShowState = Record<string, boolean>;
type DirtyState = Record<string, boolean>;

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<KeyState>({});
  const [showKey, setShowKey] = useState<ShowState>({});
  const [dirty, setDirty] = useState<DirtyState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envPath, setEnvPath] = useState<string | null>(null);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    fetch('/api/env-keys')
      .then((r) => r.json())
      .then((data: any) => {
        setKeys(data.keys || {});
        setEnvPath(data.envPath || null);
        setIsLocal(true);
        setLoading(false);
      })
      .catch(() => {
        setIsLocal(false);
        setLoading(false);
      });
  }, []);

  const handleChange = useCallback((envKey: string, value: string) => {
    setKeys((prev) => ({ ...prev, [envKey]: value }));
    setDirty((prev) => ({ ...prev, [envKey]: true }));
  }, []);

  const handleSave = useCallback(
    async (envKey: string) => {
      if (!isLocal) {
        toast.info('API keys can only be saved to disk when running the installed version.');
        return;
      }
      setSaving(true);
      try {
        const res = await fetch('/api/env-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: { [envKey]: keys[envKey] || '' } }),
        });
        const data = (await res.json()) as any;
        if (data.success) {
          setDirty((prev) => ({ ...prev, [envKey]: false }));
          toast.success('Key saved — restart the app for it to take effect.');
        } else {
          toast.error(data.error || 'Failed to save key.');
        }
      } catch {
        toast.error('Could not reach the server.');
      } finally {
        setSaving(false);
      }
    },
    [keys, isLocal],
  );

  const handleSaveAll = useCallback(async () => {
    if (!isLocal) {
      toast.info('API keys can only be saved to disk when running the installed version.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/env-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      const data = (await res.json()) as any;
      if (data.success) {
        setDirty({});
        toast.success('All keys saved — restart the app for changes to take effect.');
      } else {
        toast.error(data.error || 'Failed to save.');
      }
    } catch {
      toast.error('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }, [keys, isLocal]);

  const hasDirty = Object.values(dirty).some(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="i-ph:spinner-gap-bold w-6 h-6 animate-spin text-bolt-elements-textSecondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isLocal && (
        <motion.div
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <div className="i-ph:warning-circle-fill w-4 h-4 shrink-0" />
            <span>
              Key file writing is only available in the installed desktop version. Keys entered here are saved in your
              browser only.
            </span>
          </div>
        </motion.div>
      )}

      {isLocal && envPath && (
        <motion.div
          className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-bolt-elements-textSecondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <div className="i-ph:file-text w-4 h-4 shrink-0 text-blue-400" />
            <span>
              Keys are stored in <code className="font-mono text-xs bg-black/10 dark:bg-white/10 px-1 rounded">{envPath}</code>
            </span>
          </div>
        </motion.div>
      )}

      <KeySection
        title="Cloud AI Providers"
        subtitle="Enter at least one API key to start using AI features"
        icon="i-ph:cloud-fill"
        providers={PROVIDERS}
        keys={keys}
        showKey={showKey}
        dirty={dirty}
        saving={saving}
        onChange={handleChange}
        onSave={handleSave}
        onToggleShow={(k) => setShowKey((prev) => ({ ...prev, [k]: !prev[k] }))}
      />

      <KeySection
        title="Local Model Endpoints"
        subtitle="Configure URLs for locally-running models (Ollama, LM Studio)"
        icon="i-ph:desktop-fill"
        providers={LOCAL_ENDPOINTS}
        keys={keys}
        showKey={showKey}
        dirty={dirty}
        saving={saving}
        isUrl
        onChange={handleChange}
        onSave={handleSave}
        onToggleShow={(k) => setShowKey((prev) => ({ ...prev, [k]: !prev[k] }))}
      />

      {hasDirty && (
        <motion.div
          className="sticky bottom-0 pb-2 pt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            disabled={saving}
            onClick={handleSaveAll}
            className={classNames(
              'w-full py-2.5 rounded-lg text-sm font-medium',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

interface KeySectionProps {
  title: string;
  subtitle: string;
  icon: string;
  providers: ProviderKey[];
  keys: KeyState;
  showKey: ShowState;
  dirty: DirtyState;
  saving: boolean;
  isUrl?: boolean;
  onChange: (envKey: string, value: string) => void;
  onSave: (envKey: string) => void;
  onToggleShow: (envKey: string) => void;
}

function KeySection({
  title,
  subtitle,
  icon,
  providers,
  keys,
  showKey,
  dirty,
  saving,
  isUrl = false,
  onChange,
  onSave,
  onToggleShow,
}: KeySectionProps) {
  return (
    <motion.div
      className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-3">
        <div className={classNames(icon, 'w-4 h-4 text-blue-400')} />
        <div>
          <p className="text-sm font-medium text-bolt-elements-textPrimary">{title}</p>
          <p className="text-xs text-bolt-elements-textSecondary">{subtitle}</p>
        </div>
      </div>

      <div className="divide-y divide-bolt-elements-borderColor">
        {providers.map((p) => {
          const value = keys[p.envKey] ?? '';
          const isDirty = dirty[p.envKey];
          const isSet = value.trim().length > 0;

          return (
            <div key={p.envKey} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-bolt-elements-textPrimary">{p.label}</span>
                  {isSet ? (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <div className="i-ph:check-circle-fill w-3 h-3" />
                      Set
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-bolt-elements-textTertiary">
                      <div className="i-ph:x-circle w-3 h-3" />
                      Not set
                    </span>
                  )}
                  {isDirty && (
                    <span className="text-xs text-amber-400 ml-auto">Unsaved</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isUrl || showKey[p.envKey] ? 'text' : 'password'}
                      value={value}
                      placeholder={p.placeholder}
                      onChange={(e) => onChange(p.envKey, e.target.value)}
                      className={classNames(
                        'w-full px-3 py-1.5 rounded-lg text-sm font-mono',
                        'bg-bolt-elements-background-depth-1',
                        'border',
                        isDirty
                          ? 'border-amber-500/60'
                          : 'border-bolt-elements-borderColor',
                        'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                        'focus:outline-none focus:ring-1 focus:ring-blue-500/40',
                        'transition-all duration-150',
                        !isUrl ? 'pr-8' : '',
                      )}
                    />
                    {!isUrl && (
                      <button
                        type="button"
                        onClick={() => onToggleShow(p.envKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary transition-colors"
                        tabIndex={-1}
                      >
                        <div className={classNames(showKey[p.envKey] ? 'i-ph:eye-slash' : 'i-ph:eye', 'w-4 h-4')} />
                      </button>
                    )}
                  </div>

                  {isDirty && (
                    <button
                      onClick={() => onSave(p.envKey)}
                      disabled={saving}
                      className={classNames(
                        'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'bg-blue-600 hover:bg-blue-700 text-white',
                        'transition-colors duration-150',
                        'disabled:opacity-50',
                      )}
                    >
                      Save
                    </button>
                  )}

                  {p.getKeyUrl && !isSet && (
                    <a
                      href={p.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={classNames(
                        'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4',
                        'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary',
                        'border border-bolt-elements-borderColor',
                        'transition-colors duration-150',
                        'flex items-center gap-1',
                      )}
                    >
                      <div className="i-ph:arrow-square-out w-3 h-3" />
                      {p.urlLabel}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
