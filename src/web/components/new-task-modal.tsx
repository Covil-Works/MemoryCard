'use client';

import React, { useState } from 'react';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(defaultStatus || (columns[0]?.id ?? 'todo'));
  const [modelName, setModelName] = useState(defaultModel || 'default');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="bg-[#111] border border-[#333] max-w-lg w-full p-6 flex flex-col gap-4 text-sm">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <h2 className="text-sm font-bold font-mono text-white">Criar Nova Task</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white font-mono text-xs">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">Status Inicial:</label>
              <select
                className="select text-xs font-mono"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.id})
                  </option>
                ))}
              </select>
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
          </div>

          <div>
            <label className="text-xs text-[#888] font-mono block mb-1">Descrição (Opcional):</label>
            <textarea
              className="textarea font-mono text-xs h-28"
              placeholder="Detalhes ou critérios de aceitação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-[#222]">
            <button type="button" onClick={onClose} className="btn text-xs">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary text-xs">
              {isSubmitting ? 'Criando...' : 'Criar Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
