import './globals.css';
import React from 'react';
import { Poppins } from 'next/font/google';
import { SettingsProvider } from '../components/settings-context';
import { AppHeader } from '../components/app-header';
import { VisibilityModal } from '../components/visibility-modal';
import { NetworkModal } from '../components/network-modal';
import { PlayNoiseOverlay } from '../components/play-noise-overlay';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

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
    <html lang="pt-BR" className={poppins.variable}>
      <body className={`${poppins.className} bg-[var(--bg-primary)] text-white min-h-screen flex flex-col font-sans overflow-x-hidden`}>
        <SettingsProvider>
          <AppHeader />
          <main className="flex-1 flex flex-col p-3 sm:p-6 w-full max-w-full min-w-0 overflow-x-hidden">
            {children}
          </main>
          <VisibilityModal />
          <NetworkModal />
          <PlayNoiseOverlay />
        </SettingsProvider>
      </body>
    </html>
  );
}
