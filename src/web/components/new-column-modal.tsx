'use client';

import React, { useState } from 'react';
import { useSettings } from './settings-context';

export interface NewColumnModalProps {
  slug: string;
  onClose: () => void;
  onColumnCreated: () => void;
}

export function NewColumnModal({ slug, onClose, onColumnCreated }: NewColumnModalProps) {
  const { t } = useSettings();
  const [name, setName] = useState('');
  const [customId, setCustomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-preenche ID sugerido se o usuário não alterou manualmente
    const autoId = val
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setCustomId(autoId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${slug}/statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          id: customId.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar nova coluna');
      }

      onColumnCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#111] border border-[#333] max-w-md w-full max-h-[80vh] my-[10vh] flex flex-col text-sm overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <h2 className="text-sm font-bold font-mono text-white">{t('newColumn')}</h2>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white font-mono text-sm px-2"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono mb-4">
              {error}
            </div>
          )}

          <form id="new-column-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">
                {t('columnName')}
              </label>
              <input
                type="text"
                className="input text-xs"
                placeholder="Ex: Code Review, Testing, Bloqueado"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">
                {t('columnId')}
              </label>
              <input
                type="text"
                className="input text-xs font-mono"
                placeholder="ex: code-review"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
              />
              <p className="text-[10px] text-[#666] font-mono mt-1">
                Identificador único interno usado para salvar as tarefas no status correspondente.
              </p>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-[#222] flex items-center justify-end gap-2 shrink-0 bg-[#0d0d0d]">
          <button type="button" onClick={onClose} className="btn text-xs">
            {t('cancel')}
          </button>
          <button
            type="submit"
            form="new-column-form"
            disabled={isSubmitting || !name.trim()}
            className="btn btn-primary text-xs"
          >
            {isSubmitting ? t('saving') : t('createColumn')}
          </button>
        </div>
      </div>
    </div>
  );
}
