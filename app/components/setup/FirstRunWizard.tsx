import React, { useState, useEffect, useCallback } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

const SETUP_DONE_KEY = 'asymilink_setup_complete';

interface ProviderOption {
  label: string;
  envKey: string;
  placeholder: string;
  getKeyUrl: string;
}

const POPULAR_PROVIDERS: ProviderOption[] = [
  {
    label: 'Anthropic (Claude)',
    envKey: 'ANTHROPIC_API_KEY',
    placeholder: 'sk-ant-...',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    label: 'OpenAI (GPT-4)',
    envKey: 'OPENAI_API_KEY',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    label: 'Google (Gemini)',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    placeholder: 'AIza...',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    label: 'Groq (fast & free tier)',
    envKey: 'GROQ_API_KEY',
    placeholder: 'gsk_...',
    getKeyUrl: 'https://console.groq.com/keys',
  },
  {
    label: 'OpenRouter (many models)',
    envKey: 'OPEN_ROUTER_API_KEY',
    placeholder: 'sk-or-...',
    getKeyUrl: 'https://openrouter.ai/keys',
  },
];

type Step = 'welcome' | 'keys' | 'done';

export function FirstRunWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem(SETUP_DONE_KEY);
    if (done) return;

    fetch('/api/env-keys')
      .then((r) => r.json())
      .then((data: any) => {
        setIsLocal(true);
        const existing: Record<string, string> = data.keys || {};
        const hasAnyKey = POPULAR_PROVIDERS.some((p) => (existing[p.envKey] || '').trim().length > 0);
        if (!hasAnyKey) {
          setOpen(true);
        } else {
          localStorage.setItem(SETUP_DONE_KEY, '1');
        }
      })
      .catch(() => {
        setIsLocal(false);
      });
  }, []);

  const handleChange = useCallback((envKey: string, value: string) => {
    setKeys((prev) => ({ ...prev, [envKey]: value }));
  }, []);

  const handleSaveAndFinish = useCallback(async () => {
    const nonEmpty = Object.fromEntries(Object.entries(keys).filter(([, v]) => v.trim()));
    if (Object.keys(nonEmpty).length === 0) {
      handleSkip();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/env-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: nonEmpty }),
      });
      const data = (await res.json()) as any;
      if (data.success) {
        setStep('done');
      } else {
        toast.error(data.error || 'Failed to save keys.');
      }
    } catch {
      toast.error('Could not save keys.');
    } finally {
      setSaving(false);
    }
  }, [keys]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(SETUP_DONE_KEY, '1');
    setOpen(false);
  }, []);

  const handleFinish = useCallback(() => {
    localStorage.setItem(SETUP_DONE_KEY, '1');
    setOpen(false);
    toast.success('Setup complete! Restart the app for your keys to take effect.');
  }, []);

  const filledCount = POPULAR_PROVIDERS.filter((p) => (keys[p.envKey] || '').trim()).length;

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <div className="fixed inset-0 flex items-center justify-center z-[200]">
          <RadixDialog.Overlay className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <RadixDialog.Content
            aria-describedby={undefined}
            onEscapeKeyDown={handleSkip}
            className="relative z-[201] w-full max-w-lg mx-4"
          >
            <AnimatePresence mode="wait">
              {step === 'welcome' && (
                <WelcomeStep
                  key="welcome"
                  onNext={() => setStep('keys')}
                  onSkip={handleSkip}
                />
              )}
              {step === 'keys' && (
                <KeysStep
                  key="keys"
                  providers={POPULAR_PROVIDERS}
                  keys={keys}
                  show={show}
                  saving={saving}
                  filledCount={filledCount}
                  isLocal={isLocal}
                  onChange={handleChange}
                  onToggleShow={(k) => setShow((prev) => ({ ...prev, [k]: !prev[k] }))}
                  onSave={handleSaveAndFinish}
                  onSkip={handleSkip}
                />
              )}
              {step === 'done' && (
                <DoneStep key="done" onFinish={handleFinish} />
              )}
            </AnimatePresence>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function WelcomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -12 }}
      className="bg-bolt-elements-background-depth-1 rounded-2xl shadow-2xl border border-bolt-elements-borderColor overflow-hidden"
    >
      <div className="px-8 pt-8 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-5">
          <div className="i-ph:key-fill w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-semibold text-bolt-elements-textPrimary mb-2">Welcome to AsymiLink AI</h2>
        <p className="text-sm text-bolt-elements-textSecondary leading-relaxed">
          To start building with AI, you need at least one API key from a provider like Anthropic, OpenAI, or Google.
          This takes about 2 minutes and you only need to do it once.
        </p>
      </div>

      <div className="px-8 pb-8 flex flex-col gap-3">
        <button
          onClick={onNext}
          className={classNames(
            'w-full py-3 rounded-xl text-sm font-semibold',
            'bg-blue-600 hover:bg-blue-700 text-white',
            'transition-colors duration-150',
          )}
        >
          Set up API keys
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 rounded-xl text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  );
}

interface KeysStepProps {
  providers: ProviderOption[];
  keys: Record<string, string>;
  show: Record<string, boolean>;
  saving: boolean;
  filledCount: number;
  isLocal: boolean;
  onChange: (k: string, v: string) => void;
  onToggleShow: (k: string) => void;
  onSave: () => void;
  onSkip: () => void;
}

function KeysStep({
  providers,
  keys,
  show,
  saving,
  filledCount,
  isLocal,
  onChange,
  onToggleShow,
  onSave,
  onSkip,
}: KeysStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="bg-bolt-elements-background-depth-1 rounded-2xl shadow-2xl border border-bolt-elements-borderColor overflow-hidden"
    >
      <div className="px-6 pt-6 pb-4 border-b border-bolt-elements-borderColor">
        <h2 className="text-lg font-semibold text-bolt-elements-textPrimary">Add your API keys</h2>
        <p className="text-xs text-bolt-elements-textSecondary mt-1">
          Add at least one key. You can add or change keys later in Settings &rsaquo; API Keys.
        </p>
      </div>

      <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-4">
        {providers.map((p) => {
          const value = keys[p.envKey] ?? '';
          const isSet = value.trim().length > 0;
          return (
            <div key={p.envKey}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-bolt-elements-textPrimary">{p.label}</label>
                <a
                  href={p.getKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <div className="i-ph:arrow-square-out w-3 h-3" />
                  Get free key
                </a>
              </div>
              <div className="relative">
                <input
                  type={show[p.envKey] ? 'text' : 'password'}
                  value={value}
                  placeholder={p.placeholder}
                  onChange={(e) => onChange(p.envKey, e.target.value)}
                  className={classNames(
                    'w-full px-3 py-2 pr-9 rounded-lg text-sm font-mono',
                    'bg-bolt-elements-background-depth-3',
                    'border',
                    isSet ? 'border-green-500/40' : 'border-bolt-elements-borderColor',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500/40',
                    'transition-all duration-150',
                  )}
                />
                <button
                  type="button"
                  onClick={() => onToggleShow(p.envKey)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary"
                >
                  <div className={classNames(show[p.envKey] ? 'i-ph:eye-slash' : 'i-ph:eye', 'w-4 h-4')} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!isLocal && (
        <div className="mx-6 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          Keys entered here are browser-only. For permanent storage, use the installed desktop version.
        </div>
      )}

      <div className="px-6 pb-6 pt-2 flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl text-sm text-bolt-elements-textSecondary border border-bolt-elements-borderColor hover:border-bolt-elements-textSecondary transition-colors"
        >
          Skip
        </button>
        <button
          disabled={saving}
          onClick={onSave}
          className={classNames(
            'flex-2 flex-1 py-2.5 rounded-xl text-sm font-semibold',
            filledCount > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textTertiary cursor-not-allowed',
            'transition-colors duration-150',
            'disabled:opacity-50',
          )}
        >
          {saving ? 'Saving...' : filledCount > 0 ? `Save ${filledCount} key${filledCount > 1 ? 's' : ''}` : 'Save'}
        </button>
      </div>
    </motion.div>
  );
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="bg-bolt-elements-background-depth-1 rounded-2xl shadow-2xl border border-bolt-elements-borderColor overflow-hidden"
    >
      <div className="px-8 py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
          <div className="i-ph:check-circle-fill w-9 h-9 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">You're all set!</h2>
        <p className="text-sm text-bolt-elements-textSecondary mb-8">
          Your API keys have been saved. Restart the app for them to take effect, then start building with AI.
        </p>
        <button
          onClick={onFinish}
          className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Start building
        </button>
      </div>
    </motion.div>
  );
}
