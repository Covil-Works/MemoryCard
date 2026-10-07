'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from './settings-context';

export interface DirectoryEntry {
  name: string;
  path: string;
  isMemoryCard: boolean;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface SystemShortcut {
  name: string;
  path: string;
  type: 'cwd' | 'home' | 'drive' | 'root';
}

export interface DirectoryBrowseResult {
  currentPath: string;
  parentPath: string | null;
  breadcrumbs: BreadcrumbItem[];
  directories: DirectoryEntry[];
  shortcuts: SystemShortcut[];
  sep: string;
  isMemoryCard: boolean;
  error?: string;
}

export interface FolderBrowserExistingProject {
  path: string;
  name?: string;
}

export interface FolderBrowserExistingNotice {
  path: string;
  isAlreadyInList: boolean;
  name?: string;
}

interface FolderBrowserProps {
  initialPath?: string;
  selectedPath: string;
  onSelectPath: (path: string) => void;
  existingProjects?: FolderBrowserExistingProject[];
  onSelectExistingProject?: (info: FolderBrowserExistingNotice | null) => void;
}

function isSamePath(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const n1 = p1.trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const n2 = p2.trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  return n1 === n2;
}

export function FolderBrowser({
  initialPath,
  selectedPath,
  onSelectPath,
  existingProjects,
  onSelectExistingProject
}: FolderBrowserProps) {
  const { t } = useSettings();

  const [currentPath, setCurrentPath] = useState<string>(initialPath || selectedPath || '');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [shortcuts, setShortcuts] = useState<SystemShortcut[]>([]);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para criação de nova pasta
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchDirectory = useCallback(async (pathQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = pathQuery
        ? `/api/system/fs-browse?path=${encodeURIComponent(pathQuery)}`
        : '/api/system/fs-browse';

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: DirectoryBrowseResult = await res.json();
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setBreadcrumbs(data.breadcrumbs || []);
      setDirectories(data.directories || []);
      setShortcuts(data.shortcuts || []);

      if (data.error) {
        setError(data.error);
      } else {
        setError(null);
      }

      // Notifica o pai sobre a pasta atualmente navegada se não houver seleção prévia
      if (!selectedPath || selectedPath !== data.currentPath) {
        onSelectPath(data.currentPath);
      }
    } catch (err: any) {
      setError(err.message || t('cannotReadDirectory'));
    } finally {
      setLoading(false);
    }
  }, [onSelectPath, selectedPath, t]);

  useEffect(() => {
    fetchDirectory(initialPath || selectedPath || undefined);
  }, []);

  const handleNavigate = (targetPath: string) => {
    setIsCreatingFolder(false);
    setNewFolderName('');
    setCreateError(null);
    setFilterQuery('');
    onSelectPath(targetPath);
    fetchDirectory(targetPath);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentPath) return;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const separator = currentPath.includes('\\') ? '\\' : '/';
      const cleanPath = currentPath.endsWith(separator)
        ? `${currentPath}${newFolderName.trim()}`
        : `${currentPath}${separator}${newFolderName.trim()}`;

      const res = await fetch('/api/system/create-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: cleanPath })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar diretório');
      }

      setIsCreatingFolder(false);
      setNewFolderName('');
      handleNavigate(cleanPath);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredDirectories = directories.filter((dir) =>
    dir.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2 border border-[#262626] bg-[#0c0c0c] p-2.5 sm:p-3 text-xs font-mono">
      {/* Barra de Atalhos Rápidos */}
      {shortcuts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-[#1f1f1f]">
          <span className="text-[11px] text-[#777] uppercase tracking-wider shrink-0 mr-1">
            {t('quickShortcuts')}
          </span>
          {shortcuts.map((sc) => {
            const isCurrent = currentPath === sc.path;
            return (
              <button
                key={sc.path}
                type="button"
                onClick={() => handleNavigate(sc.path)}
                className={`px-2 py-0.5 text-[11px] border transition-colors rounded-none ${
                  isCurrent
                    ? 'border-[#555] bg-[#222] text-white font-bold'
                    : 'border-[#2a2a2a] bg-[#121212] text-[#aaa] hover:text-white hover:border-[#444]'
                }`}
                title={sc.path}
              >
                {sc.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Breadcrumbs de Navegação */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-1 text-[11px] text-[#888] bg-[#080808] px-2 border border-[#1c1c1c]">
        {breadcrumbs.map((bc, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={bc.path}>
              <button
                type="button"
                onClick={() => handleNavigate(bc.path)}
                className={`hover:underline truncate max-w-[150px] sm:max-w-[200px] transition-colors ${
                  isLast ? 'text-white font-bold' : 'text-[#888] hover:text-gray-300'
                }`}
                title={bc.path}
              >
                {bc.name}
              </button>
              {!isLast && <span className="text-[#444] select-none">/</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Barra de Ações: Subir Nível, Filtrar, Nova Pasta, Atualizar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => parentPath && handleNavigate(parentPath)}
            disabled={!parentPath || loading}
            className="flex items-center gap-1 px-2 py-1 border border-[#333] bg-[#141414] text-gray-300 hover:text-white hover:border-[#555] disabled:opacity-30 disabled:pointer-events-none transition-colors text-[11px]"
            title={t('parentDirectory')}
          >
            <svg
              className="w-3.5 h-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{t('parentDirectory')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreatingFolder((prev) => !prev)}
            className="px-2 py-1 border border-[#333] bg-[#141414] text-gray-300 hover:text-white hover:border-[#555] transition-colors text-[11px]"
          >
            {t('newFolder')}
          </button>

          <button
            type="button"
            onClick={() => fetchDirectory(currentPath)}
            disabled={loading}
            className="p-1 border border-[#333] bg-[#141414] text-gray-300 hover:text-white hover:border-[#555] disabled:opacity-30 transition-colors"
            title={t('refresh')}
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Campo de filtro rápido */}
        <div className="relative min-w-[130px] flex-1 sm:flex-initial">
          <input
            type="text"
            placeholder={t('filterFoldersPlaceholder')}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-[#111] border border-[#2e2e2e] px-2 py-0.5 text-[11px] text-gray-200 placeholder-[#555] focus:outline-none focus:border-[#666]"
          />
        </div>
      </div>

      {/* Formulário inline para criação de nova pasta */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolder} className="p-2 border border-[#333] bg-[#141414] flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              placeholder={t('folderNamePlaceholder')}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-[#444] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#888]"
            />
            <button
              type="submit"
              disabled={createLoading || !newFolderName.trim()}
              className="btn btn-primary btn-action-green text-xs py-1 px-3"
            >
              {createLoading ? '...' : t('create')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
                setCreateError(null);
              }}
              className="btn text-xs py-1 px-2 text-[#888] hover:text-white"
            >
              ✕
            </button>
          </div>
          {createError && (
            <div className="text-[11px] text-[#f88]">{createError}</div>
          )}
        </form>
      )}

      {/* Mensagem de Erro de Permissão ou Leitura */}
      {error && (
        <div className="p-2 bg-[#200] border border-[#500] text-[#f88] text-[11px]">
          {error}
        </div>
      )}

      {/* Lista de Diretórios com Rolagem Interna */}
      <div className="border border-[#222] bg-[#080808] max-h-52 overflow-y-auto custom-scrollbar flex flex-col">
        {loading && directories.length === 0 ? (
          <div className="p-4 text-center text-[#666] text-[11px]">
            {t('loading')}
          </div>
        ) : filteredDirectories.length === 0 ? (
          <div className="p-4 text-center text-[#555] text-[11px]">
            {filterQuery ? 'Nenhum diretório corresponde ao filtro.' : t('noSubdirectories')}
          </div>
        ) : (
          filteredDirectories.map((dir) => {
            const isSelected = selectedPath === dir.path;
            const isMemoryCard = dir.isMemoryCard;
            const isAlreadyInList = isMemoryCard && Boolean(
              existingProjects?.some((ep) => isSamePath(ep.path, dir.path))
            );

            return (
              <div
                key={dir.path}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-[#141414] hover:bg-[#151515] transition-colors ${
                  isSelected ? 'bg-[#1a1a1a]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectPath(dir.path);
                    if (isMemoryCard) {
                      onSelectExistingProject?.({
                        path: dir.path,
                        isAlreadyInList,
                        name: dir.name
                      });
                    } else {
                      onSelectExistingProject?.(null);
                      handleNavigate(dir.path);
                    }
                  }}
                  className="flex items-center gap-2 truncate flex-1 text-left"
                >
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isMemoryCard
                        ? isAlreadyInList
                          ? 'text-blue-400'
                          : 'text-emerald-400'
                        : 'text-gray-400'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <span className={`truncate text-xs ${isSelected ? 'text-white font-semibold' : 'text-[#bbb]'}`}>
                    {dir.name}
                  </span>
                </button>

                {isMemoryCard && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`px-1.5 py-0.2 text-[9px] border font-mono ${
                        isAlreadyInList
                          ? 'border-blue-600/60 bg-blue-950/40 text-blue-300'
                          : 'border-emerald-600/60 bg-emerald-950/40 text-emerald-300'
                      }`}
                      title={isAlreadyInList ? t('projectAlreadyInListWarning') : t('existingMemoryCardHint')}
                    >
                      {isAlreadyInList ? t('projectAlreadyInListBadge') : t('alreadyMemoryCardBadge')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectExistingProject?.(null);
                        handleNavigate(dir.path);
                      }}
                      className="text-[10px] text-gray-500 hover:text-white px-1 py-0.5 border border-transparent hover:border-[#444] transition-colors"
                      title="Navegar para dentro desta pasta"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
