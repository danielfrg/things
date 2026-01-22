import type { TaskWithRelations } from '@/types';

// =============================================================================
// Type-Safe Factory Pattern for Drag-and-Drop
// =============================================================================

type DragRecord = Record<string | symbol, unknown>;

function createDraggable<T extends object>(key: symbol) {
  type Data = { [K in typeof key]: true } & T;

  return {
    getData: (data: T): Data => ({ [key]: true, ...data }) as Data,
    is: (data: DragRecord): data is Data => Boolean(data[key]),
    isDragging: ({ source }: { source: { data: DragRecord } }): boolean =>
      Boolean(source.data[key]),
  };
}

// =============================================================================
// Task drag-and-drop
// =============================================================================

type TaskData = {
  task: TaskWithRelations;
  rect: DOMRect;
  groupDate?: string;
  headingId?: string;
  projectId?: string;
  isEvening?: boolean;
};

const Task = createDraggable<TaskData>(Symbol('task'));
export type TaskDragData = ReturnType<typeof Task.getData>;
export const getTaskDragData = Task.getData;
export const isTaskDragData = Task.is;
export const isDraggingATask = Task.isDragging;

// Task drop target
type TaskDropData = {
  task: TaskWithRelations;
  groupDate?: string;
  headingId?: string;
  projectId?: string;
  isEvening?: boolean;
};

const TaskDrop = createDraggable<TaskDropData>(Symbol('task-drop-target'));
export type TaskDropTargetData = ReturnType<typeof TaskDrop.getData>;
export const getTaskDropTargetData = TaskDrop.getData;
export const isTaskDropTargetData = TaskDrop.is;

// Day group drop target
type DayGroupDropData = { groupDate: string };

const DayGroupDrop = createDraggable<DayGroupDropData>(
  Symbol('day-group-drop-target'),
);
export type DayGroupDropTargetData = ReturnType<typeof DayGroupDrop.getData>;
export const getDayGroupDropTargetData = DayGroupDrop.getData;
export const isDayGroupDropTargetData = DayGroupDrop.is;

// Evening group drop target
type EveningGroupDropData = { isEvening: boolean };

const EveningGroupDrop = createDraggable<EveningGroupDropData>(
  Symbol('evening-group-drop-target'),
);
export type EveningGroupDropTargetData = ReturnType<
  typeof EveningGroupDrop.getData
>;
export const getEveningGroupDropTargetData = EveningGroupDrop.getData;
export const isEveningGroupDropTargetData = EveningGroupDrop.is;

// Heading group drop target
type HeadingGroupDropData = { headingId: string | undefined };

const HeadingGroupDrop = createDraggable<HeadingGroupDropData>(
  Symbol('heading-group-drop-target'),
);
export type HeadingGroupDropTargetData = ReturnType<
  typeof HeadingGroupDrop.getData
>;
export const getHeadingGroupDropTargetData = HeadingGroupDrop.getData;
export const isHeadingGroupDropTargetData = HeadingGroupDrop.is;

// Project group drop target
type ProjectGroupDropData = { projectId: string | undefined };

const ProjectGroupDrop = createDraggable<ProjectGroupDropData>(
  Symbol('project-group-drop-target'),
);
export type ProjectGroupDropTargetData = ReturnType<
  typeof ProjectGroupDrop.getData
>;
export const getProjectGroupDropTargetData = ProjectGroupDrop.getData;
export const isProjectGroupDropTargetData = ProjectGroupDrop.is;

// =============================================================================
// Project drag-and-drop
// =============================================================================

type ProjectData = {
  projectId: string;
  rect: DOMRect;
  areaId?: string;
};

const Project = createDraggable<ProjectData>(Symbol('project'));
export type ProjectDragData = ReturnType<typeof Project.getData>;
export const getProjectDragData = Project.getData;
export const isProjectDragData = Project.is;
export const isDraggingAProject = Project.isDragging;

// Project drop target
type ProjectDropData = { projectId: string; areaId?: string };

const ProjectDrop = createDraggable<ProjectDropData>(
  Symbol('project-drop-target'),
);
export type ProjectDropTargetData = ReturnType<typeof ProjectDrop.getData>;
export const getProjectDropTargetData = ProjectDrop.getData;
export const isProjectDropTargetData = ProjectDrop.is;

// Area drop target
type AreaDropData = { areaId?: string };

const AreaDrop = createDraggable<AreaDropData>(Symbol('area-drop-target'));
export type AreaDropTargetData = ReturnType<typeof AreaDrop.getData>;
export const getAreaDropTargetData = AreaDrop.getData;
export const isAreaDropTargetData = AreaDrop.is;

// =============================================================================
// Area header drag-and-drop (for reordering areas)
// =============================================================================

type AreaHeaderData = { areaId: string; rect: DOMRect };

const AreaHeader = createDraggable<AreaHeaderData>(Symbol('area-header'));
export type AreaHeaderDragData = ReturnType<typeof AreaHeader.getData>;
export const getAreaHeaderDragData = AreaHeader.getData;
export const isAreaHeaderDragData = AreaHeader.is;
export const isDraggingAnAreaHeader = AreaHeader.isDragging;

// Area header drop target
type AreaHeaderDropData = { areaId: string };

const AreaHeaderDrop = createDraggable<AreaHeaderDropData>(
  Symbol('area-header-drop-target'),
);
export type AreaHeaderDropTargetData = ReturnType<
  typeof AreaHeaderDrop.getData
>;
export const getAreaHeaderDropTargetData = AreaHeaderDrop.getData;
export const isAreaHeaderDropTargetData = AreaHeaderDrop.is;

// Sidebar project drop target (accepts tasks)
type SidebarProjectDropData = { projectId: string | null };

const SidebarProjectDrop = createDraggable<SidebarProjectDropData>(
  Symbol('sidebar-project-drop-target'),
);
export type SidebarProjectDropTargetData = ReturnType<
  typeof SidebarProjectDrop.getData
>;
export const getSidebarProjectDropTargetData = SidebarProjectDrop.getData;
export const isSidebarProjectDropTargetData = SidebarProjectDrop.is;

// Sidebar nav drop target (inbox, today, anytime, someday - accepts tasks)
type SidebarNavDropData = { target: 'inbox' | 'today' | 'anytime' | 'someday' };

const SidebarNavDrop = createDraggable<SidebarNavDropData>(
  Symbol('sidebar-nav-drop-target'),
);
export type SidebarNavDropTargetData = ReturnType<
  typeof SidebarNavDrop.getData
>;
export const getSidebarNavDropTargetData = SidebarNavDrop.getData;
export const isSidebarNavDropTargetData = SidebarNavDrop.is;

// Sidebar area drop target (accepts tasks to move into area without project)
type SidebarAreaDropData = { areaId: string };

const SidebarAreaDrop = createDraggable<SidebarAreaDropData>(
  Symbol('sidebar-area-drop-target'),
);
export type SidebarAreaDropTargetData = ReturnType<
  typeof SidebarAreaDrop.getData
>;
export const getSidebarAreaDropTargetData = SidebarAreaDrop.getData;
export const isSidebarAreaDropTargetData = SidebarAreaDrop.is;

// =============================================================================
// Utility functions
// =============================================================================

export function isShallowEqual(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;
  return keys1.every((key) => Object.is(obj1[key], obj2[key]));
}

// =============================================================================
// Lazy-loaded DnD modules
// =============================================================================

export type Edge = 'top' | 'bottom' | 'left' | 'right';

export type CleanupFn = () => void;

/* eslint-disable @typescript-eslint/no-explicit-any */
export type DndModules = {
  combine: (...cleanups: CleanupFn[]) => CleanupFn;
  draggable: (opts: any) => CleanupFn;
  dropTargetForElements: (opts: any) => CleanupFn;
  monitorForElements: (opts: any) => CleanupFn;
  autoScrollForElements: (opts: any) => CleanupFn;
  preserveOffsetOnSource: (opts: any) => any;
  setCustomNativeDragPreview: (opts: any) => void;
  attachClosestEdge: (data: any, opts: any) => any;
  extractClosestEdge: (data: any) => Edge | null;
  reorderWithEdge: (opts: any) => any[];
};
/* eslint-enable @typescript-eslint/no-explicit-any */

let dndPromise: Promise<DndModules> | null = null;

export function loadDnd(): Promise<DndModules> {
  if (dndPromise) return dndPromise;

  dndPromise = Promise.all([
    import('@atlaskit/pragmatic-drag-and-drop/combine'),
    import('@atlaskit/pragmatic-drag-and-drop/element/adapter'),
    import(
      '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source'
    ),
    import(
      '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview'
    ),
    import('@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'),
    import('@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge'),
    import('@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'),
  ]).then(
    ([
      combineMod,
      adapterMod,
      preserveMod,
      previewMod,
      hitboxMod,
      reorderMod,
      autoScrollMod,
    ]) =>
      ({
        combine: combineMod.combine,
        draggable: adapterMod.draggable,
        dropTargetForElements: adapterMod.dropTargetForElements,
        monitorForElements: adapterMod.monitorForElements,
        autoScrollForElements: autoScrollMod.autoScrollForElements,
        preserveOffsetOnSource: preserveMod.preserveOffsetOnSource,
        setCustomNativeDragPreview: previewMod.setCustomNativeDragPreview,
        attachClosestEdge: hitboxMod.attachClosestEdge,
        extractClosestEdge: hitboxMod.extractClosestEdge,
        reorderWithEdge: reorderMod.reorderWithEdge,
      }) as DndModules,
  );

  return dndPromise;
}
