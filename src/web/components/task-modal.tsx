'use client';

import React, { useState, useEffect } from 'react';

export interface TaskModalProps {
  slug: string;
  taskId: number;
  onClose: () => void;
  onTaskUpdated: () => void;
  externalConflictDetected?: boolean;
}

export function TaskModal({
  slug,
  taskId,
  onClose,
  onTaskUpdated,
  externalConflictDetected = false
}: TaskModalProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(externalConflictDetected);

  // Campos de edição
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [newTodoText, setNewTodoText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadTask = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${slug}/tasks/${taskId}`);
      if (!res.ok) throw new Error('Não foi possível carregar a task');
      const data = await res.json();
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setStatus(data.status);
      setIsDirty(false);
      setConflictWarning(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [slug, taskId]);

  useEffect(() => {
    if (externalConflictDetected && isDirty) {
      setConflictWarning(true);
    }
  }, [externalConflictDetected, isDirty]);

  // Salvar alterações principais (Título, Descrição, Status)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${slug}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': task.hash || ''
        },
        body: JSON.stringify({
          title,
          description,
          status,
          hash: task.hash
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 409) {
          setConflictWarning(true);
          throw new Error('Conflito de concorrência: a task foi alterada externamente no disco. Recarregue a versão mais recente.');
        }
        throw new Error(errData.error || 'Erro ao salvar alterações');
      }

      const updated = await res.json();
      setTask(updated);
      setIsDirty(false);
      setConflictWarning(false);
      onTaskUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Todo checkbox imediatamente (§23)
  const handleToggleTodo = async (index: number, completed: boolean) => {
    try {
      const res = await fetch(`/api/projects/${slug}/tasks/${taskId}/todos/${index + 1}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': task.hash || ''
        },
        body: JSON.stringify({ completed: !completed })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar todo');
      }
      const updated = await res.json();
      setTask(updated);
      onTaskUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Adicionar Todo
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    try {
      const res = await fetch(`/api/projects/${slug}/tasks/${taskId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTodoText.trim() })
      });
      if (!res.ok) throw new Error('Falha ao adicionar todo');
      const updated = await res.json();
      setTask(updated);
      setNewTodoText('');
      onTaskUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Remover Todo
  const handleRemoveTodo = async (index: number) => {
    try {
      const res = await fetch(`/api/projects/${slug}/tasks/${taskId}/todos/${index + 1}`, {
        method: 'DELETE',
        headers: { 'If-Match': task.hash || '' }
      });
      if (!res.ok) throw new Error('Falha ao remover todo');
      const updated = await res.json();
      setTask(updated);
      onTaskUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Adicionar Comentário
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const res = await fetch(`/api/projects/${slug}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newCommentText.trim() })
      });
      if (!res.ok) throw new Error('Falha ao adicionar comentário');
      const updated = await res.json();
      setTask(updated);
      setNewCommentText('');
      onTaskUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Excluir Task
  const handleDeleteTask = async () => {
    try {
      const res = await fetch(`/api/projects/${slug}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Falha ao excluir task');
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div className="bg-[#111] border border-[#333] p-8 text-xs font-mono text-[#888]">
          Carregando task #{taskId}...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-[#111] border border-[#333] max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl">
        {/* Cabeçalho fixo */}
        <div className="p-3.5 sm:p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-mono font-bold text-xs bg-[#222] px-2 py-0.5 text-white">
              #{task.id}
            </span>
            <span className="text-[11px] sm:text-xs text-[#888] font-mono">
              Atualizada: {task.updated_at.split('T')[0]} {task.updated_at.split('T')[1]?.slice(0, 5)}
            </span>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white font-mono text-sm px-2">
            ✕
          </button>
        </div>

        {/* Corpo com scroll interno */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 sm:gap-6">

        {/* Banner de Conflito de Concorrência Otimista (OCC) */}
        {conflictWarning && (
          <div className="p-3 bg-[#2b2200] border border-[#ffcc00] text-[#fff3a8] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>⚠️ Arquivo alterado externamente no disco. Salvar irá falhar devido a conflito de versão.</span>
            <button
              onClick={loadTask}
              className="btn text-xs bg-white text-black border-white hover:bg-gray-200 self-start sm:self-auto shrink-0"
            >
              Recarregar Disco
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono">
            {error}
          </div>
        )}

        {/* Formulário Principal de Edição */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#888] font-mono block mb-1">Título:</label>
            <input
              type="text"
              className="input font-medium text-sm"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              required
            />
          </div>

          <div>
            <label className="text-xs text-[#888] font-mono block mb-1">Status:</label>
            <input
              type="text"
              className="input font-mono text-xs"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setIsDirty(true);
              }}
              required
            />
          </div>

          <div>
            <label className="text-xs text-[#888] font-mono block mb-1">Descrição (Markdown):</label>
            <textarea
              className="textarea font-mono text-xs h-32"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Descreva os detalhes da tarefa..."
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#222]">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-danger text-xs"
            >
              Excluir Task
            </button>
            <button
              type="submit"
              disabled={isSaving || !isDirty}
              className={`btn ${isDirty ? 'btn-primary' : 'opacity-40 cursor-not-allowed'}`}
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        {/* Seção Checklist (Todo) */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#222]">
          <h3 className="text-xs font-mono font-bold text-white tracking-wider">CHECKLIST (TODO)</h3>
          
          <div className="flex flex-col gap-1.5">
            {task.todos.map((todo: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-[#0c0c0c] border border-[#1e1e1e] hover:border-[#333] transition-colors"
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(idx, todo.completed)}
                    className="cursor-pointer accent-white"
                  />
                  <span className={`text-xs ${todo.completed ? 'line-through text-[#666]' : 'text-gray-200'}`}>
                    {todo.text}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveTodo(idx)}
                  className="text-[10px] text-[#666] hover:text-[#f66] px-1 font-mono"
                >
                  remover
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTodo} className="flex gap-2 mt-1">
            <input
              type="text"
              className="input text-xs flex-1"
              placeholder="Novo item de checklist..."
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
            />
            <button type="submit" className="btn text-xs">
              + Adicionar
            </button>
          </form>
        </div>

        {/* Seção Comentários */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#222]">
          <h3 className="text-xs font-mono font-bold text-white tracking-wider">COMENTÁRIOS</h3>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {task.comments.length === 0 ? (
              <p className="text-xs text-[#555] italic">Nenhum comentário registrado.</p>
            ) : (
              task.comments.map((comment: any, idx: number) => (
                <div key={idx} className="p-3 bg-[#0a0a0a] border border-[#222]">
                  <div className="text-[10px] font-mono text-[#777] mb-1">{comment.timestamp}</div>
                  <div className="text-xs text-gray-300 whitespace-pre-wrap">{comment.text}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex flex-col gap-2 mt-1">
            <textarea
              className="textarea text-xs h-20"
              placeholder="Adicionar nota ou comentário..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
            />
            <div className="flex justify-end">
              <button type="submit" className="btn text-xs">
                Enviar Comentário
              </button>
            </div>
          </form>
        </div>

        {/* Confirmação de Exclusão */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-3 sm:p-4 z-60">
            <div className="bg-[#151515] border border-[#f44] p-4 sm:p-6 max-w-sm w-full mx-3 flex flex-col gap-4 text-center">
              <h4 className="text-sm font-bold text-white font-mono">Confirmar Exclusão</h4>
              <p className="text-xs text-[#aaa]">
                Tem certeza que deseja apagar a task #{taskId}? O arquivo Markdown será removido fisicamente e o ID não será reaproveitado.
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  className="btn btn-danger text-xs font-bold"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
