import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { isToday } from 'date-fns';
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GroupedTaskList,
  type TaskGroupsData,
  type TaskMoveInfo,
  type TSection,
} from '@/components/board';
import {
  CheckCircleIcon,
  MoreHorizontalIcon,
  RepeatIcon,
  Trash2Icon,
} from '@/components/icons';
import { ViewContainer } from '@/components/layout/ViewContainer';
import { MobileBackButton } from '@/components/MobileBackButton';
import {
  AddHeadingButton,
  NewTaskButton,
  SearchButton,
  ViewToolbar,
} from '@/components/ToolbarButtons';
import { TemplateCard } from '@/components/tasks/TemplateCard';
import {
  createDropdownController,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import { TagFilterTabs } from '@/components/ui/tag-filter-tabs';
import type { TaskRecord } from '@/db/validation';
import {
  useAreas,
  useChecklistItems,
  useCreateHeading,
  useDeleteHeading,
  useHeadings,
  useProjects,
  useReorderTasks,
  useRepeatingRules,
  useTags,
  useTasks,
  useTaskTags,
  useUpdateHeading,
  useUpdateProject,
  useUpdateTask,
} from '@/lib/contexts/DataContext';
import { useHotkey } from '@/lib/hooks/useHotkey';
import {
  type NavItem,
  useListKeyboardNav,
} from '@/lib/hooks/useTaskKeyboardNav';
import { useTaskOperations } from '@/lib/hooks/useTaskOperations';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/project/$projectId')({
  component: ProjectView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      task: (search.task as string) || undefined,
    };
  },
});

function EditableText(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();
    if (trimmed !== props.value) {
      props.onChange(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      target.blur();
    } else if (e.key === 'Escape') {
      target.value = props.value;
      target.blur();
    }
  };

  return (
    <input
      type="text"
      defaultValue={props.value}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={props.placeholder}
      className={cn(
        'block w-full p-0 m-0 border-0 bg-transparent outline-none',
        'placeholder:text-hint',
        props.className,
      )}
    />
  );
}

function ProjectView() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data: allTasks, loading: tasksLoading } = useTasks();
  const { data: allProjects, loading: projectsLoading } = useProjects();
  const { data: areas } = useAreas();
  const { data: allHeadings } = useHeadings();
  const { data: checklistItems } = useChecklistItems();
  const { data: tags } = useTags();
  const { data: taskTags } = useTaskTags();
  const { data: repeatingRules } = useRepeatingRules();

  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const updateProject = useUpdateProject();
  const createHeading = useCreateHeading();
  const updateHeading = useUpdateHeading();
  const deleteHeading = useDeleteHeading();

  const ops = useTaskOperations();

  const project = useMemo(
    () => allProjects.find((p) => p.id === projectId),
    [allProjects, projectId],
  );

  const activeProjects = useMemo(
    () => allProjects.filter((p) => p.status === 'active'),
    [allProjects],
  );

  const allProjectHeadings = useMemo(
    () =>
      allHeadings
        .filter((h) => h.projectId === projectId)
        .sort((a, b) => a.position - b.position),
    [allHeadings, projectId],
  );

  // Separate backlog heading from regular headings
  const backlogHeading = useMemo(
    () => allProjectHeadings.find((h) => h.isBacklog),
    [allProjectHeadings],
  );

  // Regular headings (non-backlog), sorted by position
  const headings = useMemo(
    () => allProjectHeadings.filter((h) => !h.isBacklog),
    [allProjectHeadings],
  );

  const projectNotesRef = useRef<HTMLTextAreaElement>(null);

  const resizeProjectNotes = useCallback(() => {
    if (projectNotesRef.current) {
      projectNotesRef.current.style.height = 'auto';
      const scrollHeight = projectNotesRef.current.scrollHeight;
      const maxHeight = 300;
      projectNotesRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      projectNotesRef.current.style.overflowY =
        scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, []);

  const projectMenu = createDropdownController();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [scheduleDatePickerTaskId, setScheduleDatePickerTaskId] = useState<
    string | null
  >(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

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

  const projectTemplates = useMemo(
    () =>
      repeatingRules
        .filter((r) => !r.deletedAt && r.projectId === projectId)
        .slice()
        .sort((a, b) => a.nextOccurrence.localeCompare(b.nextOccurrence)),
    [repeatingRules, projectId],
  );

  const projectTasks = useMemo(
    () => allTasks.filter((t) => t.projectId === projectId && !t.trashedAt),
    [allTasks, projectId],
  );

  const projectTagIds = useMemo(() => {
    const taskIds = new Set(projectTasks.map((t) => t.id));
    const tagIds = new Set<string>();
    for (const tt of taskTags.filter((t) => taskIds.has(t.taskId))) {
      tagIds.add(tt.tagId);
    }
    return Array.from(tagIds);
  }, [projectTasks, taskTags]);

  const projectTags = useMemo(
    () => tags.filter((t) => projectTagIds.includes(t.id)),
    [tags, projectTagIds],
  );

  const filterByTag = useCallback(
    <T extends TaskRecord>(taskList: T[]): T[] => {
      if (!activeTagId) return taskList;
      const taskIdsWithTag = new Set(
        taskTags
          .filter((tt) => tt.tagId === activeTagId)
          .map((tt) => tt.taskId),
      );
      return taskList.filter((t) => taskIdsWithTag.has(t.id));
    },
    [activeTagId, taskTags],
  );

  const progress = useMemo(() => {
    if (projectTasks.length === 0) return 0;
    const completed = projectTasks.filter(
      (t) => t.status === 'completed',
    ).length;
    return Math.round((completed / projectTasks.length) * 100);
  }, [projectTasks]);

  const getTasksForHeading = useCallback(
    (headingId: string) =>
      projectTasks
        .filter(
          (t) =>
            t.headingId === headingId &&
            t.status !== 'completed' &&
            t.status !== 'someday',
        )
        .sort((a, b) => a.position - b.position),
    [projectTasks],
  );

  const unheadedActiveTasks = useMemo(
    () =>
      projectTasks
        .filter(
          (t) =>
            !t.headingId && t.status !== 'completed' && t.status !== 'someday',
        )
        .sort((a, b) => a.position - b.position),
    [projectTasks],
  );

  // Backlog tasks are those with status === 'someday' (and should have headingId === backlogHeading.id after migration)
  const backlogTasks = useMemo(
    () =>
      projectTasks
        .filter((t) => t.status === 'someday')
        .sort((a, b) => a.position - b.position),
    [projectTasks],
  );

  const completedTodayTasks = useMemo(
    () =>
      projectTasks
        .filter(
          (t) =>
            t.status === 'completed' && t.completedAt && isToday(t.completedAt),
        )
        .sort((a, b) => a.position - b.position),
    [projectTasks],
  );

  // Build board data with sections for GroupedTaskList
  const boardData = useMemo((): TaskGroupsData => {
    const sections: TSection[] = [];

    // 1. Unheaded active tasks
    const filteredUnheaded = filterByTag(unheadedActiveTasks);
    if (filteredUnheaded.length > 0) {
      sections.push({
        id: 'section:unheaded',
        title: '',
        tasks: filteredUnheaded,
        projectId,
      });
    }

    // 2. Each heading's tasks (non-backlog headings)
    for (const heading of headings) {
      const headingTasks = filterByTag(getTasksForHeading(heading.id));
      sections.push({
        id: `section:heading:${heading.id}`,
        title: heading.title,
        tasks: headingTasks,
        projectId,
        headingId: heading.id,
      });
    }

    // 3. Backlog section (always appears, using real backlog heading)
    if (backlogHeading) {
      const filteredBacklog = filterByTag(backlogTasks);
      sections.push({
        id: `section:heading:${backlogHeading.id}`,
        title: backlogHeading.title,
        tasks: filteredBacklog,
        projectId,
        headingId: backlogHeading.id,
        isBacklog: true,
      });
    }

    // 4. Completed today tasks
    const filteredCompleted = filterByTag(completedTodayTasks);
    if (filteredCompleted.length > 0) {
      sections.push({
        id: 'section:completed',
        title: 'Completed Today',
        tasks: filteredCompleted,
        projectId,
        isCompleted: true,
      });
    }

    return { sections };
  }, [
    unheadedActiveTasks,
    headings,
    getTasksForHeading,
    backlogTasks,
    backlogHeading,
    completedTodayTasks,
    filterByTag,
    projectId,
  ]);

  // Build flattened task list for keyboard navigation (matches render order)
  const allTasksFlat = useMemo(() => {
    return boardData.sections.flatMap((s) => s.tasks);
  }, [boardData]);

  // Build nav items including templates at the end
  const navItems = useMemo(() => {
    const items: NavItem[] = allTasksFlat.map((task) => ({
      id: task.id,
      type: 'task' as const,
    }));
    // Add templates at the end
    for (const template of projectTemplates) {
      items.push({ id: template.id, type: 'template' });
    }
    return items;
  }, [allTasksFlat, projectTemplates]);

  // Compute the currently selected id (either task or template)
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

  useEffect(() => {
    if (project) {
      setTimeout(resizeProjectNotes, 0);
    }
  }, [project, resizeProjectNotes]);

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
      setSelectedTaskId(null);
      setExpandedTaskId(null);
    },
    [ops],
  );

  const handleTaskMove = useCallback(
    (info: TaskMoveInfo) => {
      const { taskId, toSection, newTaskIds } = info;
      const changes: Record<string, unknown> = {};

      // Determine destination based on section
      if (toSection.isBacklog && toSection.headingId) {
        // Moving to backlog heading
        changes.headingId = toSection.headingId;
        changes.status = 'someday';
      } else if (toSection.id === 'section:unheaded') {
        // Moving to unheaded section - ensure not someday
        const task = allTasks.find((t) => t.id === taskId);
        const needsStatusChange = task?.status === 'someday';
        changes.headingId = null;
        if (needsStatusChange) {
          changes.status = 'anytime';
        }
      } else if (toSection.headingId) {
        // Moving to a regular heading section
        const task = allTasks.find((t) => t.id === taskId);
        const needsStatusChange = task?.status === 'someday';
        changes.headingId = toSection.headingId;
        if (needsStatusChange) {
          changes.status = 'anytime';
        }
      }

      updateTask.mutate({ id: taskId, changes });
      reorderTasks.mutate(newTaskIds);
    },
    [updateTask, reorderTasks, allTasks],
  );

  const handleUpdateNotes = useCallback(
    (notes: string) => {
      if (project) {
        updateProject.mutate({
          id: project.id,
          changes: { notes: notes || null },
        });
      }
    },
    [project, updateProject],
  );

  const handleUpdateTitle = useCallback(
    (title: string) => {
      if (project) {
        updateProject.mutate({ id: project.id, changes: { title } });
      }
    },
    [project, updateProject],
  );

  const handleAddHeading = useCallback(() => {
    if (project) {
      createHeading.mutate({
        projectId: project.id,
        title: 'New Group',
        position: headings.length + 1,
      });
    }
  }, [project, headings, createHeading]);

  const handleHeadingEdit = useCallback(
    (headingId: string, title: string) => {
      updateHeading.mutate({ id: headingId, changes: { title } });
    },
    [updateHeading],
  );

  const handleHeadingDelete = useCallback(
    (headingId: string) => {
      const tasksInHeading = allTasks.filter((t) => t.headingId === headingId);
      tasksInHeading.forEach((task) => {
        updateTask.mutate({ id: task.id, changes: { headingId: null } });
      });
      deleteHeading.mutate(headingId);
    },
    [allTasks, updateTask, deleteHeading],
  );

  const handleCompleteProject = useCallback(() => {
    if (project) {
      updateProject.mutate({
        id: project.id,
        changes: { status: 'completed', completedAt: new Date() },
      });
      navigate({ to: '/today' as '/inbox' });
    }
    projectMenu.close();
  }, [project, updateProject, navigate, projectMenu]);

  const handleDeleteProject = useCallback(() => {
    if (project) {
      updateProject.mutate({
        id: project.id,
        changes: { trashedAt: new Date() },
      });
      navigate({ to: '/today' as '/inbox' });
    }
    projectMenu.close();
  }, [project, updateProject, navigate, projectMenu]);

  const isReady = !tasksLoading && !projectsLoading;
  const hasTasks = boardData.sections.length > 0;

  const projectHeader = (
    <>
      <header className="px-4 md:px-20 pt-8 pb-4">
        {project ? (
          <>
            <div className="flex items-center gap-3 px-2">
              <MobileBackButton />
              <ProjectProgressIcon
                progress={progress}
                size={26}
                className="text-things-blue"
              />
              <div className="flex-1">
                <EditableText
                  key={project.id}
                  value={project.title ?? ''}
                  onChange={handleUpdateTitle}
                  placeholder="Project Title"
                  className="text-[26px] font-bold text-foreground"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="ml-auto p-1 text-muted-foreground hover:text-foreground/70"
                  onClick={(e) => projectMenu.toggleFromEvent(e)}
                >
                  <MoreHorizontalIcon className="w-5 h-5" />
                </button>
                <DropdownMenuContent
                  open={projectMenu.open}
                  onClose={projectMenu.close}
                  anchorRect={projectMenu.anchorRect}
                  align="end"
                >
                  <DropdownMenuItem onClick={handleCompleteProject}>
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Complete Project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteProject}
                    className="text-destructive"
                  >
                    <Trash2Icon className="w-4 h-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </div>
            </div>

            <div className="mt-1 px-2">
              <textarea
                key={project.id}
                ref={projectNotesRef}
                defaultValue={project.notes ?? ''}
                onInput={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  handleUpdateNotes(e.currentTarget.value);
                  resizeProjectNotes();
                }}
                onBlur={(e: FocusEvent<HTMLTextAreaElement>) => {
                  const trimmed = e.currentTarget.value.trim();
                  if (trimmed !== (project.notes ?? '')) {
                    handleUpdateNotes(trimmed);
                  }
                }}
                placeholder="Notes"
                rows={1}
                className="w-full h-[24px] max-w-[300px] bg-transparent text-[15px] text-notes leading-relaxed resize-none overflow-hidden outline-none border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
              />
            </div>

            {projectTags.length > 0 && (
              <div className="mt-3 px-2">
                <TagFilterTabs
                  tags={projectTags}
                  activeTagId={activeTagId}
                  onTagSelect={setActiveTagId}
                />
              </div>
            )}
          </>
        ) : (
          <div className="h-[60px]" />
        )}
      </header>
    </>
  );

  const projectToolbar = (
    <ViewToolbar>
      <NewTaskButton />
      <AddHeadingButton onClick={handleAddHeading} />
      <SearchButton />
    </ViewToolbar>
  );

  return (
    <ViewContainer header={projectHeader} toolbar={projectToolbar}>
      {!isReady ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !project ? (
        <div className="py-8 text-center text-muted-foreground">
          Project not found
        </div>
      ) : (
        <div className="space-y-8">
          {hasTasks && (
            <GroupedTaskList
              initial={boardData}
              onComplete={ops.complete}
              onSelect={handleTaskSelect}
              onExpand={handleTaskExpand}
              onReorder={ops.reorder}
              onMoveTask={handleTaskMove}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
              onProjectChange={ops.changeProject}
              onTagAdd={ops.addTag}
              onTagRemove={ops.removeTag}
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
              showTodayStar
              onHeadingEdit={handleHeadingEdit}
              onHeadingDelete={handleHeadingDelete}
            />
          )}

          {projectTemplates.length > 0 && (
            <section className="mt-8">
              <div className="mb-2 space-y-2">
                <div className="text-[15px] font-semibold text-muted-foreground flex items-center gap-2">
                  <RepeatIcon className="w-4 h-4" />
                  Repeating
                </div>
                <div className="border-b border-border" />
              </div>
              <div className="space-y-1">
                {projectTemplates.map((template) => (
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
        </div>
      )}
    </ViewContainer>
  );
}
