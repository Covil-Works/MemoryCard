'use client';

import React, { useState, useEffect } from 'react';
import { useSSE } from '../../hooks/use-sse';
import { TaskModal } from '../../components/task-modal';
import { NewTaskModal } from '../../components/new-task-modal';
import { NewColumnModal } from '../../components/new-column-modal';
import { RenameColumnModal } from '../../components/rename-column-modal';
import { DeleteColumnModal } from '../../components/delete-column-modal';
import { ModelsModal } from '../../components/models-modal';
import { useSettings } from '../../components/settings-context';

interface Column {
  id: string;
  name: string;
  order: number;
}

interface Task {
  id: number;
  title: string;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
  description: string;
  todos: Array<{ text: string; completed: boolean }>;
  comments: Array<{ timestamp: string; text: string }>;
  hash?: string;
}

interface ProjectInfo {
  rootDir: string;
  slug: string;
  config: {
    project: { id: string; name: string };
    columns: Column[];
    board: { sort: 'updated_at' | 'alphabetical' | 'custom' };
    task_model: string;
  };
}

export default function ProjectBoardPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const { t, setProjectActions, getColumnTasksStyle } = useSettings();

  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [externalConflictForActiveTask, setExternalConflictForActiveTask] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTargetColumn, setNewTaskTargetColumn] = useState<string | null>(null);
  const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
  const [isModelsModalOpen, setIsModelsModalOpen] = useState(false);

  // Menu de opções e modais da Coluna
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  const [renamingColumn, setRenamingColumn] = useState<Column | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<{ column: Column; taskCount: number } | null>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchProjectData = async () => {
    try {
      const infoRes = await fetch(`/api/projects/${slug}/info`);
      if (!infoRes.ok) throw new Error('Projeto não encontrado');
      const infoData = await infoRes.json();
      setProjectInfo(infoData);

      const tasksRes = await fetch(`/api/projects/${slug}/tasks?sort=${infoData.config.board.sort || 'updated_at'}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }

      const modelsRes = await fetch(`/api/projects/${slug}/models`);
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setModels(modelsData.models || []);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [slug]);

  // Registra as ações de projeto para o menu dos três tracinhos no canto superior direito
  useEffect(() => {
    if (projectInfo) {
      setProjectActions({
        openModelsModal: () => setIsModelsModalOpen(true),
        projectName: projectInfo.config.project.name,
      });
    }
    return () => {
      setProjectActions(null);
    };
  }, [projectInfo]);

  // Atualização em tempo real via SSE (§24)
  useSSE((event) => {
    if (projectInfo && event.payload?.project_id === projectInfo.config.project.id) {
      // Se a task aberta foi atualizada externamente
      if (event.type === 'task-updated' && activeTaskId === event.payload?.task_id) {
        setExternalConflictForActiveTask(true);
      }
      fetchProjectData();
    }
  });

  // Fecha menu de coluna ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuColumnId(null);
      }
    };
    if (openMenuColumnId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [openMenuColumnId]);

  // Alterar ordenação do board
  const handleSortChange = async (newSort: string) => {
    try {
      await fetch(`/api/projects/${slug}/board-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort: newSort })
      });
      await fetchProjectData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Drag and Drop nativo HTML5
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', String(taskId));
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    const taskId = Number(taskIdStr);

    if (isNaN(taskId)) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.status === targetStatus) return;

      // Ao mover manualmente, altera ordenação para custom (§16.3)
      if (projectInfo?.config.board.sort !== 'custom') {
        await handleSortChange('custom');
      }

      await fetch(`/api/projects/${slug}/tasks/${taskId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': task.hash || ''
        },
        body: JSON.stringify({ status: targetStatus })
      });

      await fetchProjectData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDraggedTaskId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#666] font-mono text-xs">{t('loading')}</div>;
  }

  if (error || !projectInfo) {
    return (
      <div className="max-w-2xl mx-auto p-6 border border-[#f44] bg-[#200] text-[#f88] font-mono text-xs">
        {error || 'Projeto não encontrado.'}
      </div>
    );
  }

  const columns = projectInfo.config.columns || [];

  return (
    <div className="flex-1 flex flex-col gap-3 sm:gap-4 w-full max-w-full min-w-0">
      {/* Cabeçalho do Board */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222] pb-3 sm:pb-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold font-mono text-white truncate max-w-full">{projectInfo.config.project.name}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 border border-[#333] text-[#888] shrink-0">
              {t('model')} {projectInfo.config.task_model}
            </span>
          </div>
          <div className="text-[11px] sm:text-xs text-[#666] font-mono mt-0.5 truncate max-w-full">{projectInfo.rootDir}</div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-[10px] font-mono text-[#777] shrink-0">{t('sort')}</label>
            <select
              className="select text-xs font-mono py-1 px-2"
              value={projectInfo.config.board.sort}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="updated_at">{t('sortRecent')}</option>
              <option value="alphabetical">{t('sortAlpha')}</option>
              <option value="custom">{t('sortCustom')}</option>
            </select>
          </div>

          {/* Botão Nova Coluna (substitui o botão de nova task no canto superior direito) */}
          <button
            onClick={() => setIsNewColumnModalOpen(true)}
            className="btn btn-primary text-xs shrink-0"
          >
            {t('newColumn')}
          </button>
        </div>
      </div>

      {/* Grid de Colunas Kanban com Scroll Horizontal Isolado */}
      <div className="w-full max-w-full overflow-x-auto pb-4 pt-1 custom-scrollbar snap-x snap-proximity overscroll-x-contain touch-pan-x">
        <div className="flex flex-row items-start gap-3 sm:gap-4 min-w-max pb-2 pr-4 sm:pr-0">
          {columns.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.id);
            const isDragOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex flex-col bg-[#0c0c0c] border w-[82vw] max-w-[320px] sm:w-[290px] shrink-0 snap-start transition-colors ${
                  isDragOver ? 'border-white bg-[#151515]' : 'border-[#222]'
                }`}
              >
                {/* Cabeçalho da Coluna com botão + Task e Menu de 3 Pontinhos */}
                <div className="p-2.5 sm:p-3 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d]">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="font-mono font-bold text-xs text-white uppercase tracking-wider truncate">
                      {column.name}
                    </span>
                    <span className="font-mono text-xs text-[#666] bg-[#1a1a1a] px-1.5 py-0.2 shrink-0">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1 sm:ml-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskTargetColumn(column.id);
                        setIsNewTaskModalOpen(true);
                      }}
                      className="btn text-xs py-0.5 px-2 hover:border-[#555] text-gray-300 hover:text-white shrink-0"
                      title={`Adicionar task em ${column.name}`}
                    >
                      {t('addTask')}
                    </button>

                    {/* Botão de 3 pontinhos verticais (Kebab Menu) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuColumnId(openMenuColumnId === column.id ? null : column.id);
                        }}
                        className="p-1 text-gray-400 hover:text-white hover:bg-[#1a1a1a] border border-transparent hover:border-[#333] transition-colors rounded-sm flex items-center justify-center focus:outline-none"
                        title={t('columnMenu')}
                        aria-label={`${t('columnMenu')} ${column.name}`}
                        aria-expanded={openMenuColumnId === column.id}
                      >
                        <svg
                          className="w-4 h-4 text-gray-400 hover:text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="12" cy="5" r="1.75" />
                          <circle cx="12" cy="12" r="1.75" />
                          <circle cx="12" cy="19" r="1.75" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuColumnId === column.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20 cursor-default"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuColumnId(null);
                            }}
                          />

                          <div
                            className="absolute right-0 top-full mt-1.5 w-44 bg-[#111] border border-[#333] shadow-2xl py-1 z-30 font-mono text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Renomear Coluna */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuColumnId(null);
                                setRenamingColumn(column);
                              }}
                              className="w-full text-left px-3 py-2 text-gray-200 hover:text-white hover:bg-[#1f1f1f] flex items-center gap-2 transition-colors"
                            >
                              <svg
                                className="w-3.5 h-3.5 text-gray-400 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                              <span>{t('renameColumn')}</span>
                            </button>

                            <div className="h-[1px] bg-[#222] my-1" />

                            {/* Excluir Coluna */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuColumnId(null);
                                setDeletingColumn({ column, taskCount: columnTasks.length });
                              }}
                              className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-[#200] flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <svg
                                  className="w-3.5 h-3.5 text-red-400 shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span className="truncate">{t('deleteColumn')}</span>
                              </div>
                              {columnTasks.length > 0 && (
                                <span className="text-[10px] text-red-400/80 bg-red-950/60 px-1 py-0.5 border border-red-900/60 shrink-0">
                                  {columnTasks.length}
                                </span>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Cards com limite de altura configurável e scroll vertical interno */}
                <div
                  className="p-2 flex flex-col gap-2 overflow-y-auto"
                  style={getColumnTasksStyle()}
                >
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-[#444] font-mono italic">
                      {t('emptyColumn')}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const totalTodos = task.todos?.length || 0;
                      const completedTodos = task.todos?.filter((t) => t.completed).length || 0;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => {
                            setActiveTaskId(task.id);
                            setExternalConflictForActiveTask(false);
                          }}
                          className="p-3 bg-[#111] border border-[#222] hover:border-[#555] cursor-pointer flex flex-col gap-2 transition-all hover:bg-[#161616]"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[#888] font-bold">#{task.id}</span>
                            <span className="text-[10px] text-[#555]">
                              {task.updated_at.split('T')[1]?.slice(0, 5)}
                            </span>
                          </div>

                          <div className="text-xs font-medium text-gray-200 line-clamp-2">
                            {task.title}
                          </div>

                          {totalTodos > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#777] mt-1">
                              <span className="text-white">
                                {completedTodos}/{totalTodos}
                              </span>
                              <span>todos</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes / Edição de Task */}
      {activeTaskId !== null && (
        <TaskModal
          slug={slug}
          taskId={activeTaskId}
          externalConflictDetected={externalConflictForActiveTask}
          onClose={() => {
            setActiveTaskId(null);
            setExternalConflictForActiveTask(false);
          }}
          onTaskUpdated={fetchProjectData}
        />
      )}

      {/* Modal de Criação de Task vinculada à respectiva coluna */}
      {isNewTaskModalOpen && (
        <NewTaskModal
          slug={slug}
          columns={columns}
          models={models}
          defaultStatus={newTaskTargetColumn || columns[0]?.id}
          defaultModel={projectInfo.config.task_model}
          onClose={() => {
            setIsNewTaskModalOpen(false);
            setNewTaskTargetColumn(null);
          }}
          onTaskCreated={fetchProjectData}
        />
      )}

      {/* Modal de Nova Coluna */}
      {isNewColumnModalOpen && (
        <NewColumnModal
          slug={slug}
          onClose={() => setIsNewColumnModalOpen(false)}
          onColumnCreated={fetchProjectData}
        />
      )}

      {/* Modal de Modelos (acionado via menu dos três tracinhos no canto superior direito) */}
      {isModelsModalOpen && (
        <ModelsModal
          slug={slug}
          currentTaskModel={projectInfo.config.task_model}
          onClose={() => setIsModelsModalOpen(false)}
          onModelChanged={fetchProjectData}
        />
      )}

      {/* Modal de Renomear Coluna */}
      {renamingColumn && (
        <RenameColumnModal
          slug={slug}
          column={renamingColumn}
          onClose={() => setRenamingColumn(null)}
          onColumnRenamed={fetchProjectData}
        />
      )}

      {/* Modal de Excluir Coluna */}
      {deletingColumn && (
        <DeleteColumnModal
          slug={slug}
          column={deletingColumn.column}
          taskCount={deletingColumn.taskCount}
          onClose={() => setDeletingColumn(null)}
          onColumnDeleted={fetchProjectData}
        />
      )}
    </div>
  );
}
