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
import { ArrowUpDown, Check, GripVertical, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import {
  getStoredColumnOrder,
  saveStoredColumnOrder,
  clearStoredColumnOrder,
  applyColumnOrder,
  reorderColumnArray,
  moveColumnDirection,
} from '../../utils/column-order';

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
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [renamingColumn, setRenamingColumn] = useState<Column | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<{ column: Column; taskCount: number } | null>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnTarget, setDragOverColumnTarget] = useState<string | null>(null);
  const [customColumnOrder, setCustomColumnOrder] = useState<string[] | null>(null);

  const fetchProjectData = async () => {
    try {
      const infoRes = await fetch(`/api/projects/${slug}/info`);
      if (!infoRes.ok) throw new Error('Projeto não encontrado');
      const infoData = await infoRes.json();
      setProjectInfo(infoData);

      const tasksRes = await fetch(`/api/projects/${slug}/tasks?sort=${infoData.config.board.sort || 'custom'}`);
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
    setCustomColumnOrder(getStoredColumnOrder(slug));
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

  // Fecha menus de coluna e ordenação ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuColumnId(null);
        setIsSortMenuOpen(false);
      }
    };
    if (openMenuColumnId || isSortMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [openMenuColumnId, isSortMenuOpen]);

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

  // Reordenação de colunas
  const handleReorderColumns = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const baseCols = projectInfo?.config.columns || [];
    const currentOrdered = applyColumnOrder(baseCols, customColumnOrder);
    const reordered = reorderColumnArray(currentOrdered, sourceId, targetId);
    const newOrder = reordered.map((c) => c.id);
    setCustomColumnOrder(newOrder);
    saveStoredColumnOrder(slug, newOrder);
  };

  const handleMoveColumn = (columnId: string, direction: 'left' | 'right') => {
    const baseCols = projectInfo?.config.columns || [];
    const currentOrdered = applyColumnOrder(baseCols, customColumnOrder);
    const reordered = moveColumnDirection(currentOrdered, columnId, direction);
    const newOrder = reordered.map((c) => c.id);
    setCustomColumnOrder(newOrder);
    saveStoredColumnOrder(slug, newOrder);
  };

  const handleResetColumnOrder = () => {
    clearStoredColumnOrder(slug);
    setCustomColumnOrder(null);
  };

  // Drag and Drop nativo HTML5 - Tasks
  const handleTaskDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('application/x-memorycard-task', String(taskId));
    e.dataTransfer.setData('text/plain', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // Drag and Drop nativo HTML5 - Colunas
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData('application/x-memorycard-column', columnId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColumnId(columnId);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnTarget(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumnId || e.dataTransfer.types.includes('application/x-memorycard-column')) {
      e.dataTransfer.dropEffect = 'move';
      if (dragOverColumnTarget !== columnId) {
        setDragOverColumnTarget(columnId);
      }
    } else {
      e.dataTransfer.dropEffect = 'move';
      if (dragOverColumn !== columnId) {
        setDragOverColumn(columnId);
      }
    }
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    const currentTarget = e.currentTarget;
    if (!currentTarget.contains(e.relatedTarget as Node)) {
      if (draggedColumnId) {
        setDragOverColumnTarget(null);
      } else {
        setDragOverColumn(null);
      }
    }
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const isColumnDrop = draggedColumnId !== null || e.dataTransfer.types.includes('application/x-memorycard-column');

    if (isColumnDrop) {
      const sourceColId = draggedColumnId || e.dataTransfer.getData('application/x-memorycard-column');
      setDraggedColumnId(null);
      setDragOverColumnTarget(null);
      if (sourceColId && sourceColId !== targetColumnId) {
        handleReorderColumns(sourceColId, targetColumnId);
      }
      return;
    }

    // Drop de Task
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-memorycard-task');
    const taskId = Number(taskIdStr);

    if (isNaN(taskId)) return;

    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === targetColumnId) return;

      // Ao mover manualmente, altera ordenação para custom (§16.3)
      if (projectInfo?.config.board.sort !== 'custom') {
        await handleSortChange('custom');
      }

      await fetch(`/api/projects/${slug}/tasks/${taskId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': task.hash || '',
        },
        body: JSON.stringify({ status: targetColumnId }),
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

  const rawColumns = projectInfo.config.columns || [];
  const columns = applyColumnOrder(rawColumns, customColumnOrder);
  const isCustomOrderActive = Boolean(
    customColumnOrder &&
    customColumnOrder.length > 0 &&
    (customColumnOrder.length !== rawColumns.length ||
      customColumnOrder.some((id, idx) => id !== rawColumns[idx]?.id))
  );

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
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
              className="btn btn-action-blue text-xs p-1.5 sm:p-2 shrink-0 flex items-center justify-center"
              title={
                (projectInfo.config.board.sort === 'updated_at' && t('sortRecent')) ||
                (projectInfo.config.board.sort === 'alphabetical' && t('sortAlpha')) ||
                t('sortCustom')
              }
              aria-label="Opções de ordenação"
              aria-haspopup="true"
              aria-expanded={isSortMenuOpen}
            >
              <ArrowUpDown className="w-4 h-4 shrink-0" />
            </button>

            {isSortMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSortMenuOpen(false);
                  }}
                />
                <div
                  className="sort-dropdown-menu absolute left-0 top-full mt-1.5 w-44 py-1 z-30 font-mono text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {[
                    { id: 'custom' as const, label: t('sortCustom') },
                    { id: 'updated_at' as const, label: t('sortRecent') },
                    { id: 'alphabetical' as const, label: t('sortAlpha') },
                  ].map((opt) => {
                    const isSelected = (projectInfo.config.board.sort || 'custom') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          handleSortChange(opt.id);
                          setIsSortMenuOpen(false);
                        }}
                        className={`sort-dropdown-item w-full text-left px-3 py-2 flex items-center justify-between gap-2 font-mono text-xs ${
                          isSelected ? 'active' : ''
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && (
                          <Check className="sort-check-icon w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {isCustomOrderActive && (
            <button
              type="button"
              onClick={handleResetColumnOrder}
              className="btn btn-action-blue text-xs p-1.5 sm:p-2 shrink-0 flex items-center justify-center"
              title={t('resetColumnOrder')}
              aria-label={t('resetColumnOrder')}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* Botão Nova Coluna (substitui o botão de nova task no canto superior direito) */}
          <button
            onClick={() => setIsNewColumnModalOpen(true)}
            className="btn btn-primary btn-action-green text-xs shrink-0"
          >
            {t('newColumn')}
          </button>
        </div>
      </div>

      {/* Grid de Colunas Kanban com Scroll Horizontal Isolado */}
      <div className="w-full max-w-full overflow-x-auto pb-4 pt-1 custom-scrollbar snap-x snap-proximity overscroll-x-contain touch-pan-x">
        <div className="flex flex-row items-start gap-3 sm:gap-4 min-w-max pb-2 pr-4 sm:pr-0">
          {columns.map((column, colIndex) => {
            const columnTasks = tasks.filter((t) => t.status === column.id);
            const isTaskDragOver = dragOverColumn === column.id;
            const isColumnDragTarget = dragOverColumnTarget === column.id && draggedColumnId !== column.id;
            const isColumnDragging = draggedColumnId === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleColumnDragOver(e, column.id)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, column.id)}
                className={`kanban-column flex flex-col bg-[#0c0c0c] border w-[82vw] max-w-[320px] sm:w-[290px] shrink-0 snap-start transition-colors ${
                  isColumnDragging ? 'column-dragging' : ''
                } ${
                  isColumnDragTarget ? 'column-drag-target' : ''
                } ${
                  isTaskDragOver ? 'border-white bg-[#151515]' : 'border-[#222]'
                }`}
              >
                {/* Cabeçalho da Coluna com drag handle, botão + Task e Menu de 3 Pontinhos */}
                <div
                  draggable
                  onDragStart={(e) => handleColumnDragStart(e, column.id)}
                  onDragEnd={handleColumnDragEnd}
                  className="kanban-column-header p-2.5 sm:p-3 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0d0d0d] cursor-grab active:cursor-grabbing select-none"
                  title={t('dragColumnHint')}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="column-drag-handle text-gray-500 hover:text-gray-300 shrink-0">
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-mono font-bold text-xs text-white uppercase tracking-wider truncate">
                      {column.name}
                    </span>
                    <span className="font-mono text-xs text-[#666] bg-[#1a1a1a] px-1.5 py-0.2 shrink-0">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1 shrink-0 ml-1 sm:ml-2"
                    draggable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      draggable={false}
                      onClick={() => {
                        setNewTaskTargetColumn(column.id);
                        setIsNewTaskModalOpen(true);
                      }}
                      className="btn text-xs py-0.5 px-2 hover:border-[#555] text-gray-300 hover:text-white shrink-0 btn-action-pink"
                      title={`Adicionar task em ${column.name}`}
                    >
                      {t('addTask')}
                    </button>

                    {/* Botão de 3 pontinhos verticais (Kebab Menu) */}
                    <div className="relative" draggable={false}>
                      <button
                        type="button"
                        draggable={false}
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
                            {/* Mover para a esquerda */}
                            {colIndex > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuColumnId(null);
                                  handleMoveColumn(column.id, 'left');
                                }}
                                className="w-full text-left px-3 py-2 text-gray-200 hover:text-white hover:bg-[#1f1f1f] flex items-center gap-2 transition-colors"
                              >
                                <ArrowLeft className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{t('moveLeft')}</span>
                              </button>
                            )}

                            {/* Mover para a direita */}
                            {colIndex < columns.length - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuColumnId(null);
                                  handleMoveColumn(column.id, 'right');
                                }}
                                className="w-full text-left px-3 py-2 text-gray-200 hover:text-white hover:bg-[#1f1f1f] flex items-center gap-2 transition-colors"
                              >
                                <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{t('moveRight')}</span>
                              </button>
                            )}

                            {/* Restaurar ordem original */}
                            {isCustomOrderActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuColumnId(null);
                                  handleResetColumnOrder();
                                }}
                                className="w-full text-left px-3 py-2 text-gray-200 hover:text-white hover:bg-[#1f1f1f] flex items-center gap-2 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{t('resetColumnOrder')}</span>
                              </button>
                            )}

                            {(colIndex > 0 || colIndex < columns.length - 1 || isCustomOrderActive) && (
                              <div className="h-[1px] bg-[#222] my-1" />
                            )}

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
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleTaskDragStart(e, task.id);
                          }}
                          onDragEnd={handleTaskDragEnd}
                          onClick={() => {
                            setActiveTaskId(task.id);
                            setExternalConflictForActiveTask(false);
                          }}
                          className="kanban-task-card p-3 bg-[#111] border border-[#222] hover:border-[#555] cursor-pointer flex flex-col gap-2 transition-all hover:bg-[#161616]"
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
