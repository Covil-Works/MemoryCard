import './globals.css';
import React from 'react';
import { SettingsProvider } from '../components/settings-context';
import { AppHeader } from '../components/app-header';
import { VisibilityModal } from '../components/visibility-modal';

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
        <SettingsProvider>
          <AppHeader />
          <main className="flex-1 flex flex-col p-6 w-full max-w-full min-w-0">
            {children}
          </main>
          <VisibilityModal />
        </SettingsProvider>
      </body>
    </html>
  );
}
