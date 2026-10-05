'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt-br' | 'en';
export type ColumnHeightMode = 'auto' | 'tasks' | 'compact' | 'medium' | 'large' | 'custom';

export interface VisibilitySettings {
  mode: ColumnHeightMode;
  tasksLimit: number;
  customHeight: number;
}

export interface ProjectActions {
  openModelsModal?: () => void;
  projectName?: string;
}

const translations = {
  'pt-br': {
    appName: 'MemoryCard',
    dashboard: 'Projetos',
    registeredProjects: 'Projetos Registrados',
    registeredProjectsDesc: 'Projetos MemoryCard gerenciados localmente no sistema.',
    newProject: '+ Novo Projeto',
    newColumn: '+ Nova Coluna',
    addTask: '+ Task',
    models: 'Modelos',
    visibility: 'Visibilidade',
    language: 'Idioma',
    version: 'Versão',
    appearance: 'Aparência & Visibilidade',
    projectSettings: 'Configurações do Projeto',
    sort: 'ORDENAR:',
    sortRecent: 'Mais Recente (updated_at)',
    sortAlpha: 'Alfabética (A-Z)',
    sortCustom: 'Manual (Custom)',
    cancel: 'Cancelar',
    save: 'Salvar',
    saving: 'Salvando...',
    column: 'Coluna',
    columnName: 'Nome da Coluna:',
    columnId: 'Identificador (Opcional):',
    createColumn: 'Criar Coluna',
    columnCreatedSuccess: 'Coluna criada com sucesso',
    visibilitySettingsTitle: 'Visibilidade',
    visibilityDesc: 'Preferências visuais e dimensionamento do sistema.',
    columnHeightTitle: 'Altura das colunas',
    columnHeightDesc: 'Defina como a altura das colunas do quadro Kanban é dimensionada.',
    configModeLabel: 'Configuração de exibição:',
    modeDefault: 'Padrão',
    modeCustom: 'Personalizado',
    modeDefaultDesc: 'Calcula automaticamente a altura ideal para caber no monitor sem gerar scroll na página inteira. As tarefas restantes são acessadas com scroll interno.',
    modeCustomDesc: 'Exibe exatamente a quantidade de tarefas escolhida antes de ativar o scroll interno da coluna.',
    tasksLimitLabel: 'Número de tarefas visíveis:',
    resetDefault: 'Restaurar Padrão',
    close: 'Fechar',
    loading: 'Carregando...',
    emptyColumn: 'Arraste cards para cá ou adicione uma task',
    model: 'MODELO:',
    available: 'DISPONÍVEL',
    unavailable: 'INDISPONÍVEL',
    openBoard: 'Abrir Board →',
    remove: 'Remover',
    relink: 'Relincar Pasta',
    relinkConfirm: 'Confirmar Relink',
    createNewProject: 'Inicializar Novo Projeto',
    directoryPath: 'Caminho do Diretório:',
    projectNameLabel: 'Nome do Projeto (Opcional):',
    selectFolder: 'Selecionando...',
    noProjects: 'Nenhum projeto registrado no MemoryCard.',
    noProjectsHint: 'Clique em "+ Novo Projeto" ou execute memorycard init no terminal.',
  },
  'en': {
    appName: 'MemoryCard',
    dashboard: 'Projects',
    registeredProjects: 'Registered Projects',
    registeredProjectsDesc: 'MemoryCard projects managed locally on this machine.',
    newProject: '+ New Project',
    newColumn: '+ New Column',
    addTask: '+ Task',
    models: 'Models',
    visibility: 'Visibility',
    language: 'Language',
    version: 'Version',
    appearance: 'Appearance & Visibility',
    projectSettings: 'Project Settings',
    sort: 'SORT:',
    sortRecent: 'Most Recent (updated_at)',
    sortAlpha: 'Alphabetical (A-Z)',
    sortCustom: 'Manual (Custom)',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    column: 'Column',
    columnName: 'Column Name:',
    columnId: 'Identifier (Optional):',
    createColumn: 'Create Column',
    columnCreatedSuccess: 'Column created successfully',
    visibilitySettingsTitle: 'Visibility',
    visibilityDesc: 'Visual preferences and system sizing.',
    columnHeightTitle: 'Column height',
    columnHeightDesc: 'Configure how the Kanban board column heights are dimensioned.',
    configModeLabel: 'Display configuration:',
    modeDefault: 'Default',
    modeCustom: 'Custom',
    modeDefaultDesc: 'Automatically calculates the ideal height to fit your monitor without causing full-page vertical scrolling. Additional tasks scroll internally.',
    modeCustomDesc: 'Displays exactly the chosen number of tasks in view before internal column scrolling begins.',
    tasksLimitLabel: 'Number of visible tasks:',
    resetDefault: 'Reset to Default',
    close: 'Close',
    loading: 'Loading...',
    emptyColumn: 'Drag cards here or add a task',
    model: 'MODEL:',
    available: 'AVAILABLE',
    unavailable: 'UNAVAILABLE',
    openBoard: 'Open Board →',
    remove: 'Remove',
    relink: 'Relink Folder',
    relinkConfirm: 'Confirm Relink',
    createNewProject: 'Initialize New Project',
    directoryPath: 'Directory Path:',
    projectNameLabel: 'Project Name (Optional):',
    selectFolder: 'Selecting...',
    noProjects: 'No projects registered in MemoryCard.',
    noProjectsHint: 'Click "+ New Project" or run memorycard init in your terminal.',
  }
} as const;

export type TranslationKey = keyof typeof translations['pt-br'];

interface SettingsContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  visibilitySettings: VisibilitySettings;
  setVisibilitySettings: (settings: VisibilitySettings) => void;
  isVisibilityModalOpen: boolean;
  setIsVisibilityModalOpen: (open: boolean) => void;
  projectActions: ProjectActions | null;
  setProjectActions: (actions: ProjectActions | null) => void;
  t: (key: TranslationKey) => string;
  getColumnTasksStyle: () => React.CSSProperties;
}

const DEFAULT_VISIBILITY: VisibilitySettings = {
  mode: 'auto',
  tasksLimit: 5,
  customHeight: 520,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt-br');
  const [visibilitySettings, setVisibilitySettingsState] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [projectActions, setProjectActions] = useState<ProjectActions | null>(null);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('memorycard_lang') as Language | null;
      if (savedLang === 'pt-br' || savedLang === 'en') {
        setLanguageState(savedLang);
      }
      const savedVis = localStorage.getItem('memorycard_visibility');
      if (savedVis) {
        const parsed = JSON.parse(savedVis);
        setVisibilitySettingsState({
          mode: parsed.mode === 'tasks' ? 'tasks' : 'auto',
          tasksLimit: typeof parsed.tasksLimit === 'number' ? parsed.tasksLimit : 5,
          customHeight: typeof parsed.customHeight === 'number' ? parsed.customHeight : 520,
        });
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('memorycard_lang', lang);
    } catch {}
  };

  const setVisibilitySettings = (settings: VisibilitySettings) => {
    setVisibilitySettingsState(settings);
    try {
      localStorage.setItem('memorycard_visibility', JSON.stringify(settings));
    } catch {}
  };

  const t = (key: TranslationKey): string => {
    const dict = translations[language] || translations['pt-br'];
    return dict[key] || translations['pt-br'][key] || key;
  };

  const getColumnTasksStyle = (): React.CSSProperties => {
    if (visibilitySettings.mode === 'tasks') {
      // Média por card de task (~80px) + gap-2 (8px) = ~88px
      const height = Math.max(120, visibilitySettings.tasksLimit * 88 + 4);
      return {
        maxHeight: `${height}px`,
        height: `${height}px`,
      };
    }
    // 'auto' (Padrão): ajusta à altura do monitor sem rolagem vertical na página
    return {
      maxHeight: 'min(calc(100dvh - 220px), calc(100vh - 220px))',
      minHeight: '260px',
    };
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        visibilitySettings,
        setVisibilitySettings,
        isVisibilityModalOpen,
        setIsVisibilityModalOpen,
        projectActions,
        setProjectActions,
        t,
        getColumnTasksStyle,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
}
