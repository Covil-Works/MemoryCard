'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from './settings-context';

export function AppHeader() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    projectActions,
    setIsVisibilityModalOpen,
    setIsNetworkModalOpen,
    t,
  } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const isHome = pathname === '/';

  return (
    <header className="border-b border-[#222] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between bg-[#0a0a0a] relative z-40">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/"
          className="font-mono font-bold tracking-wider text-xs sm:text-sm text-white hover:text-gray-300 transition-colors"
        >
          MEMORYCARD
        </Link>
        <span className="text-[10px] sm:text-xs text-[#555] font-mono">v0.1.0</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {!isHome && (
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-white px-1.5 sm:px-2 py-1 font-mono transition-colors"
          >
            ← {t('dashboard')}
          </Link>
        )}

        {/* Botão Acesso Celular (Apenas Computador/Desktop) */}
        <button
          onClick={() => setIsNetworkModalOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 text-gray-300 hover:text-white hover:bg-[#1a1a1a] border border-[#2b2b2b] hover:border-[#444] transition-colors rounded-sm text-xs font-mono"
          title={t('mobileAccess')}
        >
          <svg
            className="w-4 h-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" strokeWidth="2" />
            <path d="M12 18h.01" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-xs">{t('mobileAccess')}</span>
        </button>

        {/* Botão dos 3 tracinhos (Menu Hamburguer) */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1a1a1a] border border-[#2b2b2b] hover:border-[#444] transition-colors rounded-sm flex items-center justify-center focus:outline-none focus:border-white"
            aria-label="Menu de Configurações"
            aria-expanded={isMenuOpen}
            title="Menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-2 w-60 sm:w-64 max-w-[calc(100vw-1.5rem)] bg-[#111] border border-[#333] shadow-2xl p-2 text-xs flex flex-col gap-1 font-mono z-50 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              {/* Opções específicas de Projeto */}
              {projectActions?.openModelsModal && (
                <>
                  <div className="px-2 pt-1 pb-0.5 text-[10px] text-[#666] uppercase tracking-wider font-bold">
                    {t('projectSettings')}
                  </div>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      projectActions.openModelsModal?.();
                    }}
                    className="w-full text-left px-3 py-2 text-gray-200 hover:bg-[#1e1e1e] hover:text-white flex items-center justify-between transition-colors border border-transparent hover:border-[#333]"
                  >
                    <span>{t('models')}</span>
                    <span className="text-[10px] text-[#777]">→</span>
                  </button>
                  <div className="border-t border-[#222] my-1" />
                </>
              )}

              {/* Visibilidade */}
              <div className="px-2 pt-1 pb-0.5 text-[10px] text-[#666] uppercase tracking-wider font-bold">
                {t('appearance')}
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsVisibilityModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-gray-200 hover:bg-[#1e1e1e] hover:text-white flex items-center justify-between transition-colors border border-transparent hover:border-[#333]"
              >
                <span>{t('visibility')}</span>
                <span className="text-[10px] text-[#777]">→</span>
              </button>

              <div className="border-t border-[#222] my-1" />

              {/* Acesso no Celular (Apenas no Computador/Desktop) */}
              <div className="hidden sm:block">
                <div className="px-2 pt-1 pb-0.5 text-[10px] text-[#666] uppercase tracking-wider font-bold">
                  {t('mobileAccess')}
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsNetworkModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-gray-200 hover:bg-[#1e1e1e] hover:text-white flex items-center justify-between transition-colors border border-transparent hover:border-[#333]"
                >
                  <span>{t('mobileAccess')}</span>
                  <span className="text-[10px] text-[#777]">→</span>
                </button>
                <div className="border-t border-[#222] my-1" />
              </div>

              {/* Tema Visual */}
              <div className="px-2 pt-1 pb-0.5 text-[10px] text-[#666] uppercase tracking-wider font-bold">
                {t('theme')}
              </div>
              <div className="grid grid-cols-2 gap-1 px-1 py-1">
                <button
                  onClick={() => setTheme('default')}
                  className={`py-1 px-2 text-center text-xs border transition-colors ${
                    theme === 'default'
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-[#181818] text-[#888] border-[#2b2b2b] hover:text-white hover:border-[#444]'
                  }`}
                >
                  {t('themeDefault')}
                </button>
                <button
                  onClick={() => setTheme('play')}
                  className={`py-1 px-2 text-center text-xs border transition-colors ${
                    theme === 'play'
                      ? 'toggle-active bg-[#2e6db4] text-white border-[#2e6db4] font-bold'
                      : 'bg-[#181818] text-[#888] border-[#2b2b2b] hover:text-white hover:border-[#444]'
                  }`}
                >
                  {t('themePlay')}
                </button>
              </div>

              <div className="border-t border-[#222] my-1" />

              {/* Idioma */}
              <div className="px-2 pt-1 pb-0.5 text-[10px] text-[#666] uppercase tracking-wider font-bold">
                {t('language')}
              </div>
              <div className="grid grid-cols-2 gap-1 px-1 py-1">
                <button
                  onClick={() => setLanguage('pt-br')}
                  className={`py-1 px-2 text-center text-xs border transition-colors ${
                    language === 'pt-br'
                      ? theme === 'play'
                        ? 'toggle-active bg-[#2e6db4] text-white border-[#2e6db4] font-bold'
                        : 'bg-white text-black border-white font-bold'
                      : 'bg-[#181818] text-[#888] border-[#2b2b2b] hover:text-white hover:border-[#444]'
                  }`}
                >
                  PT-BR
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`py-1 px-2 text-center text-xs border transition-colors ${
                    language === 'en'
                      ? theme === 'play'
                        ? 'toggle-active bg-[#2e6db4] text-white border-[#2e6db4] font-bold'
                        : 'bg-white text-black border-white font-bold'
                      : 'bg-[#181818] text-[#888] border-[#2b2b2b] hover:text-white hover:border-[#444]'
                  }`}
                >
                  English
                </button>
              </div>

              <div className="border-t border-[#222] my-1" />

              {/* Versão */}
              <div className="px-3 py-1 text-[11px] text-[#666] flex items-center justify-between">
                <span>{t('version')}</span>
                <span className="text-gray-300 font-bold">v0.1.0</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
