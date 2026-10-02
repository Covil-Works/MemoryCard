export type ModelScope = 'global' | 'project';

export interface TaskModel {
  name: string;
  scope: ModelScope;
  path: string;
  content: string;
}

export const REQUIRED_MODEL_PLACEHOLDERS = [
  'id',
  'title',
  'status',
  'position',
  'created_at',
  'updated_at',
  'description',
  'todo',
  'comments'
] as const;

export const REQUIRED_MODEL_SECTIONS = [
  'Description',
  'Todo',
  'Comments'
] as const;

export const DEFAULT_MODEL_TEMPLATE = `---
id: {{id}}
title: {{title}}
status: {{status}}
position: {{position}}
created_at: {{created_at}}
updated_at: {{updated_at}}
---

# {{title}}

## Description

{{description}}

## Todo

{{todo}}

## Comments

{{comments}}
`;
