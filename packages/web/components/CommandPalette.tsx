import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import {
  ArchiveIcon,
  BookCheckIcon,
  CalendarIcon,
  InboxIcon,
  LayersIcon,
  TodayStarIcon,
  Trash2Icon,
} from '@/components/icons';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import type { TaskRecord } from '@/db/validation';
import { useAreas, useProjects, useTasks } from '@/lib/contexts/DataContext';
import { parseLocalDate } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// Shared item styles for dark popover theme - override default bg-muted with !important
const itemClass =
  'text-popover-dark-foreground !bg-transparent data-[selected=true]:!bg-popover-dark-accent rounded-lg px-3 py-2';

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();

  const tasksResource = useTasks();
  const projectsResource = useProjects();
  const areasResource = useAreas();

  const tasks = tasksResource.data as TaskRecord[];
  const projects = projectsResource.data;
  const areas = areasResource.data;

  const activeTasks = useMemo(
    () =>
      tasks.filter((task) => !task.trashedAt && task.status !== 'completed'),
    [tasks],
  );

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === 'active'),
    [projects],
  );

  const goToRoute = (route: string, taskId?: string) => {
    if (route.startsWith('/project/')) {
      const projectId = route.replace('/project/', '');
      navigate({
        to: '/project/$projectId' as '/inbox',
        params: { projectId },
        search: taskId ? { task: taskId } : undefined,
      });
    } else if (route.startsWith('/area/')) {
      const areaId = route.replace('/area/', '');
      navigate({
        to: '/area/$areaId' as '/inbox',
        params: { areaId },
        search: taskId ? { task: taskId } : undefined,
      });
    } else {
      navigate({
        to: route as '/inbox',
        search: taskId ? { task: taskId } : undefined,
      });
    }
    onClose();
  };

  const getTaskRoute = (task: TaskRecord) => {
    if (task.projectId) return `/project/${task.projectId}`;
    if (task.areaId) return `/area/${task.areaId}`;
    if (task.scheduledDate) {
      const date = parseLocalDate(task.scheduledDate);
      const today = new Date();
      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        return '/today';
      }
      return '/upcoming';
    }
    if (task.status === 'anytime') return '/anytime';
    if (task.status === 'someday') return '/someday';
    return '/inbox';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        position="top"
        showCloseButton={false}
        className="p-0 gap-0 sm:max-w-[560px] bg-popover-dark border-popover-dark-border overflow-hidden dark"
      >
        <Command
          className="bg-transparent [&_[cmdk-group-heading]]:text-popover-dark-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group]]:text-popover-dark-foreground"
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput
            placeholder="Search tasks, projects, areas..."
            className="text-white text-[15px] placeholder:text-popover-dark-muted"
          />

          <CommandList className="max-h-[400px] p-2">
            <CommandEmpty className="text-popover-dark-muted py-8">
              No results found.
            </CommandEmpty>

            {/* Views */}
            <CommandGroup heading="Views">
              <CommandItem
                value="Inbox"
                onSelect={() => goToRoute('/inbox')}
                className={itemClass}
              >
                <InboxIcon className="size-4 text-popover-dark-muted" />
                <span>Inbox</span>
              </CommandItem>
              <CommandItem
                value="Today"
                onSelect={() => goToRoute('/today')}
                className={itemClass}
              >
                <TodayStarIcon className="size-4 text-popover-dark-muted" />
                <span>Today</span>
              </CommandItem>
              <CommandItem
                value="Upcoming"
                onSelect={() => goToRoute('/upcoming')}
                className={itemClass}
              >
                <CalendarIcon className="size-4 text-popover-dark-muted" />
                <span>Upcoming</span>
              </CommandItem>
              <CommandItem
                value="Anytime"
                onSelect={() => goToRoute('/anytime')}
                className={itemClass}
              >
                <LayersIcon className="size-4 text-popover-dark-muted" />
                <span>Anytime</span>
              </CommandItem>
              <CommandItem
                value="Someday"
                onSelect={() => goToRoute('/someday')}
                className={itemClass}
              >
                <ArchiveIcon className="size-4 text-popover-dark-muted" />
                <span>Someday</span>
              </CommandItem>
              <CommandItem
                value="Logbook"
                onSelect={() => goToRoute('/logbook')}
                className={itemClass}
              >
                <BookCheckIcon className="size-4 text-popover-dark-muted" />
                <span>Logbook</span>
              </CommandItem>
              <CommandItem
                value="Trash"
                onSelect={() => goToRoute('/trash')}
                className={itemClass}
              >
                <Trash2Icon className="size-4 text-popover-dark-muted" />
                <span>Trash</span>
              </CommandItem>
            </CommandGroup>

            {/* Tasks */}
            {activeTasks.length > 0 && (
              <>
                <CommandSeparator className="bg-popover-dark-border my-2" />
                <CommandGroup heading="Tasks">
                  {activeTasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={`${task.title} ${task.notes ?? ''}`}
                      onSelect={() => goToRoute(getTaskRoute(task), task.id)}
                      className={itemClass}
                    >
                      <div className="size-4 rounded-full border-2 border-things-blue flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{task.title}</span>
                        {task.notes && (
                          <span className="text-popover-dark-muted text-xs truncate block">
                            {task.notes.slice(0, 50)}
                          </span>
                        )}
                      </div>
                      <CommandShortcut className="text-popover-dark-muted capitalize">
                        task
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Projects */}
            {activeProjects.length > 0 && (
              <>
                <CommandSeparator className="bg-popover-dark-border my-2" />
                <CommandGroup heading="Projects">
                  {activeProjects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.title} ${project.notes ?? ''}`}
                      onSelect={() => goToRoute(`/project/${project.id}`)}
                      className={itemClass}
                    >
                      <ProjectProgressIcon
                        progress={0}
                        className="size-4 text-popover-dark-selected"
                      />
                      <span>{project.title}</span>
                      <CommandShortcut className="text-popover-dark-muted capitalize">
                        project
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Areas */}
            {areas.length > 0 && (
              <>
                <CommandSeparator className="bg-popover-dark-border my-2" />
                <CommandGroup heading="Areas">
                  {areas.map((area) => (
                    <CommandItem
                      key={area.id}
                      value={area.title}
                      onSelect={() => goToRoute(`/area/${area.id}`)}
                      className={itemClass}
                    >
                      <div className="size-4 rounded bg-things-green flex items-center justify-center">
                        <div className="size-2 rounded-sm bg-white/90" />
                      </div>
                      <span>{area.title}</span>
                      <CommandShortcut className="text-popover-dark-muted capitalize">
                        area
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Footer with keyboard hints */}
          <div className="px-4 py-2 border-t border-popover-dark-border flex items-center gap-4 text-popover-dark-muted text-xs">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-popover-dark-accent-hover text-popover-dark-foreground/70">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-popover-dark-accent-hover text-popover-dark-foreground/70">
                ↵
              </kbd>
              <span>Open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-popover-dark-accent-hover text-popover-dark-foreground/70">
                esc
              </kbd>
              <span>Close</span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
