import type { TaskWithRelations } from '@/types';

// Re-export what we need from @/lib/dnd
export {
  getTaskDragData,
  getTaskDropTargetData,
  isDraggingATask,
  isTaskDragData,
  isTaskDropTargetData,
  type TaskDragData,
  type TaskDropTargetData,
} from '@/lib/dnd';

export type TSection = {
  id: string;
  title: string;
  tasks: TaskWithRelations[];
  /** Project ID if this is a project section */
  projectId?: string;
  /** Area ID if this is an area section */
  areaId?: string;
  /** Whether this is the evening section */
  isEvening?: boolean;
  /** Whether this is the completed section */
  isCompleted?: boolean;
  /** Heading ID if this is a heading section (for project view) */
  headingId?: string;
  /** Date string for date-based sections (for upcoming view) */
  dateStr?: string;
};

export type TaskGroupsData = {
  sections: TSection[];
};

// Section drop target data
const sectionKey = Symbol('section');
export type TSectionData = {
  [sectionKey]: true;
  section: TSection;
};

export function getSectionData({
  section,
}: Omit<TSectionData, typeof sectionKey>): TSectionData {
  return {
    [sectionKey]: true,
    section,
  };
}

export function isSectionData(
  value: Record<string | symbol, unknown>,
): value is TSectionData {
  return Boolean(value[sectionKey]);
}
