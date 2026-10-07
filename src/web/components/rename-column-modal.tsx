'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from './settings-context';

export interface RenameColumnModalProps {
  slug: string;
  column: { id: string; name: string };
  onClose: () => void;
  onColumnRenamed: () => void;
}

export function RenameColumnModal({
  slug,
  column,
  onClose,
  onColumnRenamed,
}: RenameColumnModalProps) {
  const { t } = useSettings();
  const [name, setName] = useState(column.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('O nome da coluna não pode ficar em branco.');
      return;
    }

    if (trimmed === column.name) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${slug}/statuses/${encodeURIComponent(column.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao renomear coluna');
      }

      onColumnRenamed();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="modal-surface bg-[#111] border border-[#333] max-w-md w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl">
        <div className="modal-header p-3.5 sm:p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <h2 className="text-sm font-bold font-mono text-white">{t('renameColumnTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888] hover:text-white font-mono text-sm px-2"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono mb-4">
              {error}
            </div>
          )}

          <form id="rename-column-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">
                {t('columnName')}
              </label>
              <input
                ref={inputRef}
                type="text"
                className="input text-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
              />
            </div>
          </form>
        </div>

        <div className="modal-footer p-3.5 sm:p-4 border-t border-[#222] flex items-center justify-end gap-2 shrink-0 bg-[#0d0d0d]">
          <button type="button" onClick={onClose} className="btn text-xs">
            {t('cancel')}
          </button>
          <button
            type="submit"
            form="rename-column-form"
            disabled={isSubmitting || !name.trim()}
            className="btn btn-primary btn-action-blue text-xs"
          >
            {isSubmitting ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
