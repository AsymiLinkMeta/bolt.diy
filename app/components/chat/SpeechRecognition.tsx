import React, { useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { classNames } from '~/utils/classNames';
import { isMac } from '~/utils/os';

interface SpeechRecognitionButtonProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
  isSupported?: boolean;
}

export const SpeechRecognitionButton = ({
  isListening,
  onStart,
  onStop,
  disabled,
  isSupported = true,
}: SpeechRecognitionButtonProps) => {
  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModKey = isMac ? e.metaKey : e.ctrlKey;

      if (isModKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();

        if (disabled || !isSupported) {
          return;
        }

        if (isListening) {
          onStop();
        } else {
          onStart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isListening, onStart, onStop, disabled, isSupported]);

  if (!isSupported) {
    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className="inline-flex items-center justify-center w-8 h-8 opacity-30 cursor-not-allowed">
              <MicIcon muted />
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary text-xs rounded px-2.5 py-1.5 shadow-lg border border-bolt-elements-borderColor max-w-[200px] text-center z-[9999]"
              sideOffset={8}
            >
              Voice input requires Chrome, Edge, or Electron
              <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            className={classNames(
              'relative inline-flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5ff]/60',
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : isListening
                  ? 'text-[#00f5ff] cursor-pointer'
                  : 'text-bolt-elements-textTertiary hover:text-[#00f5ff] hover:bg-[#00f5ff]/10 cursor-pointer',
            )}
            onClick={isListening ? onStop : onStart}
          >
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-md animate-[voicePing_1.4s_ease-out_infinite] bg-[#00f5ff]/20" />
                <span className="absolute inset-[-4px] rounded-lg animate-[voicePing_1.4s_ease-out_infinite_0.4s] bg-[#00f5ff]/10" />
              </>
            )}
            <span className="relative z-10">
              {isListening ? <MicActiveIcon /> : <MicIcon />}
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary text-xs rounded px-2.5 py-1.5 shadow-lg border border-bolt-elements-borderColor z-[9999] flex items-center gap-1.5"
            sideOffset={8}
          >
            {isListening ? 'Stop listening' : 'Speak your prompt'}
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-1 text-[10px] font-mono border border-bolt-elements-borderColor">
              {modKey}+K
            </kbd>
            <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

function MicIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {muted ? (
        <>
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
          <path d="M5 10v2a7 7 0 0 0 12 5" />
          <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </>
      ) : (
        <>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </>
      )}
    </svg>
  );
}

function MicActiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" />
      <line x1="12" y1="19" x2="12" y2="22" fill="none" />
    </svg>
  );
}
