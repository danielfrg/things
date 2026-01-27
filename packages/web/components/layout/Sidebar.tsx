import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { isBefore, isToday, startOfDay } from 'date-fns';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookCheckIcon,
  BoxIcon,
  CalendarIcon,
  InboxIcon,
  LayersIcon,
  PlusIcon,
  Settings2Icon,
  SomedayIcon,
  TodayStarIcon,
  Trash2Icon,
} from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectProgressIcon } from '@/components/ui/project-progress-icon';

import { useSidebar } from '@/components/ui/sidebar';
import { generateId } from '@/db/schema';
import {
  useAreas,
  useCreateArea,
  useCreateProject,
  useProjects,
  useTasks,
  useUpdateArea,
  useUpdateProject,
  useUpdateTask,
} from '@/lib/contexts/DataContext';
import {
  type CleanupFn,
  type Edge,
  getAreaHeaderDragData,
  getAreaHeaderDropTargetData,
  getProjectDragData,
  getProjectDropTargetData,
  getSidebarAreaDropTargetData,
  getSidebarNavDropTargetData,
  getSidebarProjectDropTargetData,
  isAreaHeaderDragData,
  isAreaHeaderDropTargetData,
  isDraggingAnAreaHeader,
  isDraggingAProject,
  isDraggingATask,
  isProjectDragData,
  isProjectDropTargetData,
  isSidebarAreaDropTargetData,
  isSidebarNavDropTargetData,
  isSidebarProjectDropTargetData,
  isTaskDragData,
  loadDnd,
} from '@/lib/dnd';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { cn, parseLocalDate } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  count?: number;
  secondary?: boolean;
  dropTarget?: 'inbox' | 'today' | 'anytime' | 'someday';
}

function NavItem(props: NavItemProps) {
  const router = useRouterState();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const isActive = router.location.pathname === props.to;
  const [isTaskOver, setIsTaskOver] = useState(false);

  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!props.dropTarget) return;

    const element = ref.current;
    if (!element) return;

    let cleanup: CleanupFn | undefined;
    let disposed = false;

    loadDnd().then((dnd) => {
      if (disposed || !ref.current) return;

      cleanup = dnd.dropTargetForElements({
        element,
        canDrop: isDraggingATask,
        getData: () =>
          getSidebarNavDropTargetData({ target: props.dropTarget ?? 'inbox' }),
        onDragEnter({ source }: any) {
          if (!isTaskDragData(source.data)) return;
          setIsTaskOver(true);
        },
        onDragLeave() {
          setIsTaskOver(false);
        },
        onDrop() {
          setIsTaskOver(false);
        },
      });
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [props.dropTarget]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof document === 'undefined') return;

    // On mobile, if already on this route, just close sidebar
    if (isMobile && isActive) {
      e.preventDefault();
      setOpenMobile(false);
      return;
    }

    // On mobile, close sidebar and let the link navigate
    if (isMobile) {
      setOpenMobile(false);
      return;
    }

    // Check if pending from pointerDown
    if (e.currentTarget.dataset.navPending === '1') {
      e.preventDefault();
      return;
    }

    const open = Boolean(document.querySelector('[data-task-detail-card]'));
    if (!open) return;

    e.preventDefault();

    if (isActive) return;

    setTimeout(() => {
      navigate({ to: props.to });
    }, 260);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (typeof document === 'undefined') return;
    if (isMobile) return;

    const open = Boolean(document.querySelector('[data-task-detail-card]'));
    if (!open) return;

    window.dispatchEvent(new CustomEvent('things:close-task-details'));

    e.preventDefault();

    // TanStack Router can navigate before `click` in some cases, so we gate here.
    const target = e.currentTarget;
    target.dataset.navPending = '1';

    if (isActive) return;

    setTimeout(() => {
      delete target.dataset.navPending;
      navigate({ to: props.to });
    }, 260);
  };

  return (
    <Link
      ref={ref}
      to={props.to}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-3 mx-2 md:mx-2 px-3 md:px-2 py-3 md:py-1.5 rounded-md text-lg md:text-[13px] font-semibold transition-colors',
        'md:hover:bg-sidebar-accent',
        !isMobile && isActive && 'bg-sidebar-accent',
        props.secondary && 'text-muted-foreground',
        isTaskOver && 'bg-things-blue/20 ring-2 ring-things-blue',
      )}
    >
      <span
        className={cn(
          'w-6 h-6 md:w-5 md:h-5 flex items-center justify-center',
          props.secondary ? 'text-muted-foreground' : props.iconColor,
        )}
      >
        {props.icon}
      </span>
      <span
        className={cn(
          'flex-1 truncate',
          props.secondary ? 'text-muted-foreground' : 'text-sidebar-foreground',
        )}
      >
        {props.label}
      </span>
      {props.count !== undefined && props.count > 0 && (
        <span className="text-sm md:text-xs text-muted-foreground">
          {props.count}
        </span>
      )}
    </Link>
  );
}

interface ProjectItemProps {
  projectId: string;
  label: string;
  progress: number;
  areaId?: string | null;
}

type ProjectItemState =
  | { type: 'idle' }
  | { type: 'is-dragging' }
  | { type: 'is-dragging-and-left-self' }
  | { type: 'is-over'; dragging: DOMRect; closestEdge: Edge }
  | { type: 'is-task-over' }
  | { type: 'preview'; container: HTMLElement; dragging: DOMRect };

const idle: ProjectItemState = { type: 'idle' };

function ProjectShadow({ dragging }: { dragging: DOMRect }) {
  return (
    <div
      className="flex-shrink-0 rounded-md bg-secondary/80 mx-2 transition-all duration-150"
      style={{ height: `${dragging.height}px` }}
    />
  );
}

interface AreaHeaderProps {
  areaId: string;
  title: string;
}

function AreaHeader(props: AreaHeaderProps) {
  const navigate = useNavigate();
  const router = useRouterState();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  const isActive = router.location.pathname === `/area/${props.areaId}`;

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
      if (!isActive) {
        navigate({ to: '/area/$areaId', params: { areaId: props.areaId } });
      }
      return;
    }
    navigate({ to: '/area/$areaId', params: { areaId: props.areaId } });
  };

  return (
    <button
      type="button"
      className="flex-1 text-left text-lg md:text-[13px] font-medium text-sidebar-foreground cursor-pointer select-none flex items-center gap-2"
      onClick={handleClick}
    >
      <BoxIcon className="w-4 h-4 text-muted-foreground" />
      <span className="truncate">{props.title}</span>
    </button>
  );
}

interface AreaItemProps {
  areaId: string;
  title: string;
  projects: Array<{
    id: string;
    title: string;
    progress: number;
    areaId?: string | null;
  }>;
}

type AreaItemState =
  | { type: 'idle' }
  | { type: 'is-dragging' }
  | { type: 'is-over'; dragging: DOMRect; closestEdge: Edge }
  | { type: 'is-task-over' }
  | { type: 'preview'; container: HTMLElement; dragging: DOMRect };

const areaIdle: AreaItemState = { type: 'idle' };

function AreaShadow(props: { dragging: DOMRect }) {
  return (
    <div
      className="flex-shrink-0 rounded-md bg-secondary/80 mx-2 mb-4 transition-all duration-150"
      style={{ height: `${props.dragging.height}px` }}
    />
  );
}

function AreaItem(props: AreaItemProps) {
  const router = useRouterState();
  const isMobile = useIsMobile();
  const outerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AreaItemState>(areaIdle);

  const isActive = router.location.pathname === `/area/${props.areaId}`;

  useEffect(() => {
    let disposed = false;
    let cleanup: CleanupFn | undefined;

    const outer = outerRef.current;
    const dragHandle = dragHandleRef.current;
    if (!outer || !dragHandle) return;

    loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.combine(
        dnd.draggable({
          element: dragHandle,
          getInitialData: () =>
            getAreaHeaderDragData({
              areaId: props.areaId,
              rect: outer.getBoundingClientRect(),
            }),
          onGenerateDragPreview({ nativeSetDragImage, location, source }: any) {
            if (!isAreaHeaderDragData(source.data)) return;

            dnd.setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: dnd.preserveOffsetOnSource({
                element: dragHandle,
                input: location.current.input,
              }),
              render({ container }: any) {
                setState({
                  type: 'preview',
                  container,
                  dragging: outer.getBoundingClientRect(),
                });
              },
            });
          },
          onDragStart() {
            setState({ type: 'is-dragging' });
            if (navigator.vibrate) navigator.vibrate(10);
          },
          onDrop() {
            setState(areaIdle);
          },
        }),
        dnd.dropTargetForElements({
          element: outer,
          canDrop: isDraggingAnAreaHeader,
          getData: ({ input }: any) => {
            const data = getAreaHeaderDropTargetData({ areaId: props.areaId });
            return dnd.attachClosestEdge(data, {
              element: outer,
              input,
              allowedEdges: ['top', 'bottom'],
            });
          },
          onDragEnter({ source, self }: any) {
            if (!isAreaHeaderDragData(source.data)) return;
            if (source.data.areaId === props.areaId) return;
            const closestEdge = dnd.extractClosestEdge(self.data);
            if (!closestEdge) return;
            setState({
              type: 'is-over',
              dragging: source.data.rect,
              closestEdge,
            });
          },
          onDrag({ source, self }: any) {
            if (!isAreaHeaderDragData(source.data)) return;
            if (source.data.areaId === props.areaId) return;
            const closestEdge = dnd.extractClosestEdge(self.data);
            if (!closestEdge) return;
            const proposed: AreaItemState = {
              type: 'is-over',
              dragging: source.data.rect,
              closestEdge,
            };
            setState((current) => {
              if (current.type === 'is-over' && proposed.type === 'is-over') {
                if (current.closestEdge === proposed.closestEdge)
                  return current;
              }
              return proposed;
            });
          },
          onDragLeave({ source }: any) {
            if (!isAreaHeaderDragData(source.data)) return;
            setState(areaIdle);
          },
          onDrop() {
            setState(areaIdle);
          },
        }),
        // Drop target for tasks - move task into this area (no project)
        dnd.dropTargetForElements({
          element: dragHandle,
          canDrop: isDraggingATask,
          getData: () => getSidebarAreaDropTargetData({ areaId: props.areaId }),
          onDragEnter({ source }: any) {
            if (!isTaskDragData(source.data)) return;
            setState({ type: 'is-task-over' });
          },
          onDragLeave({ source }: any) {
            if (!isTaskDragData(source.data)) return;
            setState(areaIdle);
          },
          onDrop() {
            setState(areaIdle);
          },
        }),
      );
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [props.areaId]);

  const outerStyles: Record<AreaItemState['type'], string | undefined> = {
    idle: undefined,
    'is-dragging': 'opacity-0',
    'is-over': undefined,
    'is-task-over': undefined,
    preview: 'opacity-0',
  };

  return (
    <>
      <div
        ref={outerRef}
        className={cn('flex-shrink-0 mb-4', outerStyles[state.type])}
      >
        {state.type === 'is-over' && state.closestEdge === 'top' && (
          <AreaShadow dragging={state.dragging} />
        )}

        <div>
          <div
            ref={dragHandleRef}
            className={cn(
              'flex items-center justify-between mx-2 px-3 md:px-2 py-3 md:py-1.5 rounded-md group md:cursor-grab md:active:cursor-grabbing md:hover:bg-sidebar-accent',
              !isMobile && isActive && 'bg-sidebar-accent',
              state.type === 'is-task-over' &&
                'bg-things-blue/20 ring-2 ring-things-blue',
            )}
          >
            <AreaHeader areaId={props.areaId} title={props.title} />
          </div>
          <div className="">
            {props.projects.length > 0 ? (
              props.projects.map((project) => (
                <ProjectItem
                  key={project.id}
                  projectId={project.id}
                  label={project.title}
                  progress={project.progress}
                  areaId={props.areaId}
                />
              ))
            ) : (
              <AreaDropZone areaId={props.areaId} />
            )}
          </div>
        </div>

        {state.type === 'is-over' && state.closestEdge === 'bottom' && (
          <AreaShadow dragging={state.dragging} />
        )}
      </div>

      {state.type === 'preview' &&
        createPortal(
          <div className="mb-4">
            <div className="flex items-center justify-between mx-2 px-2 py-1 group bg-sidebar shadow-lg border border-border rounded-md">
              <span className="flex-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <BoxIcon className="w-3.5 h-3.5" />
                {props.title}
              </span>
            </div>
          </div>,
          state.container,
        )}
    </>
  );
}

interface AreaDropZoneProps {
  areaId: string;
}

type AreaDropZoneState =
  | { type: 'idle' }
  | { type: 'is-over'; dragging: DOMRect };

function AreaDropZone(props: AreaDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AreaDropZoneState>({ type: 'idle' });

  useEffect(() => {
    let disposed = false;
    let cleanup: CleanupFn | undefined;

    const element = ref.current;
    if (!element) return;

    loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.dropTargetForElements({
        element,
        canDrop: isDraggingAProject,
        getData: () => ({ areaId: props.areaId, isEmptyAreaDropZone: true }),
        onDragEnter({ source }: any) {
          if (!isProjectDragData(source.data)) return;
          setState({ type: 'is-over', dragging: source.data.rect });
        },
        onDragLeave() {
          setState({ type: 'idle' });
        },
        onDrop() {
          setState({ type: 'idle' });
        },
      });
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [props.areaId]);

  return (
    <div
      ref={ref}
      className={cn(
        'mx-2 rounded-md transition-all duration-150',
        state.type === 'is-over'
          ? 'bg-secondary/80'
          : 'bg-transparent hover:bg-secondary/40',
      )}
      style={{
        height:
          state.type === 'is-over' ? `${state.dragging.height}px` : '32px',
      }}
    />
  );
}

type NoAreaDropZoneState =
  | { type: 'idle' }
  | { type: 'is-dragging' }
  | { type: 'is-over'; dragging: DOMRect };

function NoAreaDropZone() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<NoAreaDropZoneState>({ type: 'idle' });

  useEffect(() => {
    let disposed = false;
    let cleanup: CleanupFn | undefined;

    const element = ref.current;
    if (!element) return;

    loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.combine(
        dnd.dropTargetForElements({
          element,
          canDrop: isDraggingAProject,
          getData: () => ({ areaId: undefined, isEmptyAreaDropZone: true }),
          onDragEnter({ source }: any) {
            if (!isProjectDragData(source.data)) return;
            setState({ type: 'is-over', dragging: source.data.rect });
          },
          onDragLeave() {
            setState({ type: 'is-dragging' });
          },
          onDrop() {
            setState({ type: 'idle' });
          },
        }),
        dnd.monitorForElements({
          canMonitor: isDraggingAProject,
          onDragStart() {
            setState({ type: 'is-dragging' });
            if (navigator.vibrate) navigator.vibrate(10);
          },
          onDrop() {
            setState({ type: 'idle' });
          },
        }),
      );
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'mx-2 mb-2 rounded-md transition-all',
        state.type === 'is-over' && 'bg-secondary/80',
        state.type === 'is-dragging' && 'bg-secondary/40',
      )}
      style={{
        height:
          state.type === 'is-over'
            ? `${state.dragging.height}px`
            : state.type === 'is-dragging'
              ? '32px'
              : '0px',
        overflow: 'hidden',
      }}
    />
  );
}

function ProjectItem(props: ProjectItemProps) {
  const router = useRouterState();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const isActive = router.location.pathname === `/project/${props.projectId}`;

  const outerRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [state, setState] = useState<ProjectItemState>(idle);

  useEffect(() => {
    let disposed = false;
    let cleanup: CleanupFn | undefined;

    const outer = outerRef.current;
    const link = linkRef.current;
    if (!outer || !link) return;

    loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.combine(
        dnd.draggable({
          element: link,
          getInitialData: () =>
            getProjectDragData({
              projectId: props.projectId,
              rect: link.getBoundingClientRect(),
              areaId: props.areaId ?? undefined,
            }),
          onGenerateDragPreview({ nativeSetDragImage, location, source }: any) {
            if (!isProjectDragData(source.data)) return;
            dnd.setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: dnd.preserveOffsetOnSource({
                element: link,
                input: location.current.input,
              }),
              render({ container }: any) {
                setState({
                  type: 'preview',
                  container,
                  dragging: link.getBoundingClientRect(),
                });
              },
            });
          },
          onDragStart() {
            setState({ type: 'is-dragging' });
            if (navigator.vibrate) navigator.vibrate(10);
          },
          onDrop() {
            setState(idle);
          },
        }),
        dnd.dropTargetForElements({
          element: outer,
          getIsSticky: () => true,
          canDrop: isDraggingAProject,
          getData: ({ input }: any) => {
            const data = getProjectDropTargetData({
              projectId: props.projectId,
              areaId: props.areaId ?? undefined,
            });
            return dnd.attachClosestEdge(data, {
              element: outer,
              input,
              allowedEdges: ['top', 'bottom'],
            });
          },
          onDragEnter({ source, self }: any) {
            if (!isProjectDragData(source.data)) return;
            if (source.data.projectId === props.projectId) return;
            const closestEdge = dnd.extractClosestEdge(self.data);
            if (!closestEdge) return;
            setState({
              type: 'is-over',
              dragging: source.data.rect,
              closestEdge,
            });
          },
          onDrag({ source, self }: any) {
            if (!isProjectDragData(source.data)) return;
            if (source.data.projectId === props.projectId) return;
            const closestEdge = dnd.extractClosestEdge(self.data);
            if (!closestEdge) return;
            const proposed: ProjectItemState = {
              type: 'is-over',
              dragging: source.data.rect,
              closestEdge,
            };
            setState((current) => {
              if (current.type === 'is-over' && proposed.type === 'is-over') {
                if (current.closestEdge === proposed.closestEdge)
                  return current;
              }
              return proposed;
            });
          },
          onDragLeave({ source }: any) {
            if (!isProjectDragData(source.data)) return;
            if (source.data.projectId === props.projectId) {
              setState({ type: 'is-dragging-and-left-self' });
              return;
            }
            setState(idle);
          },
          onDrop() {
            setState(idle);
          },
        }),
        dnd.dropTargetForElements({
          element: link,
          canDrop: isDraggingATask,
          getData: () =>
            getSidebarProjectDropTargetData({ projectId: props.projectId }),
          onDragEnter({ source }: any) {
            if (!isTaskDragData(source.data)) return;
            setState({ type: 'is-task-over' });
          },
          onDragLeave({ source }: any) {
            if (!isTaskDragData(source.data)) return;
            setState(idle);
          },
          onDrop() {
            setState(idle);
          },
        }),
      );
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [props.projectId, props.areaId]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isMobile) return;
    // On mobile, close sidebar
    setOpenMobile(false);
    if (isActive) {
      e.preventDefault();
    }
    // Otherwise let the link navigate normally
  };

  const outerStyles: Partial<Record<ProjectItemState['type'], string>> = {
    idle: undefined,
    'is-dragging': 'opacity-0',
    'is-dragging-and-left-self': 'hidden',
    'is-over': undefined,
    'is-task-over': undefined,
    preview: 'opacity-0',
  };

  const linkStyles: Partial<Record<ProjectItemState['type'], string>> = {
    idle: 'md:hover:bg-sidebar-accent md:cursor-grab',
    'is-dragging': '',
    'is-dragging-and-left-self': '',
    'is-task-over': 'bg-things-blue/20 ring-2 ring-things-blue',
    'is-over': undefined,
    preview: '',
  };

  return (
    <>
      <div
        ref={outerRef}
        className={cn(
          'm-0 flex flex-shrink-0 flex-col',
          outerStyles[state.type],
        )}
      >
        {state.type === 'is-over' && state.closestEdge === 'top' && (
          <ProjectShadow dragging={state.dragging} />
        )}

        <Link
          ref={linkRef}
          to="/project/$projectId"
          params={{ projectId: props.projectId }}
          onClick={handleClick}
          className={cn(
            'flex items-center gap-2 mx-2 px-3 md:px-2 py-3 md:py-1.5 rounded-md text-lg md:text-[13px] font-medium transition-colors',
            !isMobile && isActive && 'bg-sidebar-accent',
            linkStyles[state.type],
          )}
        >
          <ProjectProgressIcon
            progress={props.progress}
            size={16}
            variant="sidebar"
            className="text-project-progress"
          />
          <span className="flex-1 truncate text-sidebar-foreground">
            {props.label}
          </span>
        </Link>

        {state.type === 'is-over' && state.closestEdge === 'bottom' && (
          <ProjectShadow dragging={state.dragging} />
        )}
      </div>

      {state.type === 'preview' &&
        createPortal(
          <div
            className="flex items-center gap-2 mx-2 px-2 py-1.5 rounded-md text-[13px] font-medium bg-sidebar shadow-lg border border-border"
            style={{
              width: `${state.dragging.width}px`,
              height: `${state.dragging.height}px`,
            }}
          >
            <ProjectProgressIcon
              progress={props.progress}
              size={16}
              variant="sidebar"
              className="text-project-progress"
            />
            <span className="flex-1 truncate text-sidebar-foreground">
              {props.label}
            </span>
          </div>,
          state.container,
        )}
    </>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();

  const tasksResource = useTasks();
  const projectsResource = useProjects();
  const areasResource = useAreas();

  // Mutation hooks
  const updateTask = useUpdateTask();
  const updateProject = useUpdateProject();
  const updateArea = useUpdateArea();
  const createProject = useCreateProject();
  const createArea = useCreateArea();

  const tasks = tasksResource.data;
  const projects = projectsResource.data;
  const areas = areasResource.data;

  // Since isToday/isBefore are external pure functions, we don't strictly need to memoize them,
  // but we can memoize the today date to avoid recalculating startOfDay on every render.
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const isDateOverdue = useCallback(
    (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      return isBefore(startOfDay(parseLocalDate(dateStr)), todayStart);
    },
    [todayStart],
  );

  const isDateToday = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    return isToday(parseLocalDate(dateStr));
  }, []);

  const counts = useMemo(() => {
    if (!tasks) return { inbox: 0, today: 0 };

    return tasks.reduce(
      (acc, task) => {
        if (task.trashedAt) return acc;

        // Inbox: no project, area, scheduled date, and status is inbox
        if (
          task.status === 'inbox' &&
          !task.projectId &&
          !task.areaId &&
          !task.scheduledDate
        ) {
          acc.inbox++;
        }

        // Today: not completed and has overdue/today scheduled or deadline
        if (task.status !== 'completed') {
          const due =
            isDateOverdue(task.scheduledDate) ||
            isDateToday(task.scheduledDate) ||
            isDateOverdue(task.deadline) ||
            isDateToday(task.deadline);
          if (due) acc.today++;
        }

        return acc;
      },
      { inbox: 0, today: 0 },
    );
  }, [tasks, isDateOverdue, isDateToday]);

  const getProjectProgress = useCallback(
    (projectId: string) => {
      if (!tasks) return 0;
      const projectTasks = tasks.filter(
        (task) => task.projectId === projectId && !task.trashedAt,
      );
      if (projectTasks.length === 0) return 0;
      const completed = projectTasks.filter(
        (task) => task.status === 'completed',
      ).length;
      return Math.round((completed / projectTasks.length) * 100);
    },
    [tasks],
  );

  const activeProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => p.status === 'active');
  }, [projects]);

  const projectsWithProgress = useMemo(() => {
    return activeProjects
      .sort((a, b) => a.position - b.position)
      .map((proj) => ({
        id: proj.id,
        title: proj.title,
        progress: getProjectProgress(proj.id),
        areaId: proj.areaId,
      }));
  }, [activeProjects, getProjectProgress]);

  const projectsWithoutArea = useMemo(() => {
    return projectsWithProgress.filter((proj) => !proj.areaId);
  }, [projectsWithProgress]);

  const sortedAreas = useMemo(() => {
    if (!areas) return [];
    return [...areas].sort((x, y) => x.position - y.position);
  }, [areas]);

  const areasWithProjects = useMemo(() => {
    return sortedAreas.map((area) => ({
      ...area,
      projects: projectsWithProgress.filter((p) => p.areaId === area.id),
    }));
  }, [sortedAreas, projectsWithProgress]);

  const handleNewProject = () => {
    const id = generateId();
    const all = activeProjects;
    createProject.mutate({
      id,
      title: 'New Project',
      notes: null,
      status: 'active',
      position: all.length + 1,
      areaId: null,
      completedAt: null,
      trashedAt: null,
    });
    navigate({ to: '/project/$projectId', params: { projectId: id } });
  };

  const handleNewArea = () => {
    const id = generateId();
    const all = areas ?? [];
    createArea.mutate({
      id,
      title: 'New Area',
      position: all.length + 1,
    });
  };

  const setProjectOrder = useCallback(
    (projectIds: string[], areaId: string | null) => {
      projectIds.forEach((projectId, index) => {
        updateProject.mutate({
          id: projectId,
          changes: {
            areaId,
            position: index + 1,
          },
        });
      });
    },
    [updateProject],
  );

  const setAreaOrder = useCallback(
    (areaIds: string[]) => {
      areaIds.forEach((areaId, index) => {
        updateArea.mutate({
          id: areaId,
          changes: {
            position: index + 1,
          },
        });
      });
    },
    [updateArea],
  );

  // Use refs to access latest data without recreating monitors
  const projectsWithProgressRef = useRef(projectsWithProgress);
  const activeProjectsRef = useRef(activeProjects);
  const sortedAreasRef = useRef(sortedAreas);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    projectsWithProgressRef.current = projectsWithProgress;
  }, [projectsWithProgress]);
  useEffect(() => {
    activeProjectsRef.current = activeProjects;
  }, [activeProjects]);
  useEffect(() => {
    sortedAreasRef.current = sortedAreas;
  }, [sortedAreas]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const moveTaskIntoProject = useCallback(
    (taskId: string, projectId: string) => {
      const currentActiveProjects = activeProjectsRef.current;
      const currentTasks = tasksRef.current;
      if (!currentActiveProjects || !currentTasks) return;

      const targetProject =
        currentActiveProjects.find((proj) => proj.id === projectId) ?? null;
      const targetTasks = currentTasks.filter((task) => {
        if (task.trashedAt) return false;
        return task.projectId === projectId;
      });

      const nextPosition =
        targetTasks.reduce((max, task) => Math.max(max, task.position), 0) + 1;

      updateTask.mutate({
        id: taskId,
        changes: {
          projectId,
          areaId: targetProject?.areaId ?? null,
          headingId: null,
          position: nextPosition,
        },
      });
    },
    [updateTask],
  );

  const moveTaskToInbox = useCallback(
    (taskId: string) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          status: 'inbox',
          scheduledDate: null,
          projectId: null,
          areaId: null,
          headingId: null,
        },
      });
    },
    [updateTask],
  );

  const moveTaskToToday = useCallback(
    (taskId: string) => {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      updateTask.mutate({
        id: taskId,
        changes: {
          status: 'scheduled',
          scheduledDate: dateStr,
        },
      });
    },
    [updateTask],
  );

  const moveTaskToAnytime = useCallback(
    (taskId: string) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          status: 'anytime',
          scheduledDate: null,
        },
      });
    },
    [updateTask],
  );

  const moveTaskToSomeday = useCallback(
    (taskId: string) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          status: 'someday',
          scheduledDate: null,
        },
      });
    },
    [updateTask],
  );

  const moveTaskToArea = useCallback(
    (taskId: string, areaId: string) => {
      updateTask.mutate({
        id: taskId,
        changes: {
          areaId,
          projectId: null,
          headingId: null,
        },
      });
    },
    [updateTask],
  );

  // Main DnD Monitor - set up once, use refs for data access
  useEffect(() => {
    let disposed = false;
    let cleanup: CleanupFn | undefined;

    loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.combine(
        dnd.monitorForElements({
          onDrop({ location, source }: any) {
            const target = location.current.dropTargets[0];
            if (!target) return;

            const sourceData = source.data;
            const targetData = target.data as any;

            if (!isProjectDragData(sourceData)) return;

            const draggedProjectId = sourceData.projectId;
            const pwp = projectsWithProgressRef.current;
            const allProjects = activeProjectsRef.current ?? [];

            if (targetData.isEmptyAreaDropZone) {
              const dropAreaId =
                (targetData.areaId as string | undefined) ?? null;
              const draggedProject = pwp.find((p) => p.id === draggedProjectId);
              if (!draggedProject) return;

              const targetProjects = pwp
                .filter(
                  (p) =>
                    (dropAreaId ? p.areaId === dropAreaId : !p.areaId) &&
                    p.id !== draggedProjectId,
                )
                .sort((a, b) => {
                  const pa =
                    allProjects.find((p) => p.id === a.id)?.position ?? 0;
                  const pb =
                    allProjects.find((p) => p.id === b.id)?.position ?? 0;
                  return pa - pb;
                });

              const reorderedIds = [
                ...targetProjects.map((p) => p.id),
                draggedProjectId,
              ];
              setProjectOrder(reorderedIds, dropAreaId);
              return;
            }

            if (!isProjectDropTargetData(targetData)) return;

            const targetProjectId = targetData.projectId;
            const targetAreaId = targetData.areaId;
            if (!targetProjectId) return;

            const closestEdge = dnd.extractClosestEdge(targetData);
            if (!closestEdge) return;

            const dropAreaId = targetAreaId ?? null;
            const targetProjects = pwp
              .filter((p) => (dropAreaId ? p.areaId === dropAreaId : !p.areaId))
              .sort((a, b) => {
                const pa =
                  allProjects.find((p) => p.id === a.id)?.position ?? 0;
                const pb =
                  allProjects.find((p) => p.id === b.id)?.position ?? 0;
                return pa - pb;
              });

            const draggedIndex = targetProjects.findIndex(
              (p) => p.id === draggedProjectId,
            );
            const targetIndex = targetProjects.findIndex(
              (p) => p.id === targetProjectId,
            );
            if (targetIndex === -1) return;

            const rawIndex =
              closestEdge === 'top' ? targetIndex : targetIndex + 1;
            const insertIndex =
              draggedIndex !== -1 && draggedIndex < rawIndex
                ? rawIndex - 1
                : rawIndex;

            const filtered = targetProjects.filter(
              (p) => p.id !== draggedProjectId,
            );
            const reordered = [...filtered];
            reordered.splice(insertIndex, 0, {
              id: draggedProjectId,
              title: '',
              progress: 0,
              areaId: dropAreaId,
            });

            setProjectOrder(
              reordered.map((p) => p.id),
              dropAreaId,
            );
          },
        }),
        dnd.monitorForElements({
          onDrop({ location, source }: any) {
            const target = location.current.dropTargets[0];
            if (!target) return;

            const sourceData = source.data;
            const targetData = target.data;

            if (!isAreaHeaderDragData(sourceData)) return;
            if (!isAreaHeaderDropTargetData(targetData)) return;

            const draggedAreaId = sourceData.areaId;
            const targetAreaId = (targetData as any).areaId;

            if (!targetAreaId || draggedAreaId === targetAreaId) return;

            const closestEdge = dnd.extractClosestEdge(targetData);
            if (!closestEdge) return;

            const sa = sortedAreasRef.current;
            const draggedIndex = sa.findIndex((a) => a.id === draggedAreaId);
            const targetIndex = sa.findIndex((a) => a.id === targetAreaId);
            if (targetIndex === -1 || draggedIndex === -1) return;

            const rawIndex =
              closestEdge === 'top' ? targetIndex : targetIndex + 1;
            const insertIndex =
              draggedIndex < rawIndex ? rawIndex - 1 : rawIndex;

            const reordered = sa.filter((a) => a.id !== draggedAreaId);
            const dragged = sa.find((a) => a.id === draggedAreaId);
            if (!dragged) return;

            reordered.splice(insertIndex, 0, dragged);
            setAreaOrder(reordered.map((a) => a.id));
          },
        }),
        dnd.monitorForElements({
          onDrop({ location, source }: any) {
            const target = location.current.dropTargets[0];
            if (!target) return;

            const sourceData = source.data;
            const targetData = target.data;

            if (!isTaskDragData(sourceData)) return;

            const taskId = sourceData.task.id;

            // Handle drop on sidebar project
            if (isSidebarProjectDropTargetData(targetData)) {
              const targetProjectId = targetData.projectId;
              if (!targetProjectId) return;
              if (sourceData.projectId === targetProjectId) return;
              moveTaskIntoProject(taskId, targetProjectId);
              return;
            }

            // Handle drop on sidebar nav items (inbox, today, anytime, someday)
            if (isSidebarNavDropTargetData(targetData)) {
              switch (targetData.target) {
                case 'inbox':
                  moveTaskToInbox(taskId);
                  break;
                case 'today':
                  moveTaskToToday(taskId);
                  break;
                case 'anytime':
                  moveTaskToAnytime(taskId);
                  break;
                case 'someday':
                  moveTaskToSomeday(taskId);
                  break;
              }
              return;
            }

            // Handle drop on sidebar area
            if (isSidebarAreaDropTargetData(targetData)) {
              moveTaskToArea(taskId, targetData.areaId);
              return;
            }
          },
        }),
      );
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // Set up monitors once - use refs to access latest data
  }, []);

  return (
    <aside className="w-full md:w-64 bg-background md:bg-sidebar flex flex-col h-full md:border-r border-sidebar-border">
      <div className="h-8 flex-shrink-0" />

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pb-2 pt-1">
          <div className="space-y-0.5">
            <NavItem
              to="/inbox"
              icon={<InboxIcon className="w-5 h-5" />}
              iconColor="text-things-blue"
              label="Inbox"
              count={counts.inbox}
              dropTarget="inbox"
            />
            <NavItem
              to="/today"
              icon={<TodayStarIcon className="w-5 h-5" />}
              iconColor="text-things-yellow"
              label="Today"
              count={counts.today}
              dropTarget="today"
            />
            <NavItem
              to="/upcoming"
              icon={<CalendarIcon className="w-5 h-5" />}
              iconColor="text-things-pink"
              label="Upcoming"
            />
            <NavItem
              to="/anytime"
              icon={<LayersIcon className="w-5 h-5" />}
              iconColor="text-things-teal"
              label="Anytime"
              dropTarget="anytime"
            />
            <NavItem
              to="/someday"
              icon={<SomedayIcon className="w-5 h-5" />}
              iconColor="text-things-beige"
              label="Someday"
              dropTarget="someday"
            />
          </div>

          {(areasWithProjects.length > 0 || projectsWithoutArea.length > 0) && (
            <div className="mt-6">
              {projectsWithoutArea.length > 0 ? (
                <div className="mb-4">
                  {projectsWithoutArea.map((project) => (
                    <ProjectItem
                      key={project.id}
                      projectId={project.id}
                      label={project.title}
                      progress={project.progress}
                      areaId={undefined}
                    />
                  ))}
                </div>
              ) : (
                <NoAreaDropZone />
              )}

              {areasWithProjects.map((area) => (
                <AreaItem
                  key={area.id}
                  areaId={area.id}
                  title={area.title}
                  projects={area.projects}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-sidebar-border bg-sidebar px-8 md:px-2 h-[52px] flex items-center">
        <div className="flex items-center justify-between w-full">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Create"
            >
              <PlusIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onClick={handleNewProject}>
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewArea}>
                New Area
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to={'/logbook' as any}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Logbook"
          >
            <BookCheckIcon className="w-5 h-5" />
          </Link>

          <Link
            to={'/trash' as any}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Trash"
          >
            <Trash2Icon className="w-5 h-5" />
          </Link>

          <Link
            to={'/settings' as any}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Settings"
          >
            <Settings2Icon className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
