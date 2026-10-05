'use client';

import React, { useState } from 'react';
import { useSettings } from './settings-context';

export interface NewTaskModalProps {
  slug: string;
  columns: Array<{ id: string; name: string }>;
  models: Array<{ name: string; scope: string }>;
  defaultStatus?: string;
  defaultModel?: string;
  onClose: () => void;
  onTaskCreated: () => void;
}

export function NewTaskModal({
  slug,
  columns,
  models,
  defaultStatus,
  defaultModel,
  onClose,
  onTaskCreated
}: NewTaskModalProps) {
  const { t } = useSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const status = defaultStatus || (columns[0]?.id ?? 'todo');
  const [modelName, setModelName] = useState(defaultModel || 'default');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetColumn = columns.find((c) => c.id === status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${slug}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          modelName
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar task');
      }

      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#111] border border-[#333] max-w-lg w-full max-h-[80vh] my-[10vh] flex flex-col text-sm overflow-hidden shadow-2xl">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold font-mono text-white">Criar Nova Task</h2>
            {targetColumn && (
              <span className="text-[10px] font-mono px-2 py-0.5 border border-[#333] bg-[#1a1a1a] text-[#aaa]">
                Coluna: <strong className="text-white">{targetColumn.name}</strong>
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white font-mono text-sm px-2">
            ✕
          </button>
        </div>

        {/* Corpo com scroll interno */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono mb-4">
              {error}
            </div>
          )}

          <form id="new-task-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">Título:</label>
              <input
                type="text"
                className="input text-sm"
                placeholder="Ex: Implementar autenticação"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">Modelo de Task:</label>
              <select
                className="select text-xs font-mono"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.scope})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">Descrição (Opcional):</label>
              <textarea
                className="textarea font-mono text-xs h-32"
                placeholder="Detalhes ou critérios de aceitação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Rodapé fixo */}
        <div className="p-4 border-t border-[#222] flex items-center justify-end gap-2 shrink-0 bg-[#0d0d0d]">
          <button type="button" onClick={onClose} className="btn text-xs">
            {t('cancel')}
          </button>
          <button
            type="submit"
            form="new-task-form"
            disabled={isSubmitting || !title.trim()}
            className="btn btn-primary text-xs"
          >
            {isSubmitting ? 'Criando...' : 'Criar Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
