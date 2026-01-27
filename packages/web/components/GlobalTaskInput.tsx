import { useLocation } from '@tanstack/react-router';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { Calendar, FolderOpen, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BoxIcon, CheckIcon, InboxIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import { generateId } from '@/db/schema';
import {
  useAreas,
  useCreateTask,
  useProjects,
} from '@/lib/contexts/DataContext';
import { getAnchoredPosition } from '@/lib/hooks/useAnchoredPosition';
import { useOverlay } from '@/lib/hooks/useOverlay';
import { cn, parseLocalDate } from '@/lib/utils';

interface GlobalTaskInputProps {
  open: boolean;
  onClose: () => void;
}

type ViewContext = {
  status: 'inbox' | 'anytime' | 'someday' | 'scheduled';
  scheduledDate?: string;
  projectId?: string;
  areaId?: string;
};

export function GlobalTaskInput({ open, onClose }: GlobalTaskInputProps) {
  const location = useLocation();

  const projectsResource = useProjects();
  const areasResource = useAreas();
  const createTask = useCreateTask();

  const projects = useMemo(
    () => projectsResource.data.filter((p) => p.status === 'active'),
    [projectsResource.data],
  );
  const areas = areasResource.data;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | undefined>(
    undefined,
  );
  const [projectId, setProjectId] = useState<string | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [createMore, setCreateMore] = useState(false);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const projectButtonRef = useRef<HTMLButtonElement>(null);
  const projectPopoverRef = useOverlay({
    open: projectPickerOpen,
    onClose: () => setProjectPickerOpen(false),
    ignoreRefs: [projectButtonRef],
  });

  const getViewContext = useCallback((): ViewContext => {
    const pathname = location.pathname;

    if (pathname === '/today') {
      return {
        status: 'scheduled',
        scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      };
    }
    if (pathname === '/upcoming') {
      return {
        status: 'scheduled',
        scheduledDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      };
    }
    if (pathname === '/anytime') {
      return { status: 'anytime' };
    }
    if (pathname === '/someday') {
      return { status: 'someday' };
    }
    if (pathname.startsWith('/project/')) {
      const id = pathname.replace('/project/', '');
      const project = projects.find((p) => p.id === id);
      return {
        status: 'anytime',
        projectId: id,
        areaId: project?.areaId ?? undefined,
      };
    }
    if (pathname.startsWith('/area/')) {
      const id = pathname.replace('/area/', '');
      return {
        status: 'anytime',
        areaId: id,
      };
    }
    return { status: 'inbox' };
  }, [location.pathname, projects]);

  useEffect(() => {
    if (open) {
      const context = getViewContext();
      setTitle('');
      setNotes('');
      setScheduledDate(context.scheduledDate);
      setProjectId(context.projectId ?? null);
      setAreaId(context.areaId ?? null);
      setDatePickerOpen(false);
      setProjectPickerOpen(false);

      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [open, getViewContext]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (datePickerOpen) {
          setDatePickerOpen(false);
        } else if (projectPickerOpen) {
          setProjectPickerOpen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, datePickerOpen, projectPickerOpen, onClose]);

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

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const context = getViewContext();

    createTask.mutate({
      id: generateId(),
      title: trimmedTitle,
      notes: notes.trim() || null,
      status: scheduledDate ? 'scheduled' : context.status,
      scheduledDate: scheduledDate ?? null,
      deadline: null,
      projectId: projectId,
      headingId: null,
      areaId: areaId,
      repeatingRuleId: null,
    });

    if (createMore) {
      setTitle('');
      setNotes('');
      setTimeout(() => titleInputRef.current?.focus(), 10);
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const dateDisplay = useMemo(() => {
    if (!scheduledDate) return 'When';
    const date = parseLocalDate(scheduledDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  }, [scheduledDate]);

  const projectDisplay = useMemo(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      return project?.title ?? 'Project';
    }
    if (areaId) {
      const area = areas.find((a) => a.id === areaId);
      return area?.title ?? 'Area';
    }
    return 'List';
  }, [projectId, areaId, projects, areas]);

  const projectsWithoutArea = useMemo(
    () => projects.filter((p) => !p.areaId),
    [projects],
  );

  const areasWithProjects = useMemo(
    () =>
      areas.map((area) => ({
        ...area,
        projects: projects.filter((p) => p.areaId === area.id),
      })),
    [areas, projects],
  );

  const handleSelectProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    setProjectId(id);
    setAreaId(project?.areaId ?? null);
    setProjectPickerOpen(false);
  };

  const handleSelectArea = (id: string) => {
    setProjectId(null);
    setAreaId(id);
    setProjectPickerOpen(false);
  };

  const handleSelectInbox = () => {
    setProjectId(null);
    setAreaId(null);
    setProjectPickerOpen(false);
  };

  const handleDateChange = (date: string | undefined) => {
    setScheduledDate(date);
    setDatePickerOpen(false);
  };

  const dateAnchorRect = dateButtonRef.current?.getBoundingClientRect() ?? null;
  const datePopoverStyle = getAnchoredPosition(dateAnchorRect, {
    popoverHeight: 340,
  });

  const projectAnchorRect =
    projectButtonRef.current?.getBoundingClientRect() ?? null;
  const projectPopoverStyle = getAnchoredPosition(projectAnchorRect, {
    popoverHeight: 280,
  });

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-[10vh]"
        onClick={handleOverlayClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleOverlayClick(e as unknown as React.MouseEvent);
          }
        }}
        role="button"
        tabIndex={-1}
      >
        <div
          className="w-full max-w-[900px] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') {
              e.stopPropagation();
            }
          }}
        >
          {/* Main input area */}
          <div className="px-6 py-4">
            <div className="flex items-start gap-2">
              <input
                ref={titleInputRef}
                type="text"
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 text-2xl font-bold placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1"
              >
                <X className="size-5" />
              </Button>
            </div>
            <textarea
              ref={notesInputRef}
              placeholder="Add description..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-3 bg-transparent text-gray-900 dark:text-gray-100 text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none resize-none min-h-[100px]"
            />
          </div>

          {/* Properties bar */}
          <div className="px-6 pb-4 flex items-center gap-2">
            <Button
              ref={dateButtonRef}
              variant="outline"
              size="sm"
              onClick={() => {
                setProjectPickerOpen(false);
                setDatePickerOpen(!datePickerOpen);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg text-[13px] font-medium',
                scheduledDate
                  ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <Calendar className="size-3.5" />
              <span>{dateDisplay}</span>
            </Button>

            <Button
              ref={projectButtonRef}
              variant="outline"
              size="sm"
              onClick={() => {
                setDatePickerOpen(false);
                setProjectPickerOpen(!projectPickerOpen);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg text-[13px] font-medium',
                projectId || areaId
                  ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              {projectId ? (
                <ProjectProgressIcon
                  progress={0}
                  size={14}
                  className="text-things-blue"
                />
              ) : areaId ? (
                <BoxIcon className="size-3.5 text-things-green" />
              ) : (
                <FolderOpen className="size-3.5" />
              )}
              <span>{projectDisplay}</span>
            </Button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setCreateMore(!createMore)}
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors',
                    createMore
                      ? 'bg-things-blue'
                      : 'bg-gray-300 dark:bg-gray-600',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                      createMore && 'translate-x-4',
                    )}
                  />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-400">
                  Create more
                </span>
              </label>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                title.trim()
                  ? 'bg-things-blue text-white hover:bg-things-blue/90 shadow-sm'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
              )}
            >
              Create task
            </Button>
          </div>
        </div>
      </div>

      {datePickerOpen && (
        <div style={{ ...datePopoverStyle, zIndex: 60 }}>
          <CalendarPopover
            value={scheduledDate}
            onChange={handleDateChange}
            onClose={() => setDatePickerOpen(false)}
          />
        </div>
      )}

      {projectPickerOpen && (
        <div
          ref={projectPopoverRef}
          className="w-[240px] rounded-xl bg-popover-dark overflow-hidden"
          style={{ ...projectPopoverStyle, zIndex: 60 }}
        >
          <div className="max-h-64 overflow-y-auto overscroll-contain py-2">
            <Button
              variant="ghost"
              onClick={handleSelectInbox}
              className={cn(
                'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-bold text-popover-dark-foreground justify-start',
                'hover:bg-popover-dark-accent',
              )}
            >
              <InboxIcon className="w-3.5 h-3.5 text-popover-dark-muted" />
              <span className="flex-1 text-left">Inbox</span>
              {!projectId && !areaId && (
                <CheckIcon className="w-3.5 h-3.5 text-popover-dark-selected" />
              )}
            </Button>

            <div className="my-1 border-t border-popover-dark-border" />

            {projectsWithoutArea.length > 0 && (
              <>
                {projectsWithoutArea.map((project) => (
                  <Button
                    key={project.id}
                    variant="ghost"
                    onClick={() => handleSelectProject(project.id)}
                    className={cn(
                      'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-semibold text-popover-dark-foreground justify-start',
                      'hover:bg-popover-dark-accent',
                    )}
                  >
                    <ProjectProgressIcon
                      progress={0}
                      size={12}
                      className="text-popover-dark-selected"
                    />
                    <span className="flex-1 text-left truncate">
                      {project.title}
                    </span>
                    {projectId === project.id && (
                      <CheckIcon className="w-3.5 h-3.5 text-popover-dark-selected" />
                    )}
                  </Button>
                ))}
              </>
            )}

            {areasWithProjects.map((area, index) => (
              <div key={area.id}>
                {(index > 0 || projectsWithoutArea.length > 0) && (
                  <div className="my-1 border-t border-popover-dark-border" />
                )}

                <Button
                  variant="ghost"
                  onClick={() => handleSelectArea(area.id)}
                  className={cn(
                    'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-extrabold text-popover-dark-foreground justify-start',
                    'hover:bg-popover-dark-accent',
                  )}
                >
                  <BoxIcon className="w-3 h-3 text-things-green" />
                  <span className="flex-1 text-left truncate">
                    {area.title}
                  </span>
                  {!projectId && areaId === area.id && (
                    <CheckIcon className="w-3.5 h-3.5 text-popover-dark-selected" />
                  )}
                </Button>

                {area.projects.map((project) => (
                  <Button
                    key={project.id}
                    variant="ghost"
                    onClick={() => handleSelectProject(project.id)}
                    className={cn(
                      'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-semibold text-popover-dark-foreground justify-start',
                      'hover:bg-popover-dark-accent',
                    )}
                  >
                    <ProjectProgressIcon
                      progress={0}
                      size={12}
                      className="text-popover-dark-selected"
                    />
                    <span className="flex-1 text-left truncate">
                      {project.title}
                    </span>
                    {projectId === project.id && (
                      <CheckIcon className="w-3.5 h-3.5 text-popover-dark-selected" />
                    )}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
