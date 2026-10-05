'use client';

import React, { useState, useEffect } from 'react';
import { useSSE } from '../../hooks/use-sse';
import { TaskModal } from '../../components/task-modal';
import { NewTaskModal } from '../../components/new-task-modal';
import { ModelsModal } from '../../components/models-modal';

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

  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [externalConflictForActiveTask, setExternalConflictForActiveTask] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isModelsModalOpen, setIsModelsModalOpen] = useState(false);

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
    return <div className="text-center py-20 text-[#666] font-mono text-xs">Carregando board...</div>;
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
    <div className="flex-1 flex flex-col gap-4">
      {/* Cabeçalho do Board */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold font-mono text-white">{projectInfo.config.project.name}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 border border-[#333] text-[#888]">
              MODELO: {projectInfo.config.task_model}
            </span>
          </div>
          <div className="text-xs text-[#666] font-mono mt-0.5">{projectInfo.rootDir}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-mono text-[#777]">ORDENAR:</label>
            <select
              className="select text-xs font-mono py-1 px-2"
              value={projectInfo.config.board.sort}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="updated_at">Mais Recente (updated_at)</option>
              <option value="alphabetical">Alfabética (A-Z)</option>
              <option value="custom">Manual (Custom)</option>
            </select>
          </div>

          <button onClick={() => setIsModelsModalOpen(true)} className="btn text-xs">
            Modelos
          </button>

          <button onClick={() => setIsNewTaskModalOpen(true)} className="btn btn-primary text-xs">
            + Nova Task
          </button>
        </div>
      </div>

      {/* Grid de Colunas Kanban */}
      <div className="flex-1 grid grid-cols-1 md:grid-flow-col auto-cols-fr gap-4 overflow-x-auto min-h-[600px] items-start pb-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);
          const isDragOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col bg-[#0c0c0c] border min-w-[280px] h-full transition-colors ${
                isDragOver ? 'border-white bg-[#151515]' : 'border-[#222]'
              }`}
            >
              {/* Cabeçalho da Coluna */}
              <div className="p-3 border-b border-[#222] flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">
                  {column.name}
                </span>
                <span className="font-mono text-xs text-[#666] bg-[#1a1a1a] px-1.5 py-0.2">
                  {columnTasks.length}
                </span>
              </div>

              {/* Lista de Cards */}
              <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto max-h-[75vh]">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-[#444] font-mono italic">
                    Arraste cards para cá
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

      {/* Modal de Criação de Task */}
      {isNewTaskModalOpen && (
        <NewTaskModal
          slug={slug}
          columns={columns}
          models={models}
          defaultModel={projectInfo.config.task_model}
          onClose={() => setIsNewTaskModalOpen(false)}
          onTaskCreated={fetchProjectData}
        />
      )}

      {/* Modal de Modelos */}
      {isModelsModalOpen && (
        <ModelsModal
          slug={slug}
          currentTaskModel={projectInfo.config.task_model}
          onClose={() => setIsModelsModalOpen(false)}
          onModelChanged={fetchProjectData}
        />
      )}
    </div>
  );
}
