import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import {
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  BoxIcon,
  EveningIcon,
  MoreHorizontalIcon,
  SomedayIcon,
  Trash2Icon,
} from '@/components/icons';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskShadow } from '@/components/tasks/TaskRow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import type {
  AreaRecord,
  ChecklistItemRecord,
  ProjectRecord,
  TagRecord,
  TaskRecord,
  TaskTagRecord,
} from '@/db/validation';
import {
  isDraggingATask,
  isTaskDragData,
  isTaskDropTargetData,
} from '@/lib/dnd';
import {
  type SectionDropTargetState,
  sectionDropTargetIdle,
  useSectionDropTarget,
} from '@/lib/hooks/useDnd';
import { cn } from '@/lib/utils';
import { getSectionData, type TSection } from './data';

type TSectionState = SectionDropTargetState;

const idle = sectionDropTargetIdle;

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
  taskTags?: TaskTagRecord[];
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
  taskTags: taskTagsData,
  hideToday,
  showTodayStar,
  isTrash,
}: TaskListProps) {
  return section.tasks.map((task) => {
    const taskChecklistItems = checklistItems.filter(
      (item) => item.taskId === task.id,
    );
    // Use taskTagsData (from useTaskTags hook) if available for reactivity,
    // otherwise fall back to embedded task.tags
    const taskTagIds = taskTagsData
      ? taskTagsData.filter((tt) => tt.taskId === task.id).map((tt) => tt.tagId)
      : (task.tags?.map((t: TagRecord) => t.id) ?? []);
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
  taskTags?: TaskTagRecord[];
  hideToday?: boolean;
  showTodayStar?: boolean;
  isTrash?: boolean;
  /** Callback for editing heading title (only for heading sections) */
  onHeadingEdit?: (headingId: string, title: string) => void;
  /** Callback for deleting a heading */
  onHeadingDelete?: (headingId: string) => void;
  /** Show project link button on hover for project sections */
  showProjectLink?: boolean;
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
  taskTags,
  hideToday,
  showTodayStar,
  isTrash,
  onHeadingEdit,
  onHeadingDelete,
  showProjectLink,
}: TaskSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TSectionState>(idle);
  const [editValue, setEditValue] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync edit value when section title changes
  useEffect(() => {
    setEditValue(section.title);
  }, [section.title]);

  useSectionDropTarget(
    {
      ref: containerRef,
      getData: () => getSectionData({ section }),
      canDrop: isDraggingATask,
      isTaskDragData: (data): data is typeof data & { rect: DOMRect } =>
        isTaskDragData(data),
      isTaskDropTargetData,
      setState,
    },
    [section.id, section.projectId, section.headingId, section.isEvening],
  );

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
    if (section.isBacklog) {
      return <SomedayIcon className="w-4 h-4" />;
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
        <div className="group mb-2 px-4 md:px-2">
          <div className="flex items-center gap-2">
            <span className="w-[18px] shrink-0" />
            <div className="flex items-center gap-2 flex-1 border-b border-section-border pb-2">
              {section.isBacklog && (
                <SomedayIcon className="w-4 h-4 shrink-0" />
              )}
              <Input
                ref={inputRef}
                variant="ghost"
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.currentTarget.value)}
                onBlur={handleHeadingBlur}
                onKeyDown={handleHeadingKeyDown}
                className="flex-1 text-lg md:text-[15px] font-bold text-things-blue"
              />
              {canDeleteHeading && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1 rounded-md text-muted-foreground hover:text-foreground/70 opacity-0 group-hover:opacity-100 hover:bg-accent transition-colors">
                    <MoreHorizontalIcon className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        if (section.headingId && onHeadingDelete) {
                          onHeadingDelete(section.headingId);
                        }
                      }}
                    >
                      <Trash2Icon className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Regular Section Header */}
      {showHeader && !isEditableHeading && (
        <div className="mb-2 px-4 md:px-2">
          <div className="flex items-center gap-2">
            <span className="w-[18px] shrink-0" />
            <div className="text-lg md:text-base font-bold pb-2 flex-1 border-b border-section-border flex items-center gap-2">
              {showProjectLink && section.projectId ? (
                <Link
                  to="/project/$projectId"
                  params={{ projectId: section.projectId }}
                  className="group flex items-center gap-2 text-foreground hover:text-things-blue transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="w-[18px] flex items-center justify-center shrink-0">
                    {renderIcon()}
                  </span>
                  <span>{section.title}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ) : showProjectLink && section.areaId && !section.projectId ? (
                <Link
                  to="/area/$areaId"
                  params={{ areaId: section.areaId }}
                  className="group flex items-center gap-2 text-foreground hover:text-things-blue transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="w-[18px] flex items-center justify-center shrink-0">
                    {renderIcon()}
                  </span>
                  <span>{section.title}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-2',
                    section.isBacklog ? 'text-things-blue' : 'text-foreground',
                  )}
                >
                  <span className="w-[18px] flex items-center justify-center shrink-0">
                    {renderIcon()}
                  </span>
                  <span>{section.title}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed section header */}
      {section.isCompleted && (
        <div className="mb-2 px-4 md:px-2">
          <div className="flex items-center gap-2">
            <span className="w-[18px] shrink-0" />
            <h2 className="text-lg md:text-base font-bold text-foreground pb-2 flex-1 border-b border-section-border">
              {section.title}
            </h2>
          </div>
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
          taskTags={taskTags}
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
          <div className="flex items-center gap-2 px-4 md:px-2">
            <span className="w-[18px] shrink-0" />
            <div className="flex-1 rounded border border-dashed border-border py-2 text-center text-sm text-muted-foreground">
              No tasks
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
