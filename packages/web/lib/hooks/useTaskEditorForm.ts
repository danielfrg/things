import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseTaskEditorFormProps {
  initialTitle: string;
  initialNotes: string;
  onTitleChange?: (title: string) => void;
  onNotesChange?: (notes: string | null) => void;
  onClose?: () => void;
}

export interface UseTaskEditorFormReturn {
  title: string;
  notes: string;
  setTitle: (value: string) => void;
  setNotes: (value: string) => void;
  handleTitleBlur: () => void;
  handleNotesBlur: () => void;
  handleTitleKeyDown: (e: React.KeyboardEvent) => void;
  isEditingNotes: boolean;
  setIsEditingNotes: (editing: boolean) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
  resizeNotes: () => void;
  focusTitle: () => void;
}

export function useTaskEditorForm({
  initialTitle,
  initialNotes,
  onTitleChange,
  onNotesChange,
  onClose,
}: UseTaskEditorFormProps): UseTaskEditorFormReturn {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const lastIdRef = useRef({ title: initialTitle, notes: initialNotes });

  // Sync from props when initial values change (different item selected)
  useEffect(() => {
    const prev = lastIdRef.current;
    if (initialTitle !== prev.title || initialNotes !== prev.notes) {
      lastIdRef.current = { title: initialTitle, notes: initialNotes };
      setTitle(initialTitle);
      setNotes(initialNotes);
      setIsEditingNotes(false);
    }
  }, [initialTitle, initialNotes]);

  const resizeNotes = useCallback(() => {
    if (notesRef.current) {
      const el = notesRef.current;
      const prev = el.style.height;
      el.style.height = '0';
      const next = `${Math.max(26, Math.min(el.scrollHeight, 200))}px`;
      el.style.height = prev;
      void el.offsetHeight;
      el.style.height = next;
    }
  }, []);

  const focusTitle = useCallback(() => {
    if (titleRef.current) {
      const input = titleRef.current;
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 10);
    }
  }, []);

  // Focus and resize textarea when entering edit mode
  useEffect(() => {
    if (isEditingNotes && notesRef.current) {
      resizeNotes();
      notesRef.current.focus();
    }
  }, [isEditingNotes, resizeNotes]);

  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(initialTitle);
      return;
    }
    if (trimmed !== initialTitle) {
      onTitleChange?.(trimmed);
    }
  }, [title, initialTitle, onTitleChange]);

  const handleNotesBlur = useCallback(() => {
    const trimmed = notes.trim();
    setNotes(trimmed);

    if (trimmed !== initialNotes) {
      onNotesChange?.(trimmed || null);
    }
    setIsEditingNotes(false);
  }, [notes, initialNotes, onNotesChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTitleBlur();
        onClose?.();
      } else if (e.key === 'Escape') {
        setTitle(initialTitle);
        onClose?.();
      }
    },
    [handleTitleBlur, initialTitle, onClose],
  );

  const handleSetNotes = useCallback((value: string) => {
    setNotes(value);
  }, []);

  return {
    title,
    notes,
    setTitle,
    setNotes: handleSetNotes,
    handleTitleBlur,
    handleNotesBlur,
    handleTitleKeyDown,
    isEditingNotes,
    setIsEditingNotes,
    titleRef,
    notesRef,
    resizeNotes,
    focusTitle,
  };
}
