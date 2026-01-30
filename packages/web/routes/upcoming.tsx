import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatchActionBar } from '@/components/BatchActionBar';
import { CalendarIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { TaskListSkeleton } from '@/components/tasks/TaskRowSkeleton';
import { UpcomingDaySection } from '@/components/UpcomingDaySection';
import type { TaskRecord } from '@/db/validation';
import {
  useAreas,
  useChecklistItems,
  useProjects,
  useTags,
  useTaskTags,
  useUpdateTask,
} from '@/lib/contexts/DataContext';
import { useBatchOperations } from '@/lib/hooks/useBatchOperations';
import { useHotkey } from '@/lib/hooks/useHotkey';
import { useMultiSelect } from '@/lib/hooks/useMultiSelect';
import {
  type NavItem,
  useListKeyboardNav,
} from '@/lib/hooks/useTaskKeyboardNav';
import { useTaskOperations } from '@/lib/hooks/useTaskOperations';
import { useUpcomingData } from '@/lib/hooks/useUpcomingData';

export const Route = createFileRoute('/upcoming')({
  component: UpcomingView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      task: (search.task as string) || undefined,
    };
  },
});

function UpcomingView() {
  const search = Route.useSearch();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(
    null,
  );
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = useState<
    string | null
  >(null);

  const { dayGroups, loading } = useUpcomingData();
  const { data: projects } = useProjects();
  const { data: areas } = useAreas();
  const { data: checklistItems } = useChecklistItems();
  const { data: tags } = useTags();
  const { data: taskTags } = useTaskTags();

  const updateTask = useUpdateTask();
  const ops = useTaskOperations({ uncompleteStatus: 'scheduled' });
  const batchOps = useBatchOperations();

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  // Flatten all tasks for multi-select
  const allTasks = useMemo(
    () => dayGroups.flatMap((g) => g.tasks),
    [dayGroups],
  );

  const {
    selectedIds,
    lastSelectedId,
    handleSelect: baseHandleSelect,
    clearSelection,
    selectAll,
    isMultiSelecting,
  } = useMultiSelect({ items: allTasks });

  // Handle initial task selection from command palette
  useEffect(() => {
    if (search.task) {
      baseHandleSelect(search.task, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as React.MouseEvent);
      setExpandedTaskId(search.task);
    }
  }, [search.task, baseHandleSelect]);

  const selectedTaskId = isMultiSelecting ? null : lastSelectedId;

  const handleTaskSelect = useCallback(
    (taskId: string, event: React.MouseEvent) => {
      baseHandleSelect(taskId, event);
      setScheduleDatePickerTaskId(null);
      setSelectedTemplateId(null);
    },
    [baseHandleSelect],
  );

  const handleTemplateSelect = useCallback(
    (templateId: string | null) => {
      setSelectedTemplateId(templateId);
      setScheduleDatePickerTaskId(null);
      if (templateId) clearSelection();
    },
    [clearSelection],
  );

  const handleTaskExpand = useCallback(
    (taskId: string) => {
      clearSelection();
      setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
      setScheduleDatePickerTaskId(null);
      baseHandleSelect(taskId, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as React.MouseEvent);
    },
    [clearSelection, baseHandleSelect],
  );

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<TaskRecord>) => {
      ops.update(taskId, updates);
    },
    [ops],
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      ops.trash(taskId);
      setExpandedTaskId(null);
      clearSelection();
    },
    [ops, clearSelection],
  );

  const handleTaskMoveToDate = useCallback(
    (taskId: string, date: string) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          scheduledDate: date,
          status: 'scheduled',
        },
      });
    },
    [updateTask],
  );

  // Batch operation handlers
  const handleBatchDateChange = useCallback(
    (date: string | null, isEvening?: boolean) => {
      batchOps.batchSetDate(Array.from(selectedIds), date, isEvening);
      clearSelection();
    },
    [batchOps, selectedIds, clearSelection],
  );

  const handleBatchMove = useCallback(
    (projectId: string | null, areaId?: string | null) => {
      batchOps.batchMove(Array.from(selectedIds), projectId, areaId);
      clearSelection();
    },
    [batchOps, selectedIds, clearSelection],
  );

  const handleBatchTrash = useCallback(() => {
    batchOps.batchTrash(Array.from(selectedIds));
    clearSelection();
  }, [batchOps, selectedIds, clearSelection]);

  // Cmd+A to select all
  useHotkey('a', selectAll, { meta: true });

  // Build flattened nav items list for keyboard navigation
  const navItems = useMemo(() => {
    const result: NavItem[] = [];
    for (const group of dayGroups) {
      for (const task of group.tasks) {
        result.push({ id: task.id, type: 'task' });
      }
      for (const template of group.templates) {
        result.push({ id: template.id, type: 'template' });
      }
    }
    return result;
  }, [dayGroups]);

  const selectedId = selectedTaskId ?? selectedTemplateId;
  const expandedId = expandedTaskId ?? expandedTemplateId;

  useListKeyboardNav({
    items: navItems,
    selectedId,
    expandedId,
    onSelectTask: (taskId) => {
      if (taskId) {
        baseHandleSelect(taskId, {
          shiftKey: false,
          metaKey: false,
          ctrlKey: false,
        } as React.MouseEvent);
      } else {
        clearSelection();
      }
    },
    onSelectTemplate: setSelectedTemplateId,
    onExpandTask: (taskId) => {
      baseHandleSelect(taskId, {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
      } as React.MouseEvent);
      setExpandedTaskId(taskId);
    },
    onExpandTemplate: (templateId) => {
      setSelectedTemplateId(templateId);
      setExpandedTemplateId(templateId);
    },
  });

  useHotkey(
    's',
    () => {
      if (selectedTaskId && !expandedTaskId && !isMultiSelecting) {
        setScheduleDatePickerTaskId(selectedTaskId);
      }
    },
    { ctrl: true },
  );

  return (
    <ViewContainer
      title="Upcoming"
      icon={<CalendarIcon className="w-6 h-6 text-things-pink" />}
      iconColor="text-things-pink"
      toolbar={
        <ViewToolbar>
          <NewTaskButton />
          <SearchButton />
        </ViewToolbar>
      }
    >
      {loading ? (
        <TaskListSkeleton />
      ) : dayGroups.length === 0 ? (
        <p className="text-muted-foreground">No upcoming tasks scheduled.</p>
      ) : (
        <div className="space-y-8">
          {dayGroups.map((group) => (
            <UpcomingDaySection
              key={group.id}
              group={group}
              selectedTaskId={selectedTaskId}
              selectedIds={selectedIds}
              expandedTaskId={expandedTaskId}
              selectedTemplateId={selectedTemplateId}
              expandedTemplateId={expandedTemplateId}
              scheduleDatePickerTaskId={scheduleDatePickerTaskId}
              projects={activeProjects}
              areas={areas}
              checklistItems={checklistItems}
              tags={tags}
              taskTags={taskTags}
              onTaskSelect={handleTaskSelect}
              onTaskExpand={handleTaskExpand}
              onTaskComplete={ops.complete}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onProjectChange={ops.changeProject}
              onTagAdd={ops.addTag}
              onTagRemove={ops.removeTag}
              onTemplateSelect={handleTemplateSelect}
              onTemplateExpand={(id) =>
                setExpandedTemplateId(expandedTemplateId === id ? null : id)
              }
              onTaskMoveToDate={handleTaskMoveToDate}
              onScheduleDatePickerClose={() =>
                setScheduleDatePickerTaskId(null)
              }
            />
          ))}
        </div>
      )}

      {isMultiSelecting && (
        <BatchActionBar
          count={selectedIds.size}
          onDateChange={handleBatchDateChange}
          onMove={handleBatchMove}
          onTrash={handleBatchTrash}
          onClear={clearSelection}
          projects={activeProjects}
          areas={areas}
        />
      )}
    </ViewContainer>
  );
}
