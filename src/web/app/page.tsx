'use client';

import React, { useState, useEffect } from 'react';
import { useSSE } from '../hooks/use-sse';

interface ProjectEntry {
  project_id: string;
  path: string;
  available: boolean;
  name: string;
  slug: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de modais
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [relinkingProject, setRelinkingProject] = useState<ProjectEntry | null>(null);
  const [relinkPath, setRelinkPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Falha ao carregar lista de projetos');
      const data = await res.json();
      setProjects(data.projects || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // SSE atualiza lista se houver mudança de disponibilidade ou novo projeto
  useSSE((event) => {
    if (event.type === 'project-availability-changed' || event.type === 'config-updated') {
      fetchProjects();
    }
  });

  const handlePickDirectoryForNew = async () => {
    try {
      const res = await fetch('/api/system/select-directory');
      const data = await res.json();
      if (data.path) {
        setNewProjectPath(data.path);
        setIsNewProjectModalOpen(true);
      } else {
        // Se cancelado ou nativo não respondeu, abre modal para entrada manual
        setIsNewProjectModalOpen(true);
      }
    } catch {
      setIsNewProjectModalOpen(true);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectPath.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newProjectPath.trim(),
          name: newProjectName.trim() || undefined
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao inicializar projeto');
      }
      setIsNewProjectModalOpen(false);
      setNewProjectPath('');
      setNewProjectName('');
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relinkingProject || !relinkPath.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/relink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: relinkingProject.project_id,
          path: relinkPath.trim()
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao relincar projeto');
      }
      setRelinkingProject(null);
      setRelinkPath('');
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnregisterProject = async (projectId: string, name: string) => {
    if (!window.confirm(`Deseja remover "${name}" da lista de projetos registrados? Os arquivos locais não serão apagados.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao remover projeto');
      }
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-5xl w-full mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-[#222] pb-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight">Projetos Registrados</h1>
          <p className="text-xs text-[#777] mt-1">
            Projetos MemoryCard gerenciados localmente no sistema.
          </p>
        </div>
        <button
          onClick={handlePickDirectoryForNew}
          className="btn btn-primary"
        >
          + Novo Projeto
        </button>
      </div>

      {error && (
        <div className="p-3 bg-[#200] border border-[#f44] text-[#f88] text-xs font-mono">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#666] font-mono text-sm">Carregando projetos...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border border-[#222] bg-[#0c0c0c]">
          <p className="text-sm text-[#888]">Nenhum projeto registrado no MemoryCard.</p>
          <p className="text-xs text-[#555] mt-1">
            Clique em "+ Novo Projeto" ou execute <code className="text-white">memorycard init</code> no terminal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {projects.map((p) => (
            <div
              key={p.project_id}
              className="border border-[#222] bg-[#0d0d0d] hover:border-[#444] p-4 flex items-center justify-between transition-colors"
            >
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-white truncate">{p.name}</span>
                  {p.available ? (
                    <span className="px-2 py-0.5 text-[10px] font-mono border border-[#444] text-gray-300">
                      DISPONÍVEL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-mono border border-[#f44] text-[#f66]">
                      INDISPONÍVEL
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#666] font-mono truncate">{p.path}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {p.available ? (
                  <>
                    <a href={`/${p.slug}`} className="btn btn-primary">
                      Abrir Board →
                    </a>
                    <button
                      onClick={() => handleUnregisterProject(p.project_id, p.name)}
                      className="btn text-xs text-[#888] hover:text-[#f66]"
                      title="Remover projeto da lista do MemoryCard"
                    >
                      Remover
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setRelinkingProject(p);
                        setRelinkPath('');
                      }}
                      className="btn"
                    >
                      Relincar Pasta
                    </button>
                    <button
                      onClick={() => handleUnregisterProject(p.project_id, p.name)}
                      className="btn btn-danger text-xs"
                      title="Remover projeto indisponível da lista"
                    >
                      Remover da Lista
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Projeto */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-[#333] max-w-md w-full p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-mono text-white">Inicializar Novo Projeto</h2>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#888] font-mono block mb-1">Caminho do Diretório:</label>
                <input
                  type="text"
                  className="input font-mono text-xs"
                  placeholder="/caminho/para/o/projeto"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-[#888] font-mono block mb-1">Nome do Projeto (Opcional):</label>
                <input
                  type="text"
                  className="input text-xs"
                  placeholder="Nome do projeto"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="btn"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Inicializando...' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Relink Projeto */}
      {relinkingProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-[#333] max-w-md w-full p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-mono text-white">Relincar Projeto</h2>
            <p className="text-xs text-[#888]">
              O diretório original não foi encontrado. Selecione o novo caminho onde os arquivos deste projeto residem:
            </p>
            <form onSubmit={handleRelink} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#888] font-mono block mb-1">Novo Caminho:</label>
                <input
                  type="text"
                  className="input font-mono text-xs"
                  placeholder="/novo/caminho/do/projeto"
                  value={relinkPath}
                  onChange={(e) => setRelinkPath(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setRelinkingProject(null)}
                  className="btn"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Relincando...' : 'Confirmar Relink'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
