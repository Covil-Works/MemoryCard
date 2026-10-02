export type BoardSort = 'updated_at' | 'alphabetical' | 'custom';

export interface Column {
  id: string;
  name: string;
  order: number;
}

export interface ProjectMetadata {
  id: string;
  name: string;
}

export interface ProjectConfig {
  project: ProjectMetadata;
  next_task_id: number;
  columns: Column[];
  board: {
    sort: BoardSort;
  };
  task_model: string;
}

export interface GlobalProjectEntry {
  project_id: string;
  path: string;
}

export interface GlobalProjectsRegistry {
  projects: GlobalProjectEntry[];
}

export interface ProjectResolvedInfo {
  rootDir: string;
  configPath: string;
  config: ProjectConfig;
  slug: string;
}
