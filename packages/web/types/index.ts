import type {
  AreaRecord,
  ChecklistItemRecord,
  HeadingRecord,
  ProjectRecord,
  TagRecord,
  TaskRecord,
} from '@/db/validation';

// =============================================================================
// Base Types (re-export from validation)
// =============================================================================

export type Task = TaskRecord;
export type Project = ProjectRecord;
export type Area = AreaRecord;
export type Heading = HeadingRecord;
export type ChecklistItem = ChecklistItemRecord;
export type Tag = TagRecord;

// =============================================================================
// ID Types
// =============================================================================

export type TaskId = string;
export type ProjectId = string;
export type AreaId = string;
export type HeadingId = string;
export type ChecklistItemId = string;
export type TagId = string;

// =============================================================================
// Status Types
// =============================================================================

export type TaskStatus =
  | 'inbox'
  | 'anytime'
  | 'someday'
  | 'scheduled'
  | 'completed'
  | 'trashed';

export type ProjectStatus = 'active' | 'completed' | 'trashed';
export type TaskType = 'task' | 'project';

// =============================================================================
// Extended Types (with relations)
// =============================================================================

export interface TaskWithRelations extends Task {
  checklistItems?: ChecklistItem[];
  tags?: Tag[];
}

export interface ProjectWithRelations extends Project {
  headings?: Heading[];
  tags?: Tag[];
}

export interface AreaWithRelations extends Area {
  projects?: Project[];
}

// =============================================================================
// Input Types (for creating/updating)
// =============================================================================

export interface TaskInput {
  title: string;
  notes?: string;
  status?: TaskStatus;
  scheduledDate?: string | null;
  deadline?: string | null;
  projectId?: ProjectId | null;
  headingId?: HeadingId | null;
  areaId?: AreaId | null;
}

export interface ProjectInput {
  title: string;
  notes?: string;
  areaId?: AreaId | null;
}
