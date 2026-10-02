import './globals.css';
import React from 'react';

export const metadata = {
  title: 'MemoryCard',
  description: 'Gerenciamento de memória e estados de tasks para coding agents'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white min-h-screen flex flex-col font-sans">
        <header className="border-b border-[#222] px-6 py-3 flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-4">
            <a href="/" className="font-mono font-bold tracking-wider text-sm text-white hover:text-gray-300">
              MEMORYCARD
            </a>
            <span className="text-xs text-[#555] font-mono">v0.1.0</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-gray-400 hover:text-white px-2 py-1">
              Dashboard
            </a>
          </div>
        </header>
        <main className="flex-1 flex flex-col p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
