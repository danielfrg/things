import { createEffect, onCleanup, onMount } from 'solid-js';
import { EditorState, Plugin, type Transaction } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { Schema, DOMParser } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import { cn } from '@/lib/utils';

// Simple schema - just paragraphs and text, we'll decorate for styling
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM() {
        return ['p', 0];
      },
    },
    text: { group: 'inline' },
  },
  marks: {},
});

// Plugin to add decorations for markdown styling
function markdownDecorationPlugin() {
  return new Plugin({
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];

        state.doc.descendants((node, pos) => {
          if (!node.isTextblock) return;

          const text = node.textContent;
          const lineStart = pos + 1;

          // Check for heading
          const headingMatch = text.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            const hashLength = headingMatch[1].length;
            // Style the hashes
            decorations.push(
              Decoration.inline(lineStart, lineStart + hashLength + 1, {
                class: 'md-heading-marker',
              }),
            );
            // Style the heading text
            decorations.push(
              Decoration.inline(
                lineStart + hashLength + 1,
                lineStart + text.length,
                {
                  class: 'md-heading-text',
                },
              ),
            );
            return;
          }

          // Bold **text**
          let match: RegExpExecArray | null;
          const boldRegex = /\*\*([^*]+)\*\*/g;
          while ((match = boldRegex.exec(text)) !== null) {
            const from = lineStart + match.index;
            const to = from + match[0].length;
            // Markers
            decorations.push(
              Decoration.inline(from, from + 2, { class: 'md-marker' }),
            );
            decorations.push(
              Decoration.inline(to - 2, to, { class: 'md-marker' }),
            );
            // Bold text
            decorations.push(
              Decoration.inline(from + 2, to - 2, { class: 'md-bold' }),
            );
          }

          // Italic *text* (not preceded/followed by *)
          const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
          while ((match = italicRegex.exec(text)) !== null) {
            const from = lineStart + match.index;
            const to = from + match[0].length;
            // Check it's not inside a bold
            const isBold =
              text.substring(Math.max(0, match.index - 1), match.index) ===
                '*' ||
              text.substring(
                match.index + match[0].length,
                match.index + match[0].length + 1,
              ) === '*';
            if (!isBold) {
              decorations.push(
                Decoration.inline(from, from + 1, { class: 'md-marker' }),
              );
              decorations.push(
                Decoration.inline(to - 1, to, { class: 'md-marker' }),
              );
              decorations.push(
                Decoration.inline(from + 1, to - 1, { class: 'md-italic' }),
              );
            }
          }

          // Inline code `text`
          const codeRegex = /`([^`]+)`/g;
          while ((match = codeRegex.exec(text)) !== null) {
            const from = lineStart + match.index;
            const to = from + match[0].length;
            decorations.push(
              Decoration.inline(from, from + 1, { class: 'md-marker' }),
            );
            decorations.push(
              Decoration.inline(to - 1, to, { class: 'md-marker' }),
            );
            decorations.push(
              Decoration.inline(from + 1, to - 1, { class: 'md-code' }),
            );
          }

          // Links [text](url)
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          while ((match = linkRegex.exec(text)) !== null) {
            const from = lineStart + match.index;
            const bracketEnd = from + 1 + match[1].length + 1;
            const urlStart = bracketEnd + 1;
            const to = from + match[0].length;
            // Markers: [ ] ( )
            decorations.push(
              Decoration.inline(from, from + 1, { class: 'md-marker' }),
            );
            decorations.push(
              Decoration.inline(bracketEnd - 1, bracketEnd + 1, {
                class: 'md-marker',
              }),
            );
            decorations.push(
              Decoration.inline(to - 1, to, { class: 'md-marker' }),
            );
            // Link text
            decorations.push(
              Decoration.inline(from + 1, bracketEnd - 1, {
                class: 'md-link-text',
              }),
            );
            // URL
            decorations.push(
              Decoration.inline(urlStart, to - 1, { class: 'md-link-url' }),
            );
          }

          // Plain URLs
          const urlRegex = /https?:\/\/[^\s<>)"'\]]+/g;
          while ((match = urlRegex.exec(text)) !== null) {
            const from = lineStart + match.index;
            const to = from + match[0].length;
            // Check if inside a markdown link
            const before = text.substring(0, match.index);
            const isInLink =
              before.includes('](') &&
              !before.substring(before.lastIndexOf('](')).includes(')');
            if (!isInLink) {
              decorations.push(
                Decoration.inline(from, to, { class: 'md-url' }),
              );
            }
          }
        });

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}

// Placeholder plugin
function placeholderPlugin(text: string) {
  return new Plugin({
    props: {
      attributes(state): Record<string, string> {
        const doc = state.doc;
        const isEmpty =
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock &&
          doc.firstChild.content.size === 0;
        return isEmpty ? { 'data-placeholder': text } : {};
      },
    },
  });
}

// Convert plain text to ProseMirror doc
function textToDoc(text: string) {
  const div = document.createElement('div');
  const lines = text.split('\n');
  div.innerHTML = lines.map((line) => `<p>${line || '<br>'}</p>`).join('');
  return DOMParser.fromSchema(schema).parse(div);
}

// Convert ProseMirror doc to plain text
function docToText(doc: any) {
  const lines: string[] = [];
  doc.forEach((node: any) => {
    lines.push(node.textContent);
  });
  const text = lines.join('\n');
  return text.trim() === '' ? '' : text;
}

type ProseEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  isEditing?: boolean;
  onStartEditing?: () => void;
  /** Auto-focus when isEditing becomes true. Default: false */
  autoFocus?: boolean;
};

export function ProseEditor(props: ProseEditorProps) {
  let editorRef: HTMLDivElement | undefined;
  let viewRef: EditorView | null = null;
  let isUpdating = false;

  // Store current callbacks in refs to avoid recreating the editor
  let currentOnChange = props.onChange;
  let currentOnBlur = props.onBlur;
  let currentOnStartEditing = props.onStartEditing;

  createEffect(() => {
    currentOnChange = props.onChange;
    currentOnBlur = props.onBlur;
    currentOnStartEditing = props.onStartEditing;
  });

  onMount(() => {
    if (!editorRef) return;

    const doc = props.value
      ? textToDoc(props.value)
      : schema.node('doc', null, [schema.node('paragraph')]);

    const state = EditorState.create({
      doc,
      plugins: [
        markdownDecorationPlugin(),
        placeholderPlugin(props.placeholder ?? ''),
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
        }),
        keymap(baseKeymap),
      ],
    });

    const view = new EditorView(editorRef, {
      state,
      editable: () => !props.disabled && (props.isEditing ?? true),
      dispatchTransaction(transaction: Transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);

        if (transaction.docChanged && !isUpdating) {
          const text = docToText(newState.doc);
          currentOnChange?.(text);
        }
      },
      handleDOMEvents: {
        blur: () => {
          currentOnBlur?.();
          return false;
        },
        focus: () => {
          currentOnStartEditing?.();
          return false;
        },
      },
      handleClick(_view, _pos, event) {
        const target = event.target as HTMLElement;
        // Handle clicks on URLs
        if (
          target.classList.contains('md-url') ||
          target.classList.contains('md-link-url')
        ) {
          const url = target.textContent;
          if (url) {
            window.open(
              url.startsWith('http') ? url : `https://${url}`,
              '_blank',
              'noopener,noreferrer',
            );
            return true;
          }
        }
        // Handle clicks on link text
        if (target.classList.contains('md-link-text')) {
          const parent = target.parentElement;
          const urlEl = parent?.querySelector('.md-link-url');
          if (urlEl?.textContent) {
            window.open(urlEl.textContent, '_blank', 'noopener,noreferrer');
            return true;
          }
        }
        return false;
      },
    });

    viewRef = view;

    onCleanup(() => {
      view.destroy();
      viewRef = null;
    });
  });

  // Update editability when isEditing changes
  createEffect(() => {
    const editing = props.isEditing ?? true;
    const disabled = props.disabled ?? false;
    if (viewRef) {
      viewRef.setProps({
        editable: () => !disabled && editing,
      });
    }
  });

  // Sync external value changes (only when editor doesn't have focus)
  createEffect(() => {
    const value = props.value;
    if (!viewRef || isUpdating) return;

    // Don't sync if editor has focus - user is actively typing
    if (viewRef.hasFocus()) return;

    const currentText = docToText(viewRef.state.doc);
    if (currentText !== value) {
      isUpdating = true;
      const doc = value
        ? textToDoc(value)
        : schema.node('doc', null, [schema.node('paragraph')]);
      const state = EditorState.create({
        doc,
        plugins: viewRef.state.plugins,
      });
      viewRef.updateState(state);
      isUpdating = false;
    }
  });

  // Focus when editing starts (only if autoFocus is enabled)
  createEffect(() => {
    if (props.autoFocus && props.isEditing && viewRef) {
      viewRef.focus();
    }
  });

  const handleClick = () => {
    if (!props.disabled && !(props.isEditing ?? true)) {
      props.onStartEditing?.();
    }
  };

  return (
    <div
      ref={editorRef}
      onClick={handleClick}
      class={cn(
        'prose-editor',
        'w-full bg-transparent text-lg md:text-[15px] leading-[1.625] resize-none min-h-[26px]',
        'outline-none border-0 p-0 m-0 text-foreground/80',
        !(props.isEditing ?? true) && 'cursor-text',
        props.class,
      )}
    />
  );
}
