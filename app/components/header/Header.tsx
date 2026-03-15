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
      className={classNames('flex items-center px-6 border-b h-[var(--header-height)] backdrop-blur-sm transition-all duration-300', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor shadow-lg': chat.started,
      })}
      style={{
        background: chat.started ? 'rgba(19, 19, 26, 0.8)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-3 z-logo cursor-pointer group">
        <div className="i-ph:sidebar-simple-duotone text-2xl text-bolt-elements-textPrimary transition-transform group-hover:scale-110" />
        <a href="/" className="flex items-center gap-3 no-underline">
          <img
            src="/AsymiLink_Logo_Blue_--sref_httpss.mj.runIOBG4O6_f687d87f-4b35-4315-b3cd-2bb4911e97de_(1)-fotor-20251021193622.png"
            alt="AsymiLink AI"
            className="h-[32px] w-auto inline-block transition-all duration-300 group-hover:scale-105"
            style={{ filter: 'drop-shadow(0 0 12px rgba(167, 139, 250, 0.4))' }}
          />
          <span
            style={{
              background: 'linear-gradient(135deg, #ffffff, #c4b5fd 40%, #a78bfa 70%, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.125rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            AsymiLink AI
          </span>
        </a>
      </div>
      {chat.started && (
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
