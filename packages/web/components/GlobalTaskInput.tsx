import { useLocation } from '@tanstack/react-router';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { Calendar, FolderOpen } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BoxIcon, CheckIcon, InboxIcon } from '@/components/icons';
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
  const [scheduledDate, setScheduledDate] = useState<string | undefined>(
    undefined,
  );
  const [projectId, setProjectId] = useState<string | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
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
      setScheduledDate(context.scheduledDate);
      setProjectId(context.projectId ?? null);
      setAreaId(context.areaId ?? null);
      setDatePickerOpen(false);
      setProjectPickerOpen(false);

      setTimeout(() => inputRef.current?.focus(), 10);
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
      notes: null,
      status: scheduledDate ? 'scheduled' : context.status,
      scheduledDate: scheduledDate ?? null,
      deadline: null,
      projectId: projectId,
      headingId: null,
      areaId: areaId,
      repeatingRuleId: null,
    });

    onClose();
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
        className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]"
        onClick={handleOverlayClick}
        role="presentation"
      >
        <div
          className="w-full max-w-[480px] bg-popover-dark rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // Let Escape propagate so the document handler can close the dialog
            if (e.key !== 'Escape') {
              e.stopPropagation();
            }
          }}
        >
          <div className="px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="New To-Do"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-popover-dark-foreground text-[17px] font-medium placeholder:text-popover-dark-muted outline-none"
            />
          </div>

          <div className="px-3 pb-3 flex items-center gap-2">
            <button
              ref={dateButtonRef}
              type="button"
              onClick={() => {
                setProjectPickerOpen(false);
                setDatePickerOpen(!datePickerOpen);
              }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                scheduledDate
                  ? 'bg-popover-dark-accent text-popover-dark-foreground'
                  : 'bg-popover-dark-accent/50 text-popover-dark-muted hover:bg-popover-dark-accent hover:text-popover-dark-foreground',
              )}
            >
              <Calendar className="size-3.5" />
              <span>{dateDisplay}</span>
            </button>

            <button
              ref={projectButtonRef}
              type="button"
              onClick={() => {
                setDatePickerOpen(false);
                setProjectPickerOpen(!projectPickerOpen);
              }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                projectId || areaId
                  ? 'bg-popover-dark-accent text-popover-dark-foreground'
                  : 'bg-popover-dark-accent/50 text-popover-dark-muted hover:bg-popover-dark-accent hover:text-popover-dark-foreground',
              )}
            >
              {projectId ? (
                <ProjectProgressIcon
                  progress={0}
                  size={14}
                  className="text-popover-dark-selected"
                />
              ) : areaId ? (
                <BoxIcon className="size-3.5 text-things-green" />
              ) : (
                <FolderOpen className="size-3.5" />
              )}
              <span>{projectDisplay}</span>
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors',
                title.trim()
                  ? 'bg-popover-dark-selected text-popover-dark-foreground hover:bg-popover-dark-selected/90'
                  : 'bg-popover-dark-accent text-popover-dark-muted cursor-not-allowed',
              )}
            >
              Save
            </button>
          </div>

          <div className="px-4 py-2 border-t border-popover-dark-border flex items-center gap-4 text-popover-dark-muted text-xs">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-popover-dark-border text-popover-dark-muted">
                ↵
              </kbd>
              <span>Save</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-popover-dark-border text-popover-dark-muted">
                esc
              </kbd>
              <span>Close</span>
            </span>
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
            <button
              type="button"
              onClick={handleSelectInbox}
              className={cn(
                'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-bold text-popover-dark-foreground',
                'hover:bg-popover-dark-accent transition-colors',
              )}
            >
              <InboxIcon className="w-3.5 h-3.5 text-popover-dark-muted" />
              <span className="flex-1 text-left">Inbox</span>
              {!projectId && !areaId && (
                <CheckIcon className="w-3.5 h-3.5 text-popover-dark-selected" />
              )}
            </button>

            <div className="my-1 border-t border-popover-dark-border" />

            {projectsWithoutArea.length > 0 && (
              <>
                {projectsWithoutArea.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelectProject(project.id)}
                    className={cn(
                      'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-semibold text-popover-dark-foreground',
                      'hover:bg-popover-dark-accent transition-colors',
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
                  </button>
                ))}
                <div className="my-1 border-t border-popover-dark-border" />
              </>
            )}

            {areasWithProjects.map((area, index) => (
              <div key={area.id}>
                {(index > 0 || projectsWithoutArea.length > 0) && (
                  <div className="my-1 border-t border-popover-dark-border" />
                )}

                <button
                  type="button"
                  onClick={() => handleSelectArea(area.id)}
                  className={cn(
                    'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-extrabold text-popover-dark-foreground',
                    'hover:bg-popover-dark-accent transition-colors',
                  )}
                >
                  <BoxIcon className="w-3 h-3 text-things-green" />
                  <span className="flex-1 text-left truncate">
                    {area.title}
                  </span>
                  {!projectId && areaId === area.id && (
                    <CheckIcon className="w-3.5 h-3.5 text-popover-dark-selected" />
                  )}
                </button>

                {area.projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelectProject(project.id)}
                    className={cn(
                      'flex items-center gap-2 w-full h-[28px] px-3 text-[13px] font-semibold text-popover-dark-foreground',
                      'hover:bg-popover-dark-accent transition-colors',
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
                  </button>
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
