import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GroupedTaskList,
  type TaskGroupsData,
  type TaskMoveInfo,
  type TSection,
} from '@/components/board';
import { BoxIcon, MoreHorizontalIcon, Trash2Icon } from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { MobileBackButton } from '@/components/MobileBackButton';
import {
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';

import { TaskListSkeleton } from '@/components/tasks/TaskRowSkeleton';
import { TemplateCard } from '@/components/tasks/TemplateCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditableText } from '@/components/ui/editable-text';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import type { TaskRecord } from '@/db/validation';
import {
  useAddTagToTask,
  useAreas,
  useChecklistItems,
  useDeleteArea,
  useProjects,
  useRemoveTagFromTask,
  useReorderTasks,
  useRepeatingRules,
  useTags,
  useTasks,
  useTaskTags,
  useUpdateArea,
  useUpdateProject,
  useUpdateTask,
} from '@/lib/contexts/DataContext';
import { useTaskKeyboardNav } from '@/lib/hooks/useTaskKeyboardNav';
export const Route = createFileRoute('/area/$areaId')({
  component: AreaView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      task: (search.task as string) || undefined,
    };
  },
});

function AreaView() {
  const { areaId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data: tasks, loading: tasksLoading } = useTasks();
  const { data: projects } = useProjects();
  const { data: areas, loading: areasLoading } = useAreas();
  const { data: checklistItems } = useChecklistItems();
  const { data: tags } = useTags();
  const { data: taskTags } = useTaskTags();
  const { data: repeatingRules } = useRepeatingRules();

  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();
  const updateProject = useUpdateProject();
  const addTagToTask = useAddTagToTask();
  const removeTagFromTask = useRemoveTagFromTask();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = useState<
    string | null
  >(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(
    null,
  );

  // Handle initial task selection from command palette
  useEffect(() => {
    if (search.task) {
      setSelectedTaskId(search.task);
      setExpandedTaskId(search.task);
    }
  }, [search.task]);

  const area = useMemo(
    () => areas.find((a) => a.id === areaId),
    [areas, areaId],
  );

  const areaProjects = useMemo(
    () =>
      projects
        .filter((p) => p.areaId === areaId && p.status === 'active')
        .sort((a, b) => a.position - b.position),
    [projects, areaId],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  const getProjectTaskCount = useCallback(
    (projectId: string) => {
      return tasks.filter(
        (t) =>
          t.projectId === projectId && !t.trashedAt && t.status !== 'completed',
      ).length;
    },
    [tasks],
  );

  const getProjectProgress = useCallback(
    (projectId: string) => {
      const projectTasks = tasks.filter(
        (t) => t.projectId === projectId && !t.trashedAt,
      );
      if (projectTasks.length === 0) return 0;
      const completed = projectTasks.filter(
        (t) => t.status === 'completed',
      ).length;
      return Math.round((completed / projectTasks.length) * 100);
    },
    [tasks],
  );

  // Tasks directly in the area (not in a project)
  const areaTasks = useMemo(
    () =>
      tasks
        .filter((t) => {
          if (t.trashedAt) return false;
          if (t.status === 'completed') return false;
          if (t.status === 'someday') return false;
          if (t.projectId) return false;
          return t.areaId === areaId;
        })
        .sort((a, b) => a.position - b.position),
    [tasks, areaId],
  );

  // Someday tasks directly in the area (not in a project)
  const somedayTasks = useMemo(
    () =>
      tasks
        .filter((t) => {
          if (t.trashedAt) return false;
          if (t.status !== 'someday') return false;
          if (t.projectId) return false;
          return t.areaId === areaId;
        })
        .sort((a, b) => a.position - b.position),
    [tasks, areaId],
  );

  // Area repeating templates
  const areaTemplates = useMemo(
    () =>
      repeatingRules.filter(
        (r) => r.areaId === areaId && !r.projectId && !r.deletedAt,
      ),
    [repeatingRules, areaId],
  );

  // Build board data with a single section for area tasks
  const boardData = useMemo((): TaskGroupsData => {
    const sections: TSection[] = [];

    // Single section for all area tasks
    if (areaTasks.length > 0) {
      sections.push({
        id: 'section:area-tasks',
        title: '',
        tasks: areaTasks,
        areaId,
      });
    }

    // Someday section
    if (somedayTasks.length > 0 || areaTasks.length > 0) {
      sections.push({
        id: 'section:someday',
        title: 'Someday',
        tasks: somedayTasks,
        areaId,
        isBacklog: true,
      });
    }

    return { sections };
  }, [areaTasks, somedayTasks, areaId]);

  // Flatten all tasks for keyboard navigation
  const allTasksFlat = useMemo(() => {
    return boardData.sections.flatMap((section) => section.tasks);
  }, [boardData]);

  const handleTaskSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId);
    if (taskId) setSelectedTemplateId(null);
  }, []);

  const handleTemplateSelect = useCallback((templateId: string | null) => {
    setSelectedTemplateId(templateId);
    if (templateId) setSelectedTaskId(null);
  }, []);

  const handleTaskExpand = useCallback((taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  }, []);

  useTaskKeyboardNav({
    tasks: allTasksFlat,
    selectedTaskId,
    expandedTaskId,
    onSelect: setSelectedTaskId,
    onExpand: (taskId) => {
      setSelectedTaskId(taskId);
      setExpandedTaskId(taskId);
    },
  });

  // Ctrl+S to open schedule date picker
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedTaskId && !expandedTaskId) {
          setScheduleDatePickerTaskId(selectedTaskId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedTaskId, expandedTaskId]);

  // Close date picker when task is expanded
  useEffect(() => {
    setScheduleDatePickerTaskId(null);
  }, [expandedTaskId]);

  // Close date picker when selection changes
  useEffect(() => {
    setScheduleDatePickerTaskId(null);
  }, [selectedTaskId]);

  const handleTaskComplete = useCallback(
    (taskId: string, completed: boolean) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          status: completed ? 'completed' : 'anytime',
          completedAt: completed ? new Date() : null,
        },
      });
    },
    [updateTask],
  );

  const handleTaskReorder = useCallback(
    (taskIds: string[]) => {
      reorderTasks.mutate(taskIds);
    },
    [reorderTasks],
  );

  const handleTaskMove = useCallback(
    (info: TaskMoveInfo) => {
      const { taskId, toSection, newTaskIds } = info;
      const changes: Record<string, unknown> = {
        areaId,
        projectId: null,
      };

      // Handle status change based on destination section
      if (toSection.isBacklog) {
        // Moving to someday section
        changes.status = 'someday';
      } else {
        // Moving to regular area tasks section
        const task = tasks.find((t) => t.id === taskId);
        if (task?.status === 'someday') {
          changes.status = 'anytime';
        }
      }

      updateTask.mutate({ id: taskId, changes });
      reorderTasks.mutate(newTaskIds);
    },
    [reorderTasks, tasks, updateTask, areaId],
  );

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<TaskRecord>) => {
      updateTask.mutate({ id: taskId, changes: updates });
    },
    [updateTask],
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      updateTask.mutate({ id: taskId, changes: { trashedAt: new Date() } });
      setSelectedTaskId(null);
      setExpandedTaskId(null);
    },
    [updateTask],
  );

  const handleProjectChange = useCallback(
    (taskId: string, projectId: string | null, newAreaId?: string | null) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          projectId,
          areaId: newAreaId ?? null,
          headingId: null,
        },
      });
    },
    [updateTask],
  );

  const handleTagAdd = useCallback(
    (taskId: string, tagId: string) => {
      addTagToTask.mutate({ taskId, tagId });
    },
    [addTagToTask],
  );

  const handleTagRemove = useCallback(
    (taskId: string, tagId: string) => {
      removeTagFromTask.mutate({ taskId, tagId });
    },
    [removeTagFromTask],
  );

  const handleUpdateTitle = useCallback(
    (title: string) => {
      if (area && title) {
        updateArea.mutate({ id: area.id, changes: { title } });
      }
    },
    [area, updateArea],
  );

  const handleDeleteArea = useCallback(() => {
    if (area) {
      areaProjects.forEach((p) => {
        updateProject.mutate({ id: p.id, changes: { areaId: null } });
      });
      areaTasks.forEach((t) => {
        updateTask.mutate({ id: t.id, changes: { areaId: null } });
      });
      deleteArea.mutate(area.id);
      navigate({ to: '/today' as '/inbox' });
    }
  }, [
    area,
    areaProjects,
    areaTasks,
    updateProject,
    updateTask,
    deleteArea,
    navigate,
  ]);

  const isReady = !tasksLoading && !areasLoading;
  const hasTasks = boardData.sections.length > 0 || areaTemplates.length > 0;
  const hasProjects = areaProjects.length > 0;

  const areaHeader = (
    <header className="px-4 md:px-10 pt-10 pb-6">
      {area ? (
        <div className="flex items-center gap-3">
          <MobileBackButton />
          <BoxIcon
            className="w-7 h-7 text-things-green shrink-0"
            strokeWidth={2}
          />
          <div className="flex-1">
            <EditableText
              value={area.title ?? ''}
              onChange={handleUpdateTitle}
              placeholder="Area Title"
              className="text-[28px] font-bold text-foreground"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-md text-muted-foreground hover:text-foreground/70 hover:bg-accent transition-colors">
              <MoreHorizontalIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (
                    area &&
                    confirm(
                      `Delete "${area.title}"? Projects in this area will be moved to the top.`,
                    )
                  ) {
                    handleDeleteArea();
                  }
                }}
                className="text-destructive"
              >
                <Trash2Icon className="w-4 h-4 mr-2" />
                Delete Area
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="h-[60px]" />
      )}
    </header>
  );

  const areaToolbar = (
    <ViewToolbar>
      <NewTaskButton />
      <SearchButton />
    </ViewToolbar>
  );

  return (
    <ViewContainer header={areaHeader} toolbar={areaToolbar}>
      {!isReady ? (
        <TaskListSkeleton />
      ) : !area ? (
        <div className="py-8 text-center text-muted-foreground">
          Area not found
        </div>
      ) : (
        <div className="space-y-8">
          {/* Task sections using GroupedTaskList */}
          {boardData.sections.length > 0 && (
            <GroupedTaskList
              initial={boardData}
              onComplete={handleTaskComplete}
              onSelect={handleTaskSelect}
              onExpand={handleTaskExpand}
              onReorder={handleTaskReorder}
              onMoveTask={handleTaskMove}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
              onProjectChange={handleProjectChange}
              onTagAdd={handleTagAdd}
              onTagRemove={handleTagRemove}
              selectedTaskId={selectedTaskId}
              expandedTaskId={expandedTaskId}
              scheduleDatePickerTaskId={scheduleDatePickerTaskId}
              onScheduleDatePickerClose={() =>
                setScheduleDatePickerTaskId(null)
              }
              projects={activeProjects}
              areas={areas}
              checklistItems={checklistItems}
              tags={tags}
              taskTags={taskTags}
            />
          )}

          {/* Repeating templates section */}
          {areaTemplates.length > 0 && (
            <section>
              <div className="mb-2 space-y-2 px-4 md:px-8">
                <div className="text-[15px] font-bold text-things-blue">
                  Repeating
                </div>
                <div className="border-b border-border" />
              </div>
              <div className="space-y-1">
                {areaTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    expanded={expandedTemplateId === template.id}
                    selected={selectedTemplateId === template.id}
                    onSelect={handleTemplateSelect}
                    onExpand={(id) =>
                      setExpandedTemplateId(
                        expandedTemplateId === id ? null : id,
                      )
                    }
                    projects={activeProjects}
                    areas={areas}
                    allTags={tags}
                    showNextDate
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active Projects List */}
          {hasProjects && (
            <section>
              <div className="mb-2 space-y-2 px-4 md:px-8">
                <div className="text-[15px] font-semibold text-things-blue">
                  Projects
                </div>
                <div className="border-b border-border" />
              </div>
              <div className="space-y-1 px-4 md:px-10">
                {areaProjects.map((project) => {
                  const count = getProjectTaskCount(project.id);
                  const progress = getProjectProgress(project.id);
                  return (
                    <Link
                      key={project.id}
                      to="/project/$projectId"
                      params={{ projectId: project.id }}
                      className="flex items-center gap-2.5 h-7 px-2 -mx-2 rounded-md hover:bg-secondary transition-colors"
                    >
                      <ProjectProgressIcon
                        progress={progress}
                        size={16}
                        variant="sidebar"
                        className="text-things-blue shrink-0"
                      />
                      <span className="text-[15px] font-semibold text-foreground">
                        {project.title}
                      </span>
                      {count > 0 && (
                        <span className="text-[11px] text-muted-foreground border border-hint rounded px-1.5 py-0.5">
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty state */}
          {!hasProjects && !hasTasks && (
            <div className="py-12 text-center text-muted-foreground">
              <p>No projects or tasks in this area yet.</p>
            </div>
          )}
        </div>
      )}
    </ViewContainer>
  );
}
