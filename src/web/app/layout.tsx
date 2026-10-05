import './globals.css';
import React from 'react';
import { SettingsProvider } from '../components/settings-context';
import { AppHeader } from '../components/app-header';
import { VisibilityModal } from '../components/visibility-modal';
import { NetworkModal } from '../components/network-modal';

export const metadata = {
  title: 'MemoryCard',
  description: 'Gerenciamento de memória e estados de tasks para coding agents'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white min-h-screen flex flex-col font-sans overflow-x-hidden">
        <SettingsProvider>
          <AppHeader />
          <main className="flex-1 flex flex-col p-3 sm:p-6 w-full max-w-full min-w-0 overflow-x-hidden">
            {children}
          </main>
          <VisibilityModal />
          <NetworkModal />
        </SettingsProvider>
      </body>
    </html>
  );
}
