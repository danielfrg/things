import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  EveningIcon,
  FlagIcon,
  InfoIcon,
  ListChecksIcon,
  RepeatIcon,
  RestoreIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import { DatePicker } from '@/components/ui/date-picker';
import { MovePicker } from '@/components/ui/move-picker';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { ProseEditor } from '@/components/ui/prose-editor';
import { RepeatPicker } from '@/components/ui/repeat-picker';
import { TagPicker } from '@/components/ui/tag-picker';
import {
  ToolbarButton,
  toolbarButtonVariants,
} from '@/components/ui/toolbar-button';
import { generateId } from '@/db/schema';
import type {
  AreaRecord,
  ChecklistItemRecord,
  ProjectRecord,
  TagRecord,
  TaskRecord,
} from '@/db/validation';
import {
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useDeleteRepeatingRule,
  useRepeatingRules,
} from '@/lib/contexts/DataContext';
import { useDetailCard } from '@/lib/hooks/useDetailCard';
import { usePendingTaskChanges } from '@/lib/hooks/usePendingTaskChanges';
import { useTaskCardDnd } from '@/lib/hooks/useTaskCardDnd';
import { useTaskEditorForm } from '@/lib/hooks/useTaskEditorForm';
import { createRepeatingRuleFromTaskFn } from '@/lib/server/repeatingRules';
import { cn } from '@/lib/utils';
import type { TaskWithRelations } from '@/types';
import { ChecklistEditor } from './ChecklistEditor';
import { ItemDetailLayout } from './ItemDetailLayout';
import { TaskCheckbox } from './TaskCheckbox';
import { TaskMetadata } from './TaskMetadata';
import { TaskProjectBadge } from './TaskProjectBadge';
import { TaskShadow } from './TaskRow';
import { TaskTitle } from './TaskTitle';
import { formatTaskDate } from './taskUtils';

interface TaskCardProps {
  task: TaskWithRelations;
  expanded: boolean;
  selected: boolean;
  scheduleDatePickerOpen?: boolean;
  onScheduleDatePickerClose?: () => void;
  onSelect: (taskId: string, event: React.MouseEvent) => void;
  onExpand: (taskId: string) => void;
  onComplete: (taskId: string, completed: boolean) => void;
  checklistItems: ChecklistItemRecord[];
  tags: TagRecord[];
  allTags?: TagRecord[];
  onUpdate: (taskId: string, updates: Partial<TaskRecord>) => void;
  onDelete: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  onProjectChange?: (
    taskId: string,
    projectId: string | null,
    areaId?: string | null,
  ) => void;
  onRepeatChange?: (
    taskId: string,
    rrule: string | undefined,
    startDate: string,
  ) => void;
  onRepeatClear?: (taskId: string) => void;
  onTagAdd?: (taskId: string, tagId: string) => void;
  onTagRemove?: (taskId: string, tagId: string) => void;
  projects?: ProjectRecord[];
  areas?: AreaRecord[];
  repeatingRuleId?: string | null;
  isTrash?: boolean;
  hideToday?: boolean;
  hideScheduledDate?: boolean;
  showDayBadge?: boolean;
  showTodayStar?: boolean;
  showProjectInfo?: boolean;
  groupDate?: string;
  headingId?: string;
  projectId?: string;
  isEvening?: boolean;
}

export function TaskCard({
  task,
  expanded,
  selected,
  scheduleDatePickerOpen,
  onScheduleDatePickerClose,
  onSelect,
  onExpand,
  onComplete,
  checklistItems,
  tags,
  allTags,
  onUpdate,
  onDelete,
  onRestore,
  onProjectChange,
  onRepeatChange,
  onRepeatClear,
  onTagAdd,
  onTagRemove,
  projects,
  areas,
  repeatingRuleId,
  isTrash,
  hideToday,
  hideScheduledDate,
  showTodayStar,
  showProjectInfo,
  groupDate,
  headingId,
  projectId,
  isEvening,
}: TaskCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { dragState } = useTaskCardDnd({
    task,
    outerRef,
    headerRef,
    expanded,
    groupDate,
    headingId,
    projectId,
    isEvening,
  });

  const isCompleted = task.status === 'completed';
  const isSomeday = task.status === 'someday';

  // Pending changes - accumulated and committed on close
  // commitOnUnmount ensures changes are saved if window closes while task is expanded
  const { pending, addChange, commit, reset } = usePendingTaskChanges(
    task.id,
    (taskId, changes) => {
      // Handle project change separately if needed
      if (onProjectChange && ('projectId' in changes || 'areaId' in changes)) {
        const projId =
          'projectId' in changes ? changes.projectId : task.projectId;
        const areaVal = 'areaId' in changes ? changes.areaId : task.areaId;
        // Remove project/area from changes since we handle them separately
        const { projectId: _p, areaId: _a, headingId: _h, ...rest } = changes;
        if (Object.keys(rest).length > 0) {
          onUpdate(taskId, rest);
        }
        onProjectChange(taskId, projId ?? null, areaVal);
      } else {
        onUpdate(taskId, changes);
      }
    },
    true, // commitOnUnmount - save changes if window closes while expanded
  );

  // Create a merged view of task with pending changes for display
  const pendingTask = useMemo(
    () => ({
      ...task,
      ...pending,
    }),
    [task, pending],
  );

  const { showInfo, setShowInfo, handleClose } = useDetailCard({
    id: task.id,
    expanded,
    onExpand,
    cardRef,
    dataAttribute: 'data-task-detail-card',
  });

  // Commit pending changes when task collapses (expanded changes from true to false)
  const wasExpandedForCommitRef = useRef(expanded);
  useEffect(() => {
    const wasExpanded = wasExpandedForCommitRef.current;
    wasExpandedForCommitRef.current = expanded;

    // Commit when transitioning from expanded to collapsed
    if (wasExpanded && !expanded) {
      commit();
    }
  }, [expanded, commit]);

  // Reset pending changes when switching to a different task
  const prevTaskIdRef = useRef(task.id);
  useEffect(() => {
    if (prevTaskIdRef.current !== task.id) {
      prevTaskIdRef.current = task.id;
      reset();
    }
  }, [task.id, reset]);

  const form = useTaskEditorForm({
    initialTitle: task.title,
    initialNotes: task.notes ?? '',
    onTitleChange: (title) => onUpdate(task.id, { title }),
    onNotesChange: (notes) => onUpdate(task.id, { notes }),
    onClose: handleClose,
  });

  // Focus title input when expanded
  useEffect(() => {
    if (expanded) {
      form.focusTitle();
    }
  }, [expanded, form.focusTitle]);

  // Resize notes when expanded
  useEffect(() => {
    if (expanded) {
      form.resizeNotes();
    }
  }, [expanded, form.notes, form.resizeNotes]);

  const repeatingRulesResource = useRepeatingRules();
  const deleteRepeatingRule = useDeleteRepeatingRule();
  const deleteChecklistItem = useDeleteChecklistItem();
  const createChecklistItem = useCreateChecklistItem();
  const repeatingRules = useMemo(
    () => repeatingRulesResource.data,
    [repeatingRulesResource.data],
  );

  // Clean up empty last checklist item when collapsing
  const wasExpandedRef = useRef(expanded);
  useEffect(() => {
    const wasExpanded = wasExpandedRef.current;
    wasExpandedRef.current = expanded;

    // Only run cleanup when transitioning from expanded to collapsed
    if (wasExpanded && !expanded && checklistItems.length > 0) {
      const last = checklistItems[checklistItems.length - 1];
      if (last && !last.title.trim()) {
        deleteChecklistItem.mutate(last.id);
      }
    }
  }, [expanded, checklistItems, deleteChecklistItem]);

  const ruleId = repeatingRuleId ?? task.repeatingRuleId ?? null;

  const rule = useMemo(() => {
    if (!ruleId) return null;
    if (!repeatingRules) return null;
    return repeatingRules.find((r) => r.id === ruleId) ?? null;
  }, [ruleId, repeatingRules]);

  const handleScheduledDateChange = useCallback(
    (date: string | undefined, isEveningValue?: boolean) => {
      addChange({
        scheduledDate: date ?? null,
        status: date ? 'scheduled' : 'anytime',
        isEvening: isEveningValue ?? false,
      });
    },
    [addChange],
  );

  const handleSomedaySelect = useCallback(() => {
    addChange({
      scheduledDate: null,
      status: 'someday',
      isEvening: false,
    });
  }, [addChange]);

  // Immediate date change for hotkey picker (ctrl+s when collapsed)
  const handleHotkeyDateChange = useCallback(
    (date: string | undefined, isEveningValue?: boolean) => {
      onUpdate(task.id, {
        scheduledDate: date ?? null,
        status: date ? 'scheduled' : 'anytime',
        isEvening: isEveningValue ?? false,
      });
      onScheduleDatePickerClose?.();
    },
    [onUpdate, task.id, onScheduleDatePickerClose],
  );

  const handleHotkeySomedaySelect = useCallback(() => {
    onUpdate(task.id, {
      scheduledDate: null,
      status: 'someday',
      isEvening: false,
    });
    onScheduleDatePickerClose?.();
  }, [onUpdate, task.id, onScheduleDatePickerClose]);

  const handleDeadlineChange = useCallback(
    (date: string | undefined) => {
      addChange({
        deadline: date ?? null,
      });
    },
    [addChange],
  );

  const handleAddChecklist = useCallback(() => {
    createChecklistItem.mutate({
      id: generateId(),
      taskId: task.id,
      title: '',
      completed: false,
      position: 1,
    });
  }, [task.id, createChecklistItem]);

  const handleTagAdd = useCallback(
    (tagId: string) => {
      if (onTagAdd) onTagAdd(task.id, tagId);
    },
    [task.id, onTagAdd],
  );

  const handleTagRemove = useCallback(
    (tagId: string) => {
      if (onTagRemove) onTagRemove(task.id, tagId);
    },
    [task.id, onTagRemove],
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if ((e.target as HTMLElement).closest('textarea')) return;
    if ((e.target as HTMLElement).closest('.prose-editor')) return;
    onExpand(task.id);
  };

  const headerContent = (
    <div
      ref={headerRef}
      role="button"
      tabIndex={0}
      className={cn(
        'flex items-center gap-2 px-4 pb-2 transition-all duration-300 ease-in-out md:rounded-md overflow-hidden',
        expanded ? 'pt-4' : 'py-3 md:py-2 md:cursor-grab',
        !expanded && selected && 'bg-task-selected',
        !expanded && !selected && 'hover:bg-secondary/50',
      )}
      onMouseDown={(e) => {
        // Use mousedown for more reliable modifier key detection
        if (!expanded && e.button === 0) {
          onSelect(task.id, e);
        }
      }}
      onKeyDown={(e) => {
        if (!expanded && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(task.id, e as unknown as React.MouseEvent);
        }
      }}
    >
      <TaskCheckbox
        checked={isCompleted}
        onChange={(checked) => onComplete(task.id, checked)}
        dashed={isSomeday}
      />

      {/* Today star or Evening moon - shown when collapsed and task is scheduled for today */}
      {!expanded &&
        showTodayStar &&
        formatTaskDate(task.scheduledDate) === 'Today' &&
        !isCompleted &&
        (task.isEvening ? (
          <EveningIcon className="w-3.5 h-3.5 shrink-0 text-things-evening" />
        ) : (
          <StarIcon
            className="w-3.5 h-3.5 shrink-0 text-things-yellow"
            fill="currentColor"
          />
        ))}

      {expanded ? (
        <TaskTitle
          inputRef={form.titleRef}
          value={form.title}
          onChange={form.setTitle}
          onBlur={form.handleTitleBlur}
          onKeyDown={form.handleTitleKeyDown}
          onClick={(e) => e.stopPropagation()}
          status={isCompleted ? 'completed' : 'default'}
          editable
          placeholder="Task title"
          className="flex-1"
        />
      ) : (
        <div className="flex-1 min-w-0">
          <TaskTitle
            value={form.title}
            status={isCompleted ? 'completed' : 'default'}
          />
          {showProjectInfo && (
            <TaskProjectBadge
              projectId={task.projectId}
              areaId={task.areaId}
              projects={projects}
              areas={areas}
            />
          )}
        </div>
      )}

      {/* Metadata indicators - only shown when collapsed */}
      {!isCompleted && !expanded && (
        <TaskMetadata
          scheduledDate={task.scheduledDate}
          deadline={task.deadline}
          notes={task.notes}
          repeatingRuleId={task.repeatingRuleId}
          tags={tags}
          checklistItems={checklistItems}
          hideToday={hideToday}
          hideScheduledDate={hideScheduledDate}
          showTodayStar={showTodayStar}
        />
      )}
    </div>
  );

  const toolbarContent = (
    <>
      {/* Restore (trash only) */}
      {isTrash && onRestore && (
        <ToolbarButton
          onClick={() => {
            onRestore(task.id);
            handleClose();
          }}
          icon={<RestoreIcon className="w-3.5 h-3.5" />}
          className="text-things-blue hover:text-things-blue"
        >
          Restore
        </ToolbarButton>
      )}

      {/* Schedule picker */}
      {!isCompleted && (
        <DatePicker
          value={pendingTask.scheduledDate ?? undefined}
          onChange={handleScheduledDateChange}
          placeholder="When"
          disabled={isCompleted}
          showSomeday
          onSomedaySelect={handleSomedaySelect}
          isSomeday={pendingTask.status === 'someday'}
          showEvening
          isEvening={pendingTask.isEvening}
          className={toolbarButtonVariants()}
        />
      )}

      {/* Deadline picker */}
      {!isCompleted && (
        <DatePicker
          value={pendingTask.deadline ?? undefined}
          onChange={handleDeadlineChange}
          placeholder="Deadline"
          disabled={isCompleted}
          className={toolbarButtonVariants()}
          icon={<FlagIcon className="h-3.5 w-3.5 opacity-70" />}
          title="Deadline"
        />
      )}

      {/* Repeat picker */}
      {!ruleId && !isCompleted && (
        <RepeatPicker
          value={rule?.rrule}
          startDate={
            rule?.nextOccurrence ?? pendingTask.scheduledDate ?? undefined
          }
          onChange={(rrule, startDate) => {
            if (onRepeatChange) {
              onRepeatChange(task.id, rrule, startDate);
              return;
            }
            if (!rrule) return;
            void (async () => {
              await createRepeatingRuleFromTaskFn({
                data: { taskId: task.id, rrule, startDate },
              });
              handleClose();
              repeatingRulesResource.refetch();
            })();
          }}
          onClear={() => {
            if (onRepeatClear) {
              onRepeatClear(task.id);
              return;
            }
            if (!ruleId) return;
            deleteRepeatingRule.mutate(ruleId);
            onUpdate(task.id, { repeatingRuleId: null });
          }}
          placeholder="Repeat"
          disabled={isCompleted}
          className={toolbarButtonVariants()}
        />
      )}

      {/* Move picker */}
      {(projects?.length ?? 0) > 0 && !isCompleted && (
        <MovePicker
          value={pendingTask.projectId}
          areaValue={pendingTask.areaId}
          onChange={(projId: string | null, areaVal?: string | null) => {
            addChange({
              projectId: projId,
              areaId: areaVal ?? null,
              headingId: null,
            });
          }}
          projects={projects ?? []}
          areas={areas}
          placeholder="Move"
          disabled={isCompleted}
          className={toolbarButtonVariants()}
          isInbox={pendingTask.status === 'inbox'}
        />
      )}

      {/* Add checklist button - only show if no checklist items exist */}
      {!isCompleted && checklistItems.length === 0 && (
        <ToolbarButton
          onClick={handleAddChecklist}
          icon={<ListChecksIcon className="h-3.5 w-3.5 opacity-70" />}
        >
          Checklist
        </ToolbarButton>
      )}

      {/* Tags picker */}
      {allTags && onTagAdd && onTagRemove && !isCompleted && (
        <TagPicker
          selectedTagIds={tags.map((t) => t.id)}
          tags={allTags}
          onAdd={handleTagAdd}
          onRemove={handleTagRemove}
          disabled={isCompleted}
        />
      )}
    </>
  );

  const footerContent = (
    <>
      {/* Repeating indicator */}
      {ruleId && (
        <div
          title="Repeating"
          className="flex items-center justify-center h-6 w-6 rounded text-border hover:text-muted-foreground hover:bg-secondary transition-colors"
        >
          <RepeatIcon className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Info button */}
      <div className="relative flex items-center">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(!showInfo);
          }}
          className="text-border hover:text-muted-foreground hover:bg-secondary"
        >
          <InfoIcon className="w-3.5 h-3.5" />
        </Button>

        {/* Info popover */}
        {showInfo && (
          <div
            role="dialog"
            className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-popover rounded-lg shadow-lg border border-border text-[12px] z-50"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5 text-foreground/80">
              <div>
                <span className="text-muted-foreground">Created:</span>{' '}
                {format(task.createdAt, 'PPP p')}
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>{' '}
                {format(task.updatedAt, 'PPP p')}
              </div>
              <div className="pt-1.5 border-t border-border">
                <span className="text-muted-foreground">ID:</span>{' '}
                <code className="text-[9px] bg-secondary px-1 py-0.5 rounded select-all">
                  {task.id}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          onDelete(task.id);
          handleClose();
        }}
        className="text-hint hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2Icon className="w-3.5 h-3.5" />
      </Button>
    </>
  );

  return (
    <>
      <ItemDetailLayout
        expanded={expanded}
        cardRef={cardRef}
        outerRef={outerRef}
        dataAttribute="data-task-detail-card"
        outerClassName={cn(
          dragState.type === 'dragging-left-self' && 'hidden',
          dragState.type === 'dragging' && 'opacity-40',
        )}
        onDoubleClick={handleDoubleClick}
        header={headerContent}
        toolbar={toolbarContent}
        footer={footerContent}
        beforeCard={
          dragState.type === 'over' &&
          dragState.edge === 'top' && (
            <TaskShadow dragging={dragState.dragging} />
          )
        }
        afterCard={
          dragState.type === 'over' &&
          dragState.edge === 'bottom' && (
            <TaskShadow dragging={dragState.dragging} />
          )
        }
      >
        {/* Notes */}
        <div className="relative min-h-[26px]">
          <ProseEditor
            value={form.notes}
            onChange={form.setNotes}
            onBlur={form.handleNotesBlur}
            placeholder="Notes"
            disabled={isCompleted}
            isEditing={form.isEditingNotes}
            onStartEditing={() => !isCompleted && form.setIsEditingNotes(true)}
            className={cn(isCompleted && 'text-muted-foreground')}
          />
        </div>

        {/* Checklist Section */}
        {(checklistItems.length > 0 || !isCompleted) && (
          <ChecklistEditor
            taskId={task.id}
            items={checklistItems}
            variant="inline"
            disabled={isCompleted}
          />
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mx-1 m-0 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] bg-[#c8e2d6] text-[#1e7d58]"
              >
                {tag.title}
                {!isCompleted && (
                  <button
                    type="button"
                    className="hover:bg-[#1e7d58]/10 rounded-full p-0.5"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagRemove(tag.id);
                    }}
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </ItemDetailLayout>

      {/* Floating date picker - shown below task when CTRL+S is pressed */}
      <Popover
        open={!expanded && scheduleDatePickerOpen}
        onOpenChange={(open) => !open && onScheduleDatePickerClose?.()}
      >
        <PopoverContent
          anchor={cardRef}
          align="start"
          sideOffset={8}
          className="w-auto p-0 bg-transparent border-0 shadow-none ring-0 gap-0"
        >
          <CalendarPopover
            value={task.scheduledDate ?? undefined}
            onChange={handleHotkeyDateChange}
            onSomedaySelect={handleHotkeySomedaySelect}
            isSomeday={isSomeday}
            showSomeday
            showEvening
            isEvening={task.isEvening}
            onClose={onScheduleDatePickerClose}
          />
        </PopoverContent>
      </Popover>

      {/* Drag preview portal */}
      {dragState.type === 'preview' &&
        createPortal(
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-background shadow-lg border border-border"
            style={{
              width: `${dragState.dragging.width}px`,
              height: `${dragState.dragging.height}px`,
            }}
          >
            <TaskCheckbox
              checked={isCompleted}
              onChange={() => {}}
              dashed={isSomeday}
            />
            <TaskTitle value={form.title} />
          </div>,
          dragState.container,
        )}
    </>
  );
}
