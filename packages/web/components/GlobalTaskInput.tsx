import { useLocation } from '@tanstack/react-router';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { Calendar, FolderOpen } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { BoxIcon, CheckIcon, InboxIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { CalendarPopover } from '@/components/ui/calendar-popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';
import { ProseEditor } from '@/components/ui/prose-editor';
import { Switch } from '@/components/ui/switch';
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
  const createMoreId = useId();

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

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          showCloseButton
          position="top"
          className="sm:max-w-[900px] p-0 gap-0"
        >
          <DialogHeader className="px-6 pt-6 pb-0">
            <Input
              ref={titleInputRef}
              variant="ghost"
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-[28px] font-bold text-foreground placeholder:text-muted-foreground"
            />
          </DialogHeader>

          <div className="px-6 pb-4">
            <ProseEditor
              value={notes}
              onChange={setNotes}
              placeholder="Add description..."
              className="mt-3 min-h-[100px]"
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
                  ? 'border-border text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
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
                  ? 'border-border text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
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
          <DialogFooter className="px-6 py-4 border-t border-border flex-row items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id={createMoreId}
                checked={createMore}
                onCheckedChange={setCreateMore}
              />
              <Label
                htmlFor={createMoreId}
                className="text-muted-foreground cursor-pointer"
              >
                Create more
              </Label>
            </div>

            <Button onClick={handleSubmit} disabled={!title.trim()}>
              Create task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {datePickerOpen &&
        createPortal(
          <div style={{ ...datePopoverStyle, zIndex: 60 }}>
            <CalendarPopover
              value={scheduledDate}
              onChange={handleDateChange}
              onClose={() => setDatePickerOpen(false)}
            />
          </div>,
          document.body,
        )}

      {projectPickerOpen &&
        createPortal(
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
          </div>,
          document.body,
        )}
    </>
  );
}
