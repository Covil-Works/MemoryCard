'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSSE } from '../hooks/use-sse';
import { useSettings } from '../components/settings-context';
import { FolderBrowser } from '../components/folder-browser';

import dynamic from 'next/dynamic';

const MemoryCard3D = dynamic(() => import('../components/memory-card-3d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[340px] flex items-center justify-center text-[#555] font-mono text-xs">
      Carregando 3D...
    </div>
  ),
});

import pkg from '../../../package.json';

const APP_VERSION = `v${pkg.version}`;

interface ProjectEntry {
  project_id: string;
  path: string;
  available: boolean;
  name: string;
  slug: string;
}

export default function DashboardPage() {
  const { t, setProjectActions } = useSettings();
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
    // Na home, reseta ações de projeto específicas do menu dos 3 tracinhos
    setProjectActions(null);
    fetchProjects();
  }, []);

  // SSE atualiza lista se houver mudança de disponibilidade ou novo projeto
  useSSE((event) => {
    if (event.type === 'project-availability-changed' || event.type === 'config-updated') {
      fetchProjects();
    }
  });

  const handleOpenNewProjectModal = () => {
    setError(null);
    setNewProjectPath('');
    setNewProjectName('');
    setIsNewProjectModalOpen(true);
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
    <div className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto py-2 sm:py-6 min-h-[calc(100vh-140px)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center w-full">
        {/* Lado Esquerdo: Objeto 3D alinhado ao centro com textos embaixo */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center w-full lg:-translate-y-4">
          <div className="w-[300px] sm:w-[350px] h-[290px] sm:h-[340px] flex items-center justify-center">
            <MemoryCard3D />
          </div>
          <div className="flex flex-col items-center justify-center text-center -mt-1 sm:-mt-2 select-none">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans leading-tight">
              MemoryCard
            </span>
            <span className="text-xs text-[#777] font-mono mt-0.5">
              {APP_VERSION}
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-wider text-[#aaa] mt-0.5 font-sans">
              CovilDev
            </span>
          </div>
        </div>

        {/* Lado Direito: Lista de Projetos alinhada ao meio e rolável */}
        <div className="lg:col-span-6 flex items-center justify-center w-full">
          <div className="w-full max-w-xl flex flex-col border border-[#222] bg-[#0c0c0c] max-h-[72vh] shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between gap-3 shrink-0 bg-[#0d0d0d]">
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">{t('registeredProjects')}</h1>
                <p className="text-xs text-[#777] mt-0.5">
                  {t('registeredProjectsDesc')}
                </p>
              </div>
              <button
                onClick={handleOpenNewProjectModal}
                className="btn btn-primary text-xs shrink-0"
              >
                {t('newProject')}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-[#200] border-b border-[#f44] text-[#f88] text-xs font-mono shrink-0">
                {error}
              </div>
            )}

            <div className="overflow-y-auto custom-scrollbar p-3 sm:p-4 flex flex-col gap-3 flex-1 min-h-[140px]">
              {loading ? (
                <div className="text-center py-12 text-[#666] font-mono text-xs">{t('loading')}</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 border border-[#1a1a1a] bg-[#080808]">
                  <p className="text-sm text-[#888]">{t('noProjects')}</p>
                  <p className="text-xs text-[#555] mt-1">
                    {t('noProjectsHint')}
                  </p>
                </div>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.project_id}
                    className="border border-[#222] bg-[#111] hover:border-[#444] p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shrink-0"
                  >
                    <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-white truncate max-w-full">{p.name}</span>
                        {p.available ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono border border-[#444] text-gray-300">
                            {t('available')}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono border border-[#f44] text-[#f66]">
                            {t('unavailable')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#666] font-mono truncate max-w-full">{p.path}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t border-[#1a1a1a] sm:border-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                      {p.available ? (
                        <>
                          <Link href={`/${p.slug}`} className="btn btn-primary text-xs">
                            {t('openBoard')}
                          </Link>
                          <button
                            onClick={() => handleUnregisterProject(p.project_id, p.name)}
                            className="btn text-xs text-[#888] hover:text-[#f66] hover:border-[#f66]"
                            title="Remover projeto da lista do MemoryCard"
                          >
                            {t('remove')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setRelinkingProject(p);
                              setRelinkPath('');
                            }}
                            className="btn text-xs"
                          >
                            {t('relink')}
                          </button>
                          <button
                            onClick={() => handleUnregisterProject(p.project_id, p.name)}
                            className="btn btn-danger text-xs"
                            title="Remover projeto indisponível da lista"
                          >
                            {t('remove')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Novo Projeto */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-[#111] border border-[#333] max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl">
            <div className="p-3.5 sm:p-4 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
              <h2 className="text-sm font-bold font-mono text-white">{t('createNewProject')}</h2>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-[#888] hover:text-white font-mono text-sm px-2"
              >
                ✕
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
              <form id="new-project-form" onSubmit={handleCreateProject} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-[#888] font-mono block mb-1">{t('projectNameLabel')}</label>
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder="Nome do projeto (opcional)"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888] font-mono block mb-1">{t('directoryPath')}</label>
                  <input
                    type="text"
                    className="input font-mono text-xs"
                    placeholder="/caminho/para/o/projeto"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    required
                  />
                </div>
              </form>

              <div>
                <label className="text-xs text-[#888] font-mono block mb-1.5">{t('browseFolders')}</label>
                <FolderBrowser
                  selectedPath={newProjectPath}
                  onSelectPath={(selected) => setNewProjectPath(selected)}
                />
              </div>
            </div>
            <div className="p-3.5 sm:p-4 border-t border-[#222] flex items-center justify-end gap-2 shrink-0 bg-[#0d0d0d]">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="btn text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="new-project-form"
                disabled={isSubmitting || !newProjectPath.trim()}
                className="btn btn-primary text-xs"
              >
                {isSubmitting ? t('initializingProject') : t('initProjectBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Relink Projeto */}
      {relinkingProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-[#111] border border-[#333] max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] my-auto flex flex-col text-sm overflow-hidden shadow-2xl">
            <div className="p-3.5 sm:p-4 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
              <h2 className="text-sm font-bold font-mono text-white">{t('relink')}</h2>
              <button
                onClick={() => setRelinkingProject(null)}
                className="text-[#888] hover:text-white font-mono text-sm px-2"
              >
                ✕
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
              <p className="text-xs text-[#888]">
                O diretório original não foi encontrado. Selecione o novo caminho onde os arquivos deste projeto residem:
              </p>
              <form id="relink-form" onSubmit={handleRelink} className="flex flex-col gap-3">
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
              </form>

              <div>
                <label className="text-xs text-[#888] font-mono block mb-1.5">{t('browseFolders')}</label>
                <FolderBrowser
                  selectedPath={relinkPath}
                  onSelectPath={(selected) => setRelinkPath(selected)}
                />
              </div>
            </div>
            <div className="p-3.5 sm:p-4 border-t border-[#222] flex items-center justify-end gap-2 shrink-0 bg-[#0d0d0d]">
              <button
                type="button"
                onClick={() => setRelinkingProject(null)}
                className="btn text-xs"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                form="relink-form"
                disabled={isSubmitting || !relinkPath.trim()}
                className="btn btn-primary text-xs"
              >
                {isSubmitting ? 'Relincando...' : t('relinkConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
