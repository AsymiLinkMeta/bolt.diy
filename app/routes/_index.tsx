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

export default function Index() {
  return (
    <div
      className="flex flex-col h-full w-full relative"
      style={{ minHeight: '100vh', background: 'var(--bolt-elements-bg-depth-1, #0B1120)' }}
    >
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
