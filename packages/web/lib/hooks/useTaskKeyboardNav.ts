import { useCallback, useEffect } from 'react';
import type { TaskWithRelations } from '@/types';

// Generic item type for keyboard navigation
export type NavItem = {
  id: string;
  type: 'task' | 'template';
};

interface UseTaskKeyboardNavOptions {
  tasks: TaskWithRelations[];
  selectedTaskId: string | null;
  expandedTaskId: string | null;
  onSelect: (taskId: string | null) => void;
  onExpand: (taskId: string) => void;
  enabled?: boolean;
}

export function useTaskKeyboardNav({
  tasks,
  selectedTaskId,
  expandedTaskId,
  onSelect,
  onExpand,
  enabled = true,
}: UseTaskKeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't handle if a modal/dialog is open
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      // Don't handle if task details are expanded
      if (expandedTaskId) {
        return;
      }

      if (tasks.length === 0) return;

      const currentIndex = selectedTaskId
        ? tasks.findIndex((t) => t.id === selectedTaskId)
        : -1;

      switch (e.key) {
        case 'ArrowDown':
        case 'j': {
          e.preventDefault();
          if (currentIndex === -1) {
            // Nothing selected, select first
            onSelect(tasks[0].id);
          } else if (currentIndex < tasks.length - 1) {
            // Select next
            onSelect(tasks[currentIndex + 1].id);
          }
          break;
        }

        case 'ArrowUp':
        case 'k': {
          e.preventDefault();
          if (currentIndex === -1) {
            // Nothing selected, select last
            onSelect(tasks[tasks.length - 1].id);
          } else if (currentIndex > 0) {
            // Select previous
            onSelect(tasks[currentIndex - 1].id);
          }
          break;
        }

        case 'Enter': {
          if (selectedTaskId) {
            e.preventDefault();
            onExpand(selectedTaskId);
          }
          break;
        }

        case 'Escape': {
          if (selectedTaskId) {
            e.preventDefault();
            onSelect(null);
          }
          break;
        }
      }
    },
    [tasks, selectedTaskId, expandedTaskId, onSelect, onExpand],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// New unified hook that supports both tasks and templates
interface UseListKeyboardNavOptions {
  items: NavItem[];
  selectedId: string | null;
  expandedId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onSelectTemplate: (templateId: string | null) => void;
  onExpandTask: (taskId: string) => void;
  onExpandTemplate: (templateId: string) => void;
  enabled?: boolean;
}

export function useListKeyboardNav({
  items,
  selectedId,
  expandedId,
  onSelectTask,
  onSelectTemplate,
  onExpandTask,
  onExpandTemplate,
  enabled = true,
}: UseListKeyboardNavOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't handle if a modal/dialog is open
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      // Don't handle if any item is expanded
      if (expandedId) {
        return;
      }

      if (items.length === 0) return;

      const currentIndex = selectedId
        ? items.findIndex((item) => item.id === selectedId)
        : -1;

      const selectItem = (item: NavItem) => {
        if (item.type === 'task') {
          onSelectTask(item.id);
          onSelectTemplate(null);
        } else {
          onSelectTemplate(item.id);
          onSelectTask(null);
        }
      };

      const expandItem = (item: NavItem) => {
        if (item.type === 'task') {
          onExpandTask(item.id);
        } else {
          onExpandTemplate(item.id);
        }
      };

      const clearSelection = () => {
        onSelectTask(null);
        onSelectTemplate(null);
      };

      switch (e.key) {
        case 'ArrowDown':
        case 'j': {
          e.preventDefault();
          if (currentIndex === -1) {
            // Nothing selected, select first
            selectItem(items[0]);
          } else if (currentIndex < items.length - 1) {
            // Select next
            selectItem(items[currentIndex + 1]);
          }
          break;
        }

        case 'ArrowUp':
        case 'k': {
          e.preventDefault();
          if (currentIndex === -1) {
            // Nothing selected, select last
            selectItem(items[items.length - 1]);
          } else if (currentIndex > 0) {
            // Select previous
            selectItem(items[currentIndex - 1]);
          }
          break;
        }

        case 'Enter': {
          if (selectedId && currentIndex !== -1) {
            e.preventDefault();
            expandItem(items[currentIndex]);
          }
          break;
        }

        case 'Escape': {
          if (selectedId) {
            e.preventDefault();
            clearSelection();
          }
          break;
        }
      }
    },
    [
      items,
      selectedId,
      expandedId,
      onSelectTask,
      onSelectTemplate,
      onExpandTask,
      onExpandTemplate,
    ],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
