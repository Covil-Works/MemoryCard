'use client';

import React, { useState } from 'react';
import { useSettings, ColumnHeightMode, Theme } from './settings-context';

export function VisibilityModal() {
  const {
    isVisibilityModalOpen,
    setIsVisibilityModalOpen,
    visibilitySettings,
    setVisibilitySettings,
    theme,
    setTheme,
    t,
  } = useSettings();

  const [selectedTheme, setSelectedTheme] = useState<Theme>(
    visibilitySettings.theme || theme || 'default'
  );
  const [mode, setMode] = useState<ColumnHeightMode>(
    visibilitySettings.mode === 'tasks' ? 'tasks' : 'auto'
  );
  const [tasksLimit, setTasksLimit] = useState<number>(visibilitySettings.tasksLimit || 5);

  if (!isVisibilityModalOpen) return null;

  const handleSave = () => {
    setVisibilitySettings({
      ...visibilitySettings,
      mode,
      tasksLimit: Math.max(1, Math.min(50, tasksLimit)),
      theme: selectedTheme,
    });
    setTheme(selectedTheme);
    setIsVisibilityModalOpen(false);
  };

  const handleReset = () => {
    setSelectedTheme('default');
    setMode('auto');
    setTasksLimit(5);
    setVisibilitySettings({
      ...visibilitySettings,
      mode: 'auto',
      tasksLimit: 5,
      theme: 'default',
    });
    setTheme('default');
    setIsVisibilityModalOpen(false);
  };

  // Determina se a interface deve exibir estados ativos coloridos (tema play ativo ou preview local)
  const isPlayActive = theme === 'play' || selectedTheme === 'play';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="modal-surface bg-[#111] border border-[#333] max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl">
        {/* Cabeçalho fixo no topo - Tema Maior: Visibilidade */}
        <div className="modal-header p-3.5 sm:p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <div>
            <h2 className="text-sm font-bold font-mono text-white">
              {t('visibilitySettingsTitle')}
            </h2>
            <p className="text-xs text-[#777] font-mono mt-0.5">
              {t('visibilityDesc')}
            </p>
          </div>
          <button
            onClick={() => setIsVisibilityModalOpen(false)}
            className="text-[#888] hover:text-white font-mono text-sm px-2 py-1"
            title={t('close')}
          >
            ✕
          </button>
        </div>

        {/* Corpo com scroll interno para temas e configurações */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar">
          {/* Tema 1: Tema visual (UI-001) */}
          <div className="border border-[#222] bg-[#0c0c0c] p-3.5 sm:p-5 flex flex-col gap-4">
            <div className="border-b border-[#1f1f1f] pb-3">
              <h3 className="text-base font-bold font-mono text-white tracking-wide">
                {t('visualThemeTitle')}
              </h3>
              <p className="text-xs text-[#777] font-mono mt-1">
                {t('visualThemeDesc')}
              </p>
            </div>

            {/* Configuração de Tema: Padrão vs Play */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono text-[#aaa]">
                  {t('configThemeLabel')}
                </span>

                {/* Opção única de alternância */}
                <div className="inline-flex p-1 bg-[#141414] border border-[#2b2b2b] rounded-sm gap-1 w-full sm:w-auto justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setSelectedTheme('default')}
                    className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-mono transition-colors rounded-sm ${
                      selectedTheme === 'default'
                        ? isPlayActive
                          ? 'toggle-active bg-[#2e6db4] text-white font-bold shadow-sm'
                          : 'bg-white text-black font-bold shadow-sm'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {t('themeDefault')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTheme('play')}
                    className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-mono transition-colors rounded-sm ${
                      selectedTheme === 'play'
                        ? isPlayActive
                          ? 'toggle-active bg-[#2e6db4] text-white font-bold shadow-sm'
                          : 'bg-white text-black font-bold shadow-sm'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {t('themePlay')}
                  </button>
                </div>
              </div>

              {/* Descrição contextual dinâmica */}
              <div className="p-3 bg-[#111] border border-[#222] text-xs text-[#999] leading-relaxed">
                {selectedTheme === 'default' ? (
                  <p>{t('themeDefaultDesc')}</p>
                ) : (
                  <p>{t('themePlayDesc')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tema 2: Altura das colunas (UI-001) */}
          <div className="border border-[#222] bg-[#0c0c0c] p-3.5 sm:p-5 flex flex-col gap-4">
            <div className="border-b border-[#1f1f1f] pb-3">
              <h3 className="text-base font-bold font-mono text-white tracking-wide">
                {t('columnHeightTitle')}
              </h3>
              <p className="text-xs text-[#777] font-mono mt-1">
                {t('columnHeightDesc')}
              </p>
            </div>

            {/* Configuração de Modo: Padrão vs Personalizado */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono text-[#aaa]">
                  {t('configModeLabel')}
                </span>
                
                {/* Opção única de alternância */}
                <div className="inline-flex p-1 bg-[#141414] border border-[#2b2b2b] rounded-sm gap-1 w-full sm:w-auto justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-mono transition-colors rounded-sm ${
                      mode === 'auto'
                        ? isPlayActive
                          ? 'toggle-active bg-[#2e6db4] text-white font-bold shadow-sm'
                          : 'bg-white text-black font-bold shadow-sm'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {t('modeDefault')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('tasks')}
                    className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-mono transition-colors rounded-sm ${
                      mode === 'tasks'
                        ? isPlayActive
                          ? 'toggle-active bg-[#2e6db4] text-white font-bold shadow-sm'
                          : 'bg-white text-black font-bold shadow-sm'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {t('modeCustom')}
                  </button>
                </div>
              </div>

              {/* Descrição contextual dinâmica */}
              <div className="p-3 bg-[#111] border border-[#222] text-xs text-[#999] leading-relaxed">
                {mode === 'auto' ? (
                  <p>{t('modeDefaultDesc')}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p>{t('modeCustomDesc')}</p>
                    <div className="pt-3 border-t border-[#222] flex items-center justify-between flex-wrap gap-3">
                      <label className="text-xs font-mono text-white font-medium">
                        {t('tasksLimitLabel')}
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={tasksLimit}
                          onChange={(e) => setTasksLimit(parseInt(e.target.value, 10) || 1)}
                          className="input w-20 text-xs font-mono py-1 px-2 text-center"
                        />
                        <div className="flex items-center gap-1">
                          {[3, 5, 7, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setTasksLimit(num)}
                              className={`btn text-xs px-2 py-0.5 ${
                                tasksLimit === num
                                  ? isPlayActive
                                    ? 'shortcut-num-active bg-[#f69dc8] text-black border-[#f69dc8] font-bold'
                                    : 'bg-white text-black border-white'
                                  : 'text-[#777]'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé fixo na parte inferior */}
        <div className="modal-footer p-3.5 sm:p-4 border-t border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d] gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn text-xs text-[#888] hover:text-white"
          >
            {t('resetDefault')}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsVisibilityModalOpen(false)}
              className="btn text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary btn-action-blue text-xs"
            >
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
