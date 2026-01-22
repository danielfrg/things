import { useEffect, useRef, useState } from 'react';
import invariant from 'tiny-invariant';
import type {
  AreaRecord,
  ChecklistItemRecord,
  ProjectRecord,
  TagRecord,
  TaskRecord,
} from '@/db/validation';
import {
  isDraggingATask,
  isTaskDragData,
  isTaskDropTargetData,
  loadDnd,
} from '@/lib/dnd';
import { isSectionData, type TaskGroupsData, type TSection } from './data';
import { TaskSection } from './TaskSection';

export interface TaskMoveInfo {
  taskId: string;
  fromSection: TSection;
  toSection: TSection;
  newTaskIds: string[];
}

interface GroupedTaskListProps {
  initial: TaskGroupsData;
  onComplete: (taskId: string, completed: boolean) => void;
  onSelect: (taskId: string | null) => void;
  onExpand: (taskId: string) => void;
  onReorder: (taskIds: string[]) => void;
  onMoveTask: (info: TaskMoveInfo) => void;
  onUpdate: (taskId: string, updates: Partial<TaskRecord>) => void;
  onDelete: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  onProjectChange: (
    taskId: string,
    projectId: string | null,
    areaId?: string | null,
  ) => void;
  onTagAdd: (taskId: string, tagId: string) => void;
  onTagRemove: (taskId: string, tagId: string) => void;
  selectedTaskId: string | null;
  expandedTaskId: string | null;
  scheduleDatePickerTaskId?: string | null;
  onScheduleDatePickerClose?: () => void;
  projects: ProjectRecord[];
  areas: AreaRecord[];
  checklistItems: ChecklistItemRecord[];
  tags: TagRecord[];
  /** Hide the Today toggle in task items */
  hideToday?: boolean;
  /** Show the Today star indicator */
  showTodayStar?: boolean;
  /** Whether this is the trash view */
  isTrash?: boolean;
  /** Callback for editing heading title (for project view) */
  onHeadingEdit?: (headingId: string, title: string) => void;
  /** Callback for deleting a heading (for project view) */
  onHeadingDelete?: (headingId: string) => void;
}

export function GroupedTaskList({
  initial,
  onComplete,
  onSelect,
  onExpand,
  onReorder,
  onMoveTask,
  onUpdate,
  onDelete,
  onRestore,
  onProjectChange,
  onTagAdd,
  onTagRemove,
  selectedTaskId,
  expandedTaskId,
  scheduleDatePickerTaskId,
  onScheduleDatePickerClose,
  projects,
  areas,
  checklistItems,
  tags,
  hideToday,
  showTodayStar,
  isTrash,
  onHeadingEdit,
  onHeadingDelete,
}: GroupedTaskListProps) {
  const [data, setData] = useState(initial);
  const scrollableRef = useRef<HTMLDivElement | null>(null);

  // Sync with initial data when it changes (for DB updates)
  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    const scrollable = scrollableRef.current;
    invariant(scrollable);

    let cleanup: (() => void) | undefined;

    void loadDnd().then((dnd) => {
      cleanup = dnd.combine(
        dnd.monitorForElements({
          canMonitor({
            source,
          }: {
            source: { data: Record<string | symbol, unknown> };
          }) {
            return isTaskDragData(source.data);
          },
          onDrop({
            source,
            location,
          }: {
            source: { data: Record<string | symbol, unknown> };
            location: {
              current: {
                dropTargets: Array<{ data: Record<string | symbol, unknown> }>;
              };
            };
          }) {
            const dragging = source.data;
            if (!isTaskDragData(dragging)) {
              return;
            }

            const innerMost = location.current.dropTargets[0];
            if (!innerMost) {
              return;
            }

            const dropTargetData = innerMost.data;

            // Find home section by checking which section contains the task
            const homeSectionIndex = data.sections.findIndex((section) =>
              section.tasks.some((t) => t.id === dragging.task.id),
            );
            const home: TSection | undefined = data.sections[homeSectionIndex];

            if (!home) {
              return;
            }
            const taskIndexInHome = home.tasks.findIndex(
              (task) => task.id === dragging.task.id,
            );

            // dropping on a task
            if (isTaskDropTargetData(dropTargetData)) {
              // Find destination section based on drop target properties
              const destinationSectionIndex = data.sections.findIndex(
                (section) => {
                  if (
                    dropTargetData.projectId &&
                    section.projectId === dropTargetData.projectId
                  ) {
                    return true;
                  }
                  if (dropTargetData.isEvening && section.isEvening) {
                    return true;
                  }
                  return section.tasks.some(
                    (t) => t.id === dropTargetData.task.id,
                  );
                },
              );
              const destination = data.sections[destinationSectionIndex];

              // reordering in home section
              if (home === destination) {
                const taskFinishIndex = home.tasks.findIndex(
                  (task) => task.id === dropTargetData.task.id,
                );

                if (taskIndexInHome === -1 || taskFinishIndex === -1) {
                  return;
                }

                if (taskIndexInHome === taskFinishIndex) {
                  return;
                }

                const closestEdge = dnd.extractClosestEdge(dropTargetData);

                const reordered = dnd.reorderWithEdge({
                  axis: 'vertical',
                  list: home.tasks,
                  startIndex: taskIndexInHome,
                  indexOfTarget: taskFinishIndex,
                  closestEdgeOfTarget: closestEdge,
                });

                const updated: TSection = {
                  ...home,
                  tasks: reordered,
                };
                const sections = Array.from(data.sections);
                sections[homeSectionIndex] = updated;
                setData({ ...data, sections });

                onReorder(reordered.map((t) => t.id));
                return;
              }

              // moving task from one section to another
              if (!destination) {
                return;
              }

              const indexOfTarget = destination.tasks.findIndex(
                (task) => task.id === dropTargetData.task.id,
              );

              const closestEdge = dnd.extractClosestEdge(dropTargetData);
              const finalIndex =
                closestEdge === 'bottom' ? indexOfTarget + 1 : indexOfTarget;

              // remove from home section
              const homeTasks = Array.from(home.tasks);
              homeTasks.splice(taskIndexInHome, 1);

              // insert into destination section
              const destinationTasks = Array.from(destination.tasks);
              destinationTasks.splice(finalIndex, 0, dragging.task);

              const sections = Array.from(data.sections);
              sections[homeSectionIndex] = {
                ...home,
                tasks: homeTasks,
              };
              sections[destinationSectionIndex] = {
                ...destination,
                tasks: destinationTasks,
              };
              setData({ ...data, sections });

              // Notify parent of cross-section move
              onMoveTask({
                taskId: dragging.task.id,
                fromSection: home,
                toSection: destination,
                newTaskIds: destinationTasks.map((t) => t.id),
              });
              return;
            }

            // dropping onto a section header/empty area, but not onto a task
            if (isSectionData(dropTargetData)) {
              const destinationSectionIndex = data.sections.findIndex(
                (section) => section.id === dropTargetData.section.id,
              );
              const destination = data.sections[destinationSectionIndex];

              if (!destination) {
                return;
              }

              // dropping on home section - move to last position
              if (home === destination) {
                const reordered = [...home.tasks];
                reordered.splice(taskIndexInHome, 1);
                reordered.push(dragging.task);

                const updated: TSection = {
                  ...home,
                  tasks: reordered,
                };
                const sections = Array.from(data.sections);
                sections[homeSectionIndex] = updated;
                setData({ ...data, sections });

                onReorder(reordered.map((t) => t.id));
                return;
              }

              // moving to another section - add to end
              const homeTasks = Array.from(home.tasks);
              homeTasks.splice(taskIndexInHome, 1);

              const destinationTasks = Array.from(destination.tasks);
              destinationTasks.push(dragging.task);

              const sections = Array.from(data.sections);
              sections[homeSectionIndex] = {
                ...home,
                tasks: homeTasks,
              };
              sections[destinationSectionIndex] = {
                ...destination,
                tasks: destinationTasks,
              };
              setData({ ...data, sections });

              // Notify parent of cross-section move
              onMoveTask({
                taskId: dragging.task.id,
                fromSection: home,
                toSection: destination,
                newTaskIds: destinationTasks.map((t) => t.id),
              });
              return;
            }
          },
        }),
        dnd.autoScrollForElements({
          canScroll({
            source,
          }: {
            source: { data: Record<string | symbol, unknown> };
          }) {
            return isDraggingATask({ source });
          },
          getConfiguration: () => ({ maxScrollSpeed: 'standard' }),
          element: scrollable,
        }),
      );
    });

    return () => cleanup?.();
  }, [data, onReorder, onMoveTask]);

  return (
    <div className="h-full overflow-y-auto" ref={scrollableRef}>
      <div className="py-2">
        {data.sections.map((section) => (
          <TaskSection
            key={section.id}
            section={section}
            onComplete={onComplete}
            onSelect={onSelect}
            onExpand={onExpand}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onRestore={onRestore}
            onProjectChange={onProjectChange}
            onTagAdd={onTagAdd}
            onTagRemove={onTagRemove}
            selectedTaskId={selectedTaskId}
            expandedTaskId={expandedTaskId}
            scheduleDatePickerTaskId={scheduleDatePickerTaskId}
            onScheduleDatePickerClose={onScheduleDatePickerClose}
            projects={projects}
            areas={areas}
            checklistItems={checklistItems}
            tags={tags}
            hideToday={hideToday}
            showTodayStar={showTodayStar}
            isTrash={isTrash}
            onHeadingEdit={onHeadingEdit}
            onHeadingDelete={onHeadingDelete}
          />
        ))}
      </div>
    </div>
  );
}
