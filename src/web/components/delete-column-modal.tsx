'use client';

import React, { useState } from 'react';
import { useSettings } from './settings-context';

export interface DeleteColumnModalProps {
  slug: string;
  column: { id: string; name: string };
  taskCount: number;
  onClose: () => void;
  onColumnDeleted: () => void;
}

export function DeleteColumnModal({
  slug,
  column,
  taskCount,
  onClose,
  onColumnDeleted,
}: DeleteColumnModalProps) {
  const { t } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTasks = taskCount > 0;

  const handleDelete = async () => {
    if (hasTasks) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${slug}/statuses/${encodeURIComponent(column.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir coluna');
      }

      onColumnDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-3 sm:p-4 z-50">
      <div
        className={`bg-[#111] border ${
          hasTasks ? 'border-[#333]' : 'border-[#f44]'
        } max-w-md w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl`}
      >
        <div className="p-3.5 sm:p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <h2 className="text-sm font-bold font-mono text-white">
            {hasTasks ? t('cannotDeleteColumnTitle') : t('deleteColumnTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888] hover:text-white font-mono text-sm px-2"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono">
              {error}
            </div>
          )}

          {hasTasks ? (
            <div className="flex flex-col gap-3 font-mono text-xs">
              <p className="text-gray-300">
                {t('deleteColumnHasTasks')
                  .replace('{name}', column.name)
                  .replace('{count}', String(taskCount))}
              </p>
              <div className="p-3 bg-[#181818] border border-[#333] text-[#aaa] text-[11px] leading-relaxed">
                {t('deleteColumnHasTasksTip')}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 font-mono text-xs">
              <p className="text-gray-200">
                {t('deleteColumnConfirm').replace('{name}', column.name)}
              </p>
              <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-[11px] leading-relaxed">
                {t('deleteColumnIrreversible')}
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 sm:p-4 border-t border-[#222] flex items-center justify-end gap-2 shrink-0 bg-[#0d0d0d]">
          {hasTasks ? (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary text-xs"
            >
              {t('understandClose')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="btn btn-danger text-xs font-bold"
              >
                {isSubmitting ? t('deleting') : t('confirmDelete')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
