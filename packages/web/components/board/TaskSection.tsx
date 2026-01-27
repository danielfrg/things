type DragLocationHistory = {
  current: {
    dropTargets: Array<{ data: Record<string | symbol, unknown> }>;
  };
};

import {
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import invariant from 'tiny-invariant';
import {
  BoxIcon,
  EveningIcon,
  MoreHorizontalIcon,
  SomedayIcon,
  Trash2Icon,
} from '@/components/icons';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskShadow } from '@/components/tasks/TaskRow';
import { Button } from '@/components/ui/button';
import {
  createDropdownController,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import type {
  AreaRecord,
  ChecklistItemRecord,
  ProjectRecord,
  TagRecord,
  TaskRecord,
} from '@/db/validation';
import {
  isDraggingATask,
  isShallowEqual,
  isTaskDragData,
  isTaskDropTargetData,
  loadDnd,
  type TaskDragData,
} from '@/lib/dnd';
import { getSectionData, type TSection } from './data';

type TSectionState =
  | {
      type: 'is-task-over';
      isOverChildTask: boolean;
      dragging: DOMRect;
    }
  | {
      type: 'idle';
    };

const idle = { type: 'idle' } satisfies TSectionState;

interface TaskListProps {
  section: TSection;
  onComplete: (taskId: string, completed: boolean) => void;
  onSelect: (taskId: string | null) => void;
  onExpand: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<TaskRecord>) => void;
  onDelete: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  onProjectChange: (
    taskId: string,
    projectId: string | null,
    areaId?: string | null,
  ) => void;
  onTagAdd: (taskId: string, tagId: string) => void;
  onTagRemove: (taskId: string, tagId: string) => void;
  selectedTaskId: string | null;
  expandedTaskId: string | null;
  scheduleDatePickerTaskId?: string | null;
  onScheduleDatePickerClose?: () => void;
  projects: ProjectRecord[];
  areas: AreaRecord[];
  checklistItems: ChecklistItemRecord[];
  tags: TagRecord[];
  hideToday?: boolean;
  showTodayStar?: boolean;
  isTrash?: boolean;
}

const TaskList = memo(function TaskList({
  section,
  onComplete,
  onSelect,
  onExpand,
  onUpdate,
  onDelete,
  onRestore,
  onProjectChange,
  onTagAdd,
  onTagRemove,
  selectedTaskId,
  expandedTaskId,
  scheduleDatePickerTaskId,
  onScheduleDatePickerClose,
  projects,
  areas,
  checklistItems,
  tags,
  hideToday,
  showTodayStar,
  isTrash,
}: TaskListProps) {
  return section.tasks.map((task) => {
    const taskChecklistItems = checklistItems.filter(
      (item) => item.taskId === task.id,
    );
    const taskTagIds = task.tags?.map((t: TagRecord) => t.id) ?? [];
    const taskTags = tags.filter((tag) => taskTagIds.includes(tag.id));

    return (
      <TaskCard
        key={task.id}
        task={task}
        expanded={task.id === expandedTaskId}
        selected={task.id === selectedTaskId}
        scheduleDatePickerOpen={task.id === scheduleDatePickerTaskId}
        onScheduleDatePickerClose={onScheduleDatePickerClose}
        onSelect={onSelect}
        onExpand={onExpand}
        onComplete={onComplete}
        checklistItems={taskChecklistItems}
        tags={taskTags}
        allTags={tags}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onRestore={onRestore}
        onProjectChange={onProjectChange}
        onTagAdd={onTagAdd}
        onTagRemove={onTagRemove}
        projects={projects}
        areas={areas}
        headingId={section.headingId}
        projectId={section.projectId}
        isEvening={section.isEvening}
        showProjectInfo={section.isEvening}
        hideToday={hideToday}
        showTodayStar={showTodayStar}
        isTrash={isTrash}
      />
    );
  });
});

interface TaskSectionProps {
  section: TSection;
  onComplete: (taskId: string, completed: boolean) => void;
  onSelect: (taskId: string | null) => void;
  onExpand: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<TaskRecord>) => void;
  onDelete: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  onProjectChange: (
    taskId: string,
    projectId: string | null,
    areaId?: string | null,
  ) => void;
  onTagAdd: (taskId: string, tagId: string) => void;
  onTagRemove: (taskId: string, tagId: string) => void;
  selectedTaskId: string | null;
  expandedTaskId: string | null;
  scheduleDatePickerTaskId?: string | null;
  onScheduleDatePickerClose?: () => void;
  projects: ProjectRecord[];
  areas: AreaRecord[];
  checklistItems: ChecklistItemRecord[];
  tags: TagRecord[];
  hideToday?: boolean;
  showTodayStar?: boolean;
  isTrash?: boolean;
  /** Callback for editing heading title (only for heading sections) */
  onHeadingEdit?: (headingId: string, title: string) => void;
  /** Callback for deleting a heading */
  onHeadingDelete?: (headingId: string) => void;
}

export function TaskSection({
  section,
  onComplete,
  onSelect,
  onExpand,
  onUpdate,
  onDelete,
  onRestore,
  onProjectChange,
  onTagAdd,
  onTagRemove,
  selectedTaskId,
  expandedTaskId,
  scheduleDatePickerTaskId,
  onScheduleDatePickerClose,
  projects,
  areas,
  checklistItems,
  tags,
  hideToday,
  showTodayStar,
  isTrash,
  onHeadingEdit,
  onHeadingDelete,
}: TaskSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TSectionState>(idle);
  const [editValue, setEditValue] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menu = createDropdownController();

  // Sync edit value when section title changes
  useEffect(() => {
    setEditValue(section.title);
  }, [section.title]);

  useEffect(() => {
    const container = containerRef.current;
    invariant(container);

    const data = getSectionData({ section });

    function setIsTaskOver({
      data,
      location,
    }: {
      data: TaskDragData;
      location: DragLocationHistory;
    }) {
      const innerMost = location.current.dropTargets[0];
      const isOverChildTask = Boolean(
        innerMost && isTaskDropTargetData(innerMost.data),
      );

      const proposed: TSectionState = {
        type: 'is-task-over',
        dragging: data.rect,
        isOverChildTask,
      };
      setState((current) => {
        if (
          isShallowEqual(
            proposed as unknown as Record<string, unknown>,
            current as unknown as Record<string, unknown>,
          )
        ) {
          return current;
        }
        return proposed;
      });
    }

    let cleanup: (() => void) | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.combine(
        dnd.dropTargetForElements({
          element: container,
          getData: () => data,
          canDrop({
            source,
          }: {
            source: { data: Record<string | symbol, unknown> };
          }) {
            return isDraggingATask({ source });
          },
          getIsSticky: () => true,
          onDragStart({
            source,
            location,
          }: {
            source: { data: Record<string | symbol, unknown> };
            location: DragLocationHistory;
          }) {
            if (isTaskDragData(source.data)) {
              setIsTaskOver({ data: source.data, location });
            }
          },
          onDragEnter({
            source,
            location,
          }: {
            source: { data: Record<string | symbol, unknown> };
            location: DragLocationHistory;
          }) {
            if (isTaskDragData(source.data)) {
              setIsTaskOver({ data: source.data, location });
            }
          },
          onDropTargetChange({
            source,
            location,
          }: {
            source: { data: Record<string | symbol, unknown> };
            location: DragLocationHistory;
          }) {
            if (isTaskDragData(source.data)) {
              setIsTaskOver({ data: source.data, location });
            }
          },
          onDragLeave() {
            setState(idle);
          },
          onDrop() {
            setState(idle);
          },
        }),
      );
    });

    return () => cleanup?.();
  }, [section.id, section.projectId, section.headingId, section.isEvening]);

  // Calculate project progress for project sections
  const getProjectProgress = useCallback(() => {
    if (!section.projectId) return 0;
    const project = projects.find((p) => p.id === section.projectId);
    if (!project) return 0;
    // For now, just return 0 - would need all project tasks to calculate
    return 0;
  }, [section.projectId, projects]);

  // Render section header icon based on type
  const renderIcon = () => {
    if (section.isEvening) {
      return <EveningIcon className="w-4 h-4" />;
    }
    if (section.projectId) {
      return (
        <ProjectProgressIcon
          progress={getProjectProgress()}
          size={16}
          className="text-things-blue"
        />
      );
    }
    if (section.areaId) {
      return <BoxIcon className="w-4 h-4 text-things-green" />;
    }
    return null;
  };

  // Don't show header for "No Project" section, "unheaded" section, or completed
  const showHeader =
    section.id !== 'section:no-project' &&
    section.id !== 'section:unheaded' &&
    !section.isCompleted &&
    section.title !== '';

  // Is this an editable heading section?
  const isEditableHeading =
    section.headingId && onHeadingEdit && onHeadingDelete;

  // Backlog heading can be edited but not deleted
  const canDeleteHeading = isEditableHeading && !section.isBacklog;

  const handleHeadingBlur = () => {
    if (!section.headingId || !onHeadingEdit) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== section.title) {
      onHeadingEdit(section.headingId, trimmed);
    } else {
      setEditValue(section.title);
    }
  };

  const handleHeadingKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditValue(section.title);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="mb-6" ref={containerRef}>
      {/* Editable Heading Section Header */}
      {showHeader && isEditableHeading && (
        <div className="space-y-2 group mb-2 px-4 md:px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="w-[18px] shrink-0 flex items-center justify-center">
                {section.isBacklog && <SomedayIcon className="w-4 h-4" />}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.currentTarget.value)}
                onBlur={handleHeadingBlur}
                onKeyDown={handleHeadingKeyDown}
                className="flex-1 bg-transparent text-lg md:text-[15px] font-semibold text-things-blue outline-none border-0 p-0"
              />
            </div>
            {canDeleteHeading && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground/70 opacity-0 group-hover:opacity-100"
                  onClick={(e) => menu.toggleFromEvent(e)}
                >
                  <MoreHorizontalIcon className="w-4 h-4" />
                </Button>
                <DropdownMenuContent
                  open={menu.open}
                  onClose={menu.close}
                  anchorRect={menu.anchorRect}
                  align="end"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      if (section.headingId && onHeadingDelete) {
                        onHeadingDelete(section.headingId);
                      }
                      menu.close();
                    }}
                    className="text-destructive"
                  >
                    <Trash2Icon className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </div>
            )}
          </div>
          <div className="border-b border-border" />
        </div>
      )}

      {/* Regular Section Header */}
      {showHeader && !isEditableHeading && (
        <div className="pb-2 mb-2 border-b border-border px-4 md:px-8">
          <h2 className="text-lg md:text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-[18px] flex items-center justify-center shrink-0">
              {renderIcon()}
            </span>
            <span>{section.title}</span>
          </h2>
        </div>
      )}

      {/* Completed section header */}
      {section.isCompleted && (
        <div className="pb-2 mb-2 border-b border-border px-4 md:px-2">
          <h2 className="text-lg md:text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-[18px] shrink-0" />
            <span>{section.title}</span>
          </h2>
        </div>
      )}

      {/* Tasks */}
      <div className="flex flex-col">
        <TaskList
          section={section}
          onComplete={onComplete}
          onSelect={onSelect}
          onExpand={onExpand}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onRestore={onRestore}
          onProjectChange={onProjectChange}
          onTagAdd={onTagAdd}
          onTagRemove={onTagRemove}
          selectedTaskId={selectedTaskId}
          expandedTaskId={expandedTaskId}
          scheduleDatePickerTaskId={scheduleDatePickerTaskId}
          onScheduleDatePickerClose={onScheduleDatePickerClose}
          projects={projects}
          areas={areas}
          checklistItems={checklistItems}
          tags={tags}
          hideToday={hideToday}
          showTodayStar={showTodayStar}
          isTrash={isTrash}
        />

        {/* Show shadow at bottom when dragging over empty area */}
        {state.type === 'is-task-over' && !state.isOverChildTask ? (
          <TaskShadow dragging={state.dragging} />
        ) : null}

        {/* Empty state */}
        {section.tasks.length === 0 && state.type === 'idle' && (
          <div className="mx-4 md:mx-0 rounded-lg border-2 border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No tasks yet
          </div>
        )}
      </div>
    </div>
  );
}
