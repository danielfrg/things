import { useEffect, useState, type RefObject } from 'react';
import type { TaskRecord } from '@/db/validation';
import {
  type CleanupFn,
  type Edge,
  getTaskDragData,
  getTaskDropTargetData,
  isDraggingATask,
  isSidebarAreaDropTargetData,
  isSidebarNavDropTargetData,
  isSidebarProjectDropTargetData,
  isTaskDragData,
  loadDnd,
} from '@/lib/dnd';

export type TaskCardDragState =
  | { type: 'idle' }
  | { type: 'dragging' }
  | { type: 'dragging-left-self' }
  | { type: 'over'; edge: Edge; dragging: DOMRect }
  | { type: 'preview'; container: HTMLElement; dragging: DOMRect };

const idle: TaskCardDragState = { type: 'idle' };

interface UseTaskCardDndOptions {
  task: TaskRecord;
  outerRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLDivElement | null>;
  expanded: boolean;
  groupDate?: string;
  headingId?: string;
  projectId?: string;
  isEvening?: boolean;
}

export function useTaskCardDnd({
  task,
  outerRef,
  headerRef,
  expanded,
  groupDate,
  headingId,
  projectId,
  isEvening,
}: UseTaskCardDndOptions) {
  const [dragState, setDragState] = useState<TaskCardDragState>(idle);

  useEffect(() => {
    const outer = outerRef.current;
    const header = headerRef.current;
    if (!outer || !header) return;

    let disposed = false;
    let cleanup: CleanupFn | undefined;

    void loadDnd().then((dnd) => {
      if (disposed) return;

      cleanup = dnd.combine(
        dnd.draggable({
          element: header,
          canDrag: () => !expanded,
          getInitialData: () =>
            getTaskDragData({
              task,
              rect: outer.getBoundingClientRect(),
              groupDate,
              headingId,
              projectId,
              isEvening,
            }),
          onGenerateDragPreview({ nativeSetDragImage, location, source }: any) {
            if (!isTaskDragData(source.data)) return;

            dnd.setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: dnd.preserveOffsetOnSource({
                element: header,
                input: location.current.input,
              }),
              render({ container }: any) {
                setDragState({
                  type: 'preview',
                  container,
                  dragging: outer.getBoundingClientRect(),
                });
              },
            });
          },
          onDragStart() {
            setDragState({ type: 'dragging' });
            // Haptic feedback on mobile
            if (navigator.vibrate) navigator.vibrate(10);
          },
          onDrop({
            location,
          }: {
            location: {
              current: {
                dropTargets: Array<{ data: Record<string | symbol, unknown> }>;
              };
            };
          }) {
            // Check if dropped on sidebar (cross-list move)
            const target = location.current.dropTargets[0];
            if (target) {
              const data = target.data;
              if (
                isSidebarProjectDropTargetData(data) ||
                isSidebarNavDropTargetData(data) ||
                isSidebarAreaDropTargetData(data)
              ) {
                // Keep task hidden - will be removed by optimistic update
                // Fallback timeout in case update is slow
                setTimeout(() => setDragState(idle), 300);
                return;
              }
            }
            setDragState(idle);
          },
        }),
        dnd.dropTargetForElements({
          element: outer,
          getIsSticky: () => true,
          canDrop: isDraggingATask,
          getData: ({ input }: any) => {
            const data = getTaskDropTargetData({
              task,
              groupDate,
              headingId,
              projectId,
              isEvening,
            });
            return dnd.attachClosestEdge(data, {
              element: outer,
              input,
              allowedEdges: ['top', 'bottom'],
            });
          },
          onDragEnter({ source, self }: any) {
            if (!isTaskDragData(source.data)) return;
            if (source.data.task.id === task.id) return;

            const edge = dnd.extractClosestEdge(self.data);
            if (edge) {
              setDragState({
                type: 'over',
                edge,
                dragging: source.data.rect,
              });
            }
          },
          onDrag({ source, self }: any) {
            if (!isTaskDragData(source.data)) return;
            if (source.data.task.id === task.id) return;

            const edge = dnd.extractClosestEdge(self.data);
            if (edge) {
              setDragState((current) => {
                if (current.type === 'over' && current.edge === edge)
                  return current;
                return { type: 'over', edge, dragging: source.data.rect };
              });
            }
          },
          onDragLeave({ source }: any) {
            if (!isTaskDragData(source.data)) return;
            if (source.data.task.id === task.id) {
              setDragState({ type: 'dragging-left-self' });
              return;
            }
            setDragState(idle);
          },
          onDrop() {
            setDragState(idle);
          },
        }),
      );
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [task.id, groupDate, headingId, projectId, isEvening, expanded]);

  return { dragState, idle };
}
