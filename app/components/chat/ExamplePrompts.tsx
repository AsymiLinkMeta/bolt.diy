import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Build a SaaS landing page' },
  { text: 'Create a todo app in React' },
  { text: 'Build a REST API with Node.js' },
  { text: 'Make a real-time chat app' },
  { text: 'Build a dashboard with charts' },
  { text: 'Create a mobile-first portfolio' },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col gap-4 w-full max-w-3xl mx-auto flex justify-center mt-4">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.3s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="border rounded-full px-4 py-1.5 text-sm transition-all duration-200"
              style={{
                borderColor: 'rgba(0,245,255,0.2)',
                background: 'rgba(0,245,255,0.05)',
                color: 'rgba(148,163,184,0.9)',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,245,255,0.5)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,245,255,0.1)';
                (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,245,255,0.2)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,245,255,0.05)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(148,163,184,0.9)';
              }}
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
