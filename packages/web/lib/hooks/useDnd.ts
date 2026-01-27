import type { RefObject } from 'react';
import { useEffect } from 'react';
import {
  type CleanupFn,
  type DndModules,
  type Edge,
  isShallowEqual,
  loadDnd,
} from '@/lib/dnd';

type DragRecord = Record<string | symbol, unknown>;

// =============================================================================
// useDndMonitor - Monitor for drag events across the page
// =============================================================================

interface DndMonitorOptions<T extends DragRecord> {
  canMonitor?: (args: { source: { data: DragRecord } }) => boolean;
  onDrop: (args: {
    source: { data: T };
    location: { current: { dropTargets: Array<{ data: DragRecord }> } };
    dnd: DndModules;
  }) => void;
}

export function useDndMonitor<T extends DragRecord>(
  options: DndMonitorOptions<T>,
  deps: unknown[],
): void {
  useEffect(() => {
    let cleanup: CleanupFn | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.monitorForElements({
        canMonitor: options.canMonitor,
        onDrop(args: {
          source: { data: DragRecord };
          location: { current: { dropTargets: Array<{ data: DragRecord }> } };
        }) {
          options.onDrop({
            source: args.source as { data: T },
            location: args.location,
            dnd,
          });
        },
      });
    });

    return () => cleanup?.();
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed as parameter for reusable hook
  }, deps);
}

// =============================================================================
// useDropTarget - Make an element a drop target
// =============================================================================

interface DropTargetOptions {
  ref: RefObject<HTMLElement | null>;
  canDrop?: (args: { source: { data: DragRecord } }) => boolean;
  getData: (args: { input: unknown; dnd: DndModules }) => DragRecord;
  getIsSticky?: () => boolean;
  onDragEnter?: (args: {
    source: { data: DragRecord };
    self: { data: DragRecord };
    dnd: DndModules;
  }) => void;
  onDrag?: (args: {
    source: { data: DragRecord };
    self: { data: DragRecord };
    dnd: DndModules;
  }) => void;
  onDragLeave?: (args: { source: { data: DragRecord } }) => void;
  onDrop?: () => void;
}

export function useDropTarget(
  options: DropTargetOptions,
  deps: unknown[],
): void {
  useEffect(() => {
    const element = options.ref.current;
    if (!element) return;

    let disposed = false;
    let cleanup: CleanupFn | undefined;

    void loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.dropTargetForElements({
        element,
        canDrop: options.canDrop,
        getIsSticky: options.getIsSticky,
        getData: ({ input }: { input: unknown }) =>
          options.getData({ input, dnd }),
        onDragEnter: options.onDragEnter
          ? (args: {
              source: { data: DragRecord };
              self: { data: DragRecord };
            }) => options.onDragEnter?.({ ...args, dnd })
          : undefined,
        onDrag: options.onDrag
          ? (args: {
              source: { data: DragRecord };
              self: { data: DragRecord };
            }) => options.onDrag?.({ ...args, dnd })
          : undefined,
        onDragLeave: options.onDragLeave,
        onDrop: options.onDrop,
      });
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed as parameter for reusable hook
  }, deps);
}

// =============================================================================
// useDraggable - Make an element draggable
// =============================================================================

type DragPreviewState = {
  type: 'preview';
  container: HTMLElement;
  dragging: DOMRect;
};

interface DraggableOptions<TState extends { type: string }> {
  ref: RefObject<HTMLElement | null>;
  handleRef?: RefObject<HTMLElement | null>;
  canDrag?: () => boolean;
  getInitialData: () => DragRecord;
  onGenerateDragPreview?: (args: {
    setState: (state: DragPreviewState) => void;
    dnd: DndModules;
    nativeSetDragImage: (image: Element, x: number, y: number) => void;
    location: { current: { input: unknown } };
    source: { data: DragRecord };
  }) => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  setState: (state: TState | ((prev: TState) => TState)) => void;
  draggingState: TState;
  idleState: TState;
}

export function useDraggable<TState extends { type: string }>(
  options: DraggableOptions<TState>,
  deps: unknown[],
): void {
  useEffect(() => {
    const element = options.ref.current;
    const handle = options.handleRef?.current;
    if (!element) return;

    let disposed = false;
    let cleanup: CleanupFn | undefined;

    void loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.draggable({
        element,
        dragHandle: handle,
        canDrag: options.canDrag,
        getInitialData: options.getInitialData,
        onGenerateDragPreview: options.onGenerateDragPreview
          ? (args: {
              nativeSetDragImage: (
                image: Element,
                x: number,
                y: number,
              ) => void;
              location: { current: { input: unknown } };
              source: { data: DragRecord };
            }) => {
              options.onGenerateDragPreview?.({
                setState: (state: DragPreviewState) =>
                  options.setState(state as unknown as TState),
                dnd,
                nativeSetDragImage: args.nativeSetDragImage,
                location: args.location,
                source: args.source,
              });
            }
          : undefined,
        onDragStart: () => {
          options.setState(options.draggingState);
          options.onDragStart?.();
        },
        onDrop: () => {
          options.setState(options.idleState);
          options.onDrop?.();
        },
      });
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed as parameter for reusable hook
  }, deps);
}

// =============================================================================
// useDraggableDropTarget - Combined draggable and drop target (common pattern)
// =============================================================================

type DraggableDropTargetState =
  | { type: 'idle' }
  | { type: 'is-dragging' }
  | { type: 'is-dragging-and-left-self' }
  | { type: 'is-over'; dragging: DOMRect; closestEdge: Edge }
  | { type: 'preview'; container: HTMLElement; dragging: DOMRect };

export const draggableDropTargetIdle: DraggableDropTargetState = {
  type: 'idle',
};

interface DraggableDropTargetOptions {
  outerRef: RefObject<HTMLElement | null>;
  innerRef: RefObject<HTMLElement | null>;
  handleRef?: RefObject<HTMLElement | null>;
  canDrag?: () => boolean;
  getDragData: () => DragRecord;
  getDropData: () => DragRecord;
  canDrop: (args: { source: { data: DragRecord } }) => boolean;
  isSelf: (sourceData: DragRecord) => boolean;
  allowedEdges?: Edge[];
  setState: (
    state:
      | DraggableDropTargetState
      | ((prev: DraggableDropTargetState) => DraggableDropTargetState),
  ) => void;
  onDragStart?: () => void;
}

export function useDraggableDropTarget(
  options: DraggableDropTargetOptions,
  deps: unknown[],
): void {
  useEffect(() => {
    const outer = options.outerRef.current;
    const inner = options.innerRef.current;
    const handle = options.handleRef?.current;
    if (!outer || !inner) return;

    let disposed = false;
    let cleanup: CleanupFn | undefined;

    void loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.combine(
        dnd.draggable({
          element: inner,
          dragHandle: handle,
          canDrag: options.canDrag,
          getInitialData: options.getDragData,
          onGenerateDragPreview({
            nativeSetDragImage,
            location,
          }: {
            nativeSetDragImage: (image: Element, x: number, y: number) => void;
            location: { current: { input: unknown } };
          }) {
            dnd.setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: dnd.preserveOffsetOnSource({
                element: inner,
                input: location.current.input,
              }),
              render({ container }: { container: HTMLElement }) {
                options.setState({
                  type: 'preview',
                  container,
                  dragging: inner.getBoundingClientRect(),
                });
              },
            });
          },
          onDragStart() {
            options.setState({ type: 'is-dragging' });
            if (navigator.vibrate) navigator.vibrate(10);
            options.onDragStart?.();
          },
          onDrop() {
            options.setState(draggableDropTargetIdle);
          },
        }),
        dnd.dropTargetForElements({
          element: outer,
          getIsSticky: () => true,
          canDrop: options.canDrop,
          getData: ({ input }: { input: unknown }) => {
            const data = options.getDropData();
            return dnd.attachClosestEdge(data, {
              element: outer,
              input,
              allowedEdges: options.allowedEdges ?? ['top', 'bottom'],
            });
          },
          onDragEnter({
            source,
            self,
          }: {
            source: { data: DragRecord };
            self: { data: DragRecord };
          }) {
            if (options.isSelf(source.data)) return;

            const closestEdge = dnd.extractClosestEdge(self.data);
            if (!closestEdge) return;

            options.setState({
              type: 'is-over',
              dragging:
                (source.data as { rect?: DOMRect }).rect ?? new DOMRect(),
              closestEdge,
            });
          },
          onDrag({
            source,
            self,
          }: {
            source: { data: DragRecord };
            self: { data: DragRecord };
          }) {
            if (options.isSelf(source.data)) return;

            const closestEdge = dnd.extractClosestEdge(self.data);
            if (!closestEdge) return;

            const proposed: DraggableDropTargetState = {
              type: 'is-over',
              dragging:
                (source.data as { rect?: DOMRect }).rect ?? new DOMRect(),
              closestEdge,
            };
            options.setState((current) => {
              if (
                current.type === 'is-over' &&
                isShallowEqual(
                  proposed as unknown as Record<string, unknown>,
                  current as unknown as Record<string, unknown>,
                )
              ) {
                return current;
              }
              return proposed;
            });
          },
          onDragLeave({ source }: { source: { data: DragRecord } }) {
            if (options.isSelf(source.data)) {
              options.setState({ type: 'is-dragging-and-left-self' });
              return;
            }
            options.setState(draggableDropTargetIdle);
          },
          onDrop() {
            options.setState(draggableDropTargetIdle);
          },
        }),
      );
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed as parameter for reusable hook
  }, deps);
}

// =============================================================================
// useSectionDropTarget - Drop target for section containers (sticky tracking)
// =============================================================================

type SectionDropTargetState =
  | { type: 'idle' }
  | { type: 'is-task-over'; dragging: DOMRect; isOverChildTask: boolean };

export const sectionDropTargetIdle: SectionDropTargetState = { type: 'idle' };

interface SectionDropTargetOptions {
  ref: RefObject<HTMLElement | null>;
  getData: () => DragRecord;
  canDrop: (args: { source: { data: DragRecord } }) => boolean;
  isTaskDragData: (data: DragRecord) => data is DragRecord & { rect: DOMRect };
  isTaskDropTargetData: (data: DragRecord) => boolean;
  setState: (
    state:
      | SectionDropTargetState
      | ((prev: SectionDropTargetState) => SectionDropTargetState),
  ) => void;
}

export function useSectionDropTarget(
  options: SectionDropTargetOptions,
  deps: unknown[],
): void {
  useEffect(() => {
    const element = options.ref.current;
    if (!element) return;

    let disposed = false;
    let cleanup: CleanupFn | undefined;

    function setIsTaskOver(args: {
      data: DragRecord & { rect: DOMRect };
      location: { current: { dropTargets: Array<{ data: DragRecord }> } };
    }) {
      const innerMost = args.location.current.dropTargets[0];
      const isOverChildTask = Boolean(
        innerMost && options.isTaskDropTargetData(innerMost.data),
      );

      const proposed: SectionDropTargetState = {
        type: 'is-task-over',
        dragging: args.data.rect,
        isOverChildTask,
      };
      options.setState((current) => {
        if (
          isShallowEqual(
            proposed as unknown as Record<string, unknown>,
            current as unknown as Record<string, unknown>,
          )
        ) {
          return current;
        }
        return proposed;
      });
    }

    void loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.dropTargetForElements({
        element,
        getData: options.getData,
        canDrop: options.canDrop,
        getIsSticky: () => true,
        onDragStart({
          source,
          location,
        }: {
          source: { data: DragRecord };
          location: { current: { dropTargets: Array<{ data: DragRecord }> } };
        }) {
          if (options.isTaskDragData(source.data)) {
            setIsTaskOver({ data: source.data, location });
          }
        },
        onDragEnter({
          source,
          location,
        }: {
          source: { data: DragRecord };
          location: { current: { dropTargets: Array<{ data: DragRecord }> } };
        }) {
          if (options.isTaskDragData(source.data)) {
            setIsTaskOver({ data: source.data, location });
          }
        },
        onDropTargetChange({
          source,
          location,
        }: {
          source: { data: DragRecord };
          location: { current: { dropTargets: Array<{ data: DragRecord }> } };
        }) {
          if (options.isTaskDragData(source.data)) {
            setIsTaskOver({ data: source.data, location });
          }
        },
        onDragLeave() {
          options.setState(sectionDropTargetIdle);
        },
        onDrop() {
          options.setState(sectionDropTargetIdle);
        },
      });
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed as parameter for reusable hook
  }, deps);
}

// =============================================================================
// useAutoScroll - Enable auto-scrolling during drag
// =============================================================================

interface AutoScrollOptions {
  ref: RefObject<HTMLElement | null>;
  canScroll: (args: { source: { data: DragRecord } }) => boolean;
  maxScrollSpeed?: 'standard' | 'fast';
}

export function useAutoScroll(
  options: AutoScrollOptions,
  deps: unknown[],
): void {
  useEffect(() => {
    const element = options.ref.current;
    if (!element) return;

    let cleanup: CleanupFn | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.autoScrollForElements({
        element,
        canScroll: options.canScroll,
        getConfiguration: () => ({
          maxScrollSpeed: options.maxScrollSpeed ?? 'standard',
        }),
      });
    });

    return () => cleanup?.();
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed as parameter for reusable hook
  }, deps);
}

// Re-export types for convenience
export type { DraggableDropTargetState, SectionDropTargetState };
