'use client';

import React, { useState, useEffect } from 'react';

export interface ModelsModalProps {
  slug: string;
  currentTaskModel: string;
  onClose: () => void;
  onModelChanged: () => void;
}

export function ModelsModal({
  slug,
  currentTaskModel,
  onClose,
  onModelChanged
}: ModelsModalProps) {
  const [models, setModels] = useState<any[]>([]);
  const [selectedTaskModel, setSelectedTaskModel] = useState(currentTaskModel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modo de criação de novo modelo
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelScope, setNewModelScope] = useState<'global' | 'project'>('project');
  const [newModelContent, setNewModelContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${slug}/models`);
      if (!res.ok) throw new Error('Falha ao listar modelos');
      const data = await res.json();
      setModels(data.models || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [slug]);

  // Ao clicar em "+ Novo Modelo", carrega o default.md como base (§29.4)
  const handleStartCreateNew = () => {
    const defaultModel = models.find(m => m.name === 'default');
    setNewModelContent(defaultModel?.content || '');
    setNewModelName('');
    setNewModelScope('project');
    setValidationErrors([]);
    setIsCreatingNew(true);
  };

  // Salvar novo modelo
  const handleSaveNewModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) return;

    if (newModelName.trim().toLowerCase() === 'default') {
      setError('O nome "default" é reservado para o modelo padrão global.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setValidationErrors([]);

    try {
      const res = await fetch(`/api/projects/${slug}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newModelName.trim(),
          scope: newModelScope,
          content: newModelContent
        })
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.name === 'InvalidModelTemplateError' || Array.isArray(data.validationErrors)) {
          setValidationErrors(data.validationErrors || [data.error]);
          throw new Error('O modelo não possui todas as seções ou placeholders obrigatórios');
        }
        throw new Error(data.error || 'Erro ao criar modelo');
      }

      setIsCreatingNew(false);
      await fetchModels();
      onModelChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salvar seleção de modelo padrão do projeto (§29.7)
  const handleSelectDefaultModel = async (modelName: string) => {
    try {
      const res = await fetch(`/api/projects/${slug}/task-model`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName })
      });
      if (!res.ok) throw new Error('Falha ao definir modelo padrão');
      setSelectedTaskModel(modelName);
      onModelChanged();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="modal-surface bg-[#111] border border-[#333] max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl">
        <div className="modal-header p-3.5 sm:p-5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
          <h2 className="text-sm font-bold font-mono text-white">Modelos de Task</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white font-mono text-sm px-2">
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono">
              {error}
            </div>
          )}

        {isCreatingNew ? (
          /* Formulário de criação de modelo */
          <form onSubmit={handleSaveNewModel} className="flex flex-col gap-4">
            <div className="p-3 bg-[#161616] border border-[#2b2b2b] text-xs text-[#aaa]">
              O novo modelo foi clonado a partir de <code className="text-white">default.md</code>.
              Você pode adicionar seções livres, mas é obrigatório manter os placeholders (ex: <code className="text-white">{'{{id}}'}</code>, <code className="text-white">{'{{title}}'}</code>) e as seções <code className="text-white">Description</code>, <code className="text-white">Todo</code> e <code className="text-white">Comments</code>.
            </div>

            {validationErrors.length > 0 && (
              <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono flex flex-col gap-1">
                <span className="font-bold">Erros de validação estrutural:</span>
                <ul className="list-disc pl-4">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#888] font-mono block mb-1">Nome do Modelo:</label>
                <input
                  type="text"
                  className="input text-xs font-mono"
                  placeholder="ex: bugfix, feature, sdd"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-[#888] font-mono block mb-1">Escopo de Armazenamento:</label>
                <select
                  className="select text-xs font-mono"
                  value={newModelScope}
                  onChange={(e) => setNewModelScope(e.target.value as any)}
                >
                  <option value="project">Específico do Projeto (.memorycard/models/)</option>
                  <option value="global">Global (~/.memorycard/models/)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#888] font-mono block mb-1">Conteúdo do Modelo Markdown:</label>
              <textarea
                className="textarea font-mono text-xs h-48 sm:h-64"
                value={newModelContent}
                onChange={(e) => setNewModelContent(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222]">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="btn text-xs"
              >
                Voltar
              </button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-action-green text-xs">
                {isSubmitting ? 'Validando e Salvando...' : 'Salvar Modelo'}
              </button>
            </div>
          </form>
        ) : (
          /* Listagem de modelos */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-[#888]">
                Selecione o modelo padrão usado para novas tasks deste projeto:
              </p>
              <button
                onClick={handleStartCreateNew}
                className="btn btn-primary btn-action-green text-xs self-start sm:self-auto shrink-0"
              >
                + Novo Modelo
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {models.map((model) => {
                const isSelected = model.name === selectedTaskModel;
                return (
                  <div
                    key={`${model.scope}-${model.name}`}
                    className={`p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'border-white bg-[#1a1a1a]' : 'border-[#222] bg-[#0c0c0c] hover:border-[#333]'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-white">{model.name}.md</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#222] text-[#888]">
                          {model.scope === 'global' ? 'GLOBAL' : 'PROJETO'}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white text-black font-bold model-badge-default">
                            PADRÃO
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#666] font-mono truncate max-w-full sm:max-w-md">
                        {model.path}
                      </span>
                    </div>

                    {!isSelected && (
                      <button
                        onClick={() => handleSelectDefaultModel(model.name)}
                        className="btn text-xs self-end sm:self-auto shrink-0 btn-action-blue"
                      >
                        Definir como Padrão
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
