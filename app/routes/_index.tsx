import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [
    { title: 'AsymiLink AI - Build full-stack apps instantly with Ollama' },
    { name: 'description', content: 'Build full-stack apps instantly with Ollama — offline or online. AsymiLink AI is your futuristic AI coding studio.' },
    { property: 'og:title', content: 'AsymiLink AI' },
    { property: 'og:description', content: 'Build full-stack apps instantly with Ollama — offline or online' },
  ];
};

export const loader = () => json({});

/**
 * Landing page component for AsymiLink AI
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #0F2B5B 50%, #0B1120 100%)', minHeight: '100vh' }}>
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
