import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center px-4 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center gap-2">
          <img
            src="/AsymiLink_Logo_Blue_--sref_httpss.mj.runIOBG4O6_f687d87f-4b35-4315-b3cd-2bb4911e97de_(1)-fotor-20251021193622.png"
            alt="AsymiLink AI"
            className="h-[32px] w-auto inline-block"
          />
          <span className="hidden dark:inline-block" style={{ background: 'linear-gradient(90deg, #00f5ff, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>AsymiLink AI</span>
          <span className="dark:hidden" style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>AsymiLink AI</span>
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="">
                <HeaderActionButtons chatStarted={chat.started} />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
