import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { CalendarIcon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { UpcomingDaySection } from '@/components/UpcomingDaySection';
import type { TaskRecord } from '@/db/validation';
import {
  useAreas,
  useChecklistItems,
  useProjects,
  useTags,
  useUpdateTask,
} from '@/lib/contexts/DataContext';
import { useHotkey } from '@/lib/hooks/useHotkey';
import {
  type NavItem,
  useListKeyboardNav,
} from '@/lib/hooks/useTaskKeyboardNav';
import { useTaskOperations } from '@/lib/hooks/useTaskOperations';
import { useUpcomingData } from '@/lib/hooks/useUpcomingData';

export const Route = createFileRoute('/upcoming')({
  component: UpcomingView,
});

function UpcomingView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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

  const updateTask = useUpdateTask();
  const ops = useTaskOperations({ uncompleteStatus: 'scheduled' });

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  const handleTaskSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
    setScheduleDatePickerTaskId(null);
    if (taskId) setSelectedTemplateId(null);
  }, []);

  const handleTemplateSelect = useCallback((templateId: string | null) => {
    setSelectedTemplateId(templateId);
    setScheduleDatePickerTaskId(null);
    if (templateId) setSelectedTaskId(null);
  }, []);

  const handleTaskExpand = useCallback((taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
    setScheduleDatePickerTaskId(null);
  }, []);

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
      setSelectedTaskId(null);
    },
    [ops],
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
    onSelectTask: setSelectedTaskId,
    onSelectTemplate: setSelectedTemplateId,
    onExpandTask: (taskId) => {
      setSelectedTaskId(taskId);
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
      if (selectedTaskId && !expandedTaskId) {
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
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : dayGroups.length === 0 ? (
        <p className="text-muted-foreground">No upcoming tasks scheduled.</p>
      ) : (
        <div className="space-y-8">
          {dayGroups.map((group) => (
            <UpcomingDaySection
              key={group.id}
              group={group}
              selectedTaskId={selectedTaskId}
              expandedTaskId={expandedTaskId}
              selectedTemplateId={selectedTemplateId}
              expandedTemplateId={expandedTemplateId}
              scheduleDatePickerTaskId={scheduleDatePickerTaskId}
              projects={activeProjects}
              areas={areas}
              checklistItems={checklistItems}
              tags={tags}
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
    </ViewContainer>
  );
}
