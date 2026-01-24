import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArchiveIcon,
  BookCheckIcon,
  CalendarIcon,
  InboxIcon,
  LayersIcon,
  TodayStarIcon,
  Trash2Icon,
} from '@/components/icons';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import type { TaskRecord } from '@/db/validation';
import { useAreas, useProjects, useTasks } from '@/lib/contexts/DataContext';
import { cn, parseLocalDate } from '@/lib/utils';

type SearchResultType = 'task' | 'project' | 'area' | 'view';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  icon: () => ReactNode;
  route: string;
  taskId?: string;
}

const staticViews: SearchResult[] = [
  {
    id: 'inbox',
    type: 'view',
    title: 'Inbox',
    icon: () => <InboxIcon className="size-4" />,
    route: '/inbox',
  },
  {
    id: 'today',
    type: 'view',
    title: 'Today',
    icon: () => <TodayStarIcon className="size-4" />,
    route: '/today',
  },
  {
    id: 'upcoming',
    type: 'view',
    title: 'Upcoming',
    icon: () => <CalendarIcon className="size-4" />,
    route: '/upcoming',
  },
  {
    id: 'anytime',
    type: 'view',
    title: 'Anytime',
    icon: () => <LayersIcon className="size-4" />,
    route: '/anytime',
  },
  {
    id: 'someday',
    type: 'view',
    title: 'Someday',
    icon: () => <ArchiveIcon className="size-4" />,
    route: '/someday',
  },
  {
    id: 'logbook',
    type: 'view',
    title: 'Logbook',
    icon: () => <BookCheckIcon className="size-4" />,
    route: '/logbook',
  },
  {
    id: 'trash',
    type: 'view',
    title: 'Trash',
    icon: () => <Trash2Icon className="size-4" />,
    route: '/trash',
  },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();

  const tasksResource = useTasks();
  const projectsResource = useProjects();
  const areasResource = useAreas();

  const tasks = tasksResource.data as TaskRecord[];
  const projects = projectsResource.data;
  const areas = areasResource.data;

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    if (!q) {
      return staticViews;
    }

    const matchingViews = staticViews.filter((view) =>
      view.title.toLowerCase().includes(q),
    );
    results.push(...matchingViews);

    const matchingTasks = tasks
      .filter(
        (task) =>
          !task.trashedAt &&
          task.status !== 'completed' &&
          (task.title.toLowerCase().includes(q) ||
            task.notes?.toLowerCase().includes(q)),
      )
      .slice(0, 10)
      .map((task): SearchResult => {
        let route = '/inbox';
        if (task.projectId) {
          route = `/project/${task.projectId}`;
        } else if (task.areaId) {
          route = `/area/${task.areaId}`;
        } else if (task.scheduledDate) {
          const date = parseLocalDate(task.scheduledDate);
          const today = new Date();
          if (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
          ) {
            route = '/today';
          } else {
            route = '/upcoming';
          }
        } else if (task.status === 'anytime') {
          route = '/anytime';
        } else if (task.status === 'someday') {
          route = '/someday';
        }

        return {
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          subtitle: task.notes?.slice(0, 50) || undefined,
          icon: () => (
            <div className="size-4 rounded-full border-2 border-things-blue flex-shrink-0" />
          ),
          route,
          taskId: task.id,
        };
      });
    results.push(...matchingTasks);

    const matchingProjects = projects
      .filter(
        (project) =>
          project.status === 'active' &&
          (project.title.toLowerCase().includes(q) ||
            project.notes?.toLowerCase().includes(q)),
      )
      .slice(0, 5)
      .map(
        (project): SearchResult => ({
          id: `project-${project.id}`,
          type: 'project',
          title: project.title,
          icon: () => <ProjectProgressIcon progress={0} className="size-4" />,
          route: `/project/${project.id}`,
        }),
      );
    results.push(...matchingProjects);

    const matchingAreas = areas
      .filter((area) => area.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map(
        (area): SearchResult => ({
          id: `area-${area.id}`,
          type: 'area',
          title: area.title,
          icon: () => (
            <div className="size-4 rounded bg-things-green flex items-center justify-center">
              <div className="size-2 rounded-sm bg-white/90" />
            </div>
          ),
          route: `/area/${area.id}`,
        }),
      );
    results.push(...matchingAreas);

    return results;
  }, [query, tasks, projects, areas]);

  useEffect(() => {
    const max = searchResults.length - 1;
    if (selectedIndex > max) {
      setSelectedIndex(Math.max(0, max));
    }
  }, [searchResults.length, selectedIndex]);

  const goToRoute = useCallback(
    (route: string, taskId?: string) => {
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
    },
    [navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = searchResults;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          goToRoute(selected.route, selected.taskId);
          onClose();
        }
        break;
      }
    }
  };

  const handleSelect = (result: SearchResult) => {
    goToRoute(result.route, result.taskId);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[15vh]"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-[560px] bg-popover-dark rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-popover-dark-border">
          <Search className="size-5 text-popover-dark-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, projects, areas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-[15px] placeholder:text-popover-dark-muted outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-popover-dark-muted hover:text-white transition-colors"
            >
              <span className="text-xs">ESC</span>
            </button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                    selectedIndex === index
                      ? 'bg-popover-dark-accent'
                      : 'hover:bg-popover-dark-accent/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0',
                      result.type === 'view' && 'text-popover-dark-muted',
                      result.type === 'task' && 'text-things-blue',
                      result.type === 'project' && 'text-popover-dark-selected',
                      result.type === 'area' && 'text-things-green',
                    )}
                  >
                    {result.icon()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[14px] truncate">
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-popover-dark-muted text-xs truncate">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  <span className="text-subtle text-xs capitalize flex-shrink-0">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-popover-dark-muted text-sm">
              No results found
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-popover-dark-border flex items-center gap-4 text-subtle text-xs">
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
      </div>
    </div>,
    document.body,
  );
}
