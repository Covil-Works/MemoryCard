export interface TodoItem {
  text: string;
  completed: boolean;
}

export interface CommentItem {
  timestamp: string; // Ex: YYYY-MM-DD HH:mm
  text: string;
}

export interface CustomSection {
  heading: string; // Ex: "## Architecture Decisions"
  content: string;
}

export interface TaskFrontmatter {
  id: number;
  title: string;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task extends TaskFrontmatter {
  description: string;
  todos: TodoItem[];
  comments: CommentItem[];
  customSections: CustomSection[];
  hash?: string;
}
