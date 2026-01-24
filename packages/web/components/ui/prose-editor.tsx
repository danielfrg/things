import { useEffect, useRef } from 'react'
import { EditorState, Transaction, Plugin } from 'prosemirror-state'
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view'
import { Schema, DOMParser } from 'prosemirror-model'
import { keymap } from 'prosemirror-keymap'
import { history, undo, redo } from 'prosemirror-history'
import { baseKeymap } from 'prosemirror-commands'
import { cn } from '@/lib/utils'

// Simple schema - just paragraphs and text, we'll decorate for styling
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM() { return ['p', 0] },
    },
    text: { group: 'inline' },
  },
  marks: {},
})

// Decoration patterns for markdown syntax
const PATTERNS = {
  heading: /^(#{1,6})\s+(.+)$/,
  bold: /\*\*([^*]+)\*\*/g,
  italic: /(?<!\*)\*([^*]+)\*(?!\*)/g,
  code: /`([^`]+)`/g,
  link: /\[([^\]]+)\]\(([^)]+)\)/g,
  url: /https?:\/\/[^\s<>)"'\]]+/g,
}

// Plugin to add decorations for markdown styling
function markdownDecorationPlugin() {
  return new Plugin({
    props: {
      decorations(state) {
        const decorations: Decoration[] = []
        
        state.doc.descendants((node, pos) => {
          if (!node.isTextblock) return
          
          const text = node.textContent
          const lineStart = pos + 1
          
          // Check for heading
          const headingMatch = text.match(PATTERNS.heading)
          if (headingMatch) {
            const hashLength = headingMatch[1].length
            // Style the hashes
            decorations.push(
              Decoration.inline(lineStart, lineStart + hashLength + 1, {
                class: 'md-heading-marker',
              })
            )
            // Style the heading text
            decorations.push(
              Decoration.inline(lineStart + hashLength + 1, lineStart + text.length, {
                class: 'md-heading-text',
              })
            )
            return
          }
          
          // Bold **text**
          let match: RegExpExecArray | null
          const boldRegex = /\*\*([^*]+)\*\*/g
          while ((match = boldRegex.exec(text)) !== null) {
            const from = lineStart + match.index
            const to = from + match[0].length
            // Markers
            decorations.push(Decoration.inline(from, from + 2, { class: 'md-marker' }))
            decorations.push(Decoration.inline(to - 2, to, { class: 'md-marker' }))
            // Bold text
            decorations.push(Decoration.inline(from + 2, to - 2, { class: 'md-bold' }))
          }
          
          // Italic *text* (not preceded/followed by *)
          const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g
          while ((match = italicRegex.exec(text)) !== null) {
            const from = lineStart + match.index
            const to = from + match[0].length
            // Check it's not inside a bold
            const isBold = text.substring(Math.max(0, match.index - 1), match.index) === '*' ||
                          text.substring(match.index + match[0].length, match.index + match[0].length + 1) === '*'
            if (!isBold) {
              decorations.push(Decoration.inline(from, from + 1, { class: 'md-marker' }))
              decorations.push(Decoration.inline(to - 1, to, { class: 'md-marker' }))
              decorations.push(Decoration.inline(from + 1, to - 1, { class: 'md-italic' }))
            }
          }
          
          // Inline code `text`
          const codeRegex = /`([^`]+)`/g
          while ((match = codeRegex.exec(text)) !== null) {
            const from = lineStart + match.index
            const to = from + match[0].length
            decorations.push(Decoration.inline(from, from + 1, { class: 'md-marker' }))
            decorations.push(Decoration.inline(to - 1, to, { class: 'md-marker' }))
            decorations.push(Decoration.inline(from + 1, to - 1, { class: 'md-code' }))
          }
          
          // Links [text](url)
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
          while ((match = linkRegex.exec(text)) !== null) {
            const from = lineStart + match.index
            const bracketEnd = from + 1 + match[1].length + 1
            const urlStart = bracketEnd + 1
            const to = from + match[0].length
            // Markers: [ ] ( )
            decorations.push(Decoration.inline(from, from + 1, { class: 'md-marker' }))
            decorations.push(Decoration.inline(bracketEnd - 1, bracketEnd + 1, { class: 'md-marker' }))
            decorations.push(Decoration.inline(to - 1, to, { class: 'md-marker' }))
            // Link text
            decorations.push(Decoration.inline(from + 1, bracketEnd - 1, { class: 'md-link-text' }))
            // URL
            decorations.push(Decoration.inline(urlStart, to - 1, { class: 'md-link-url' }))
          }
          
          // Plain URLs
          const urlRegex = /https?:\/\/[^\s<>)"'\]]+/g
          while ((match = urlRegex.exec(text)) !== null) {
            const from = lineStart + match.index
            const to = from + match[0].length
            // Check if inside a markdown link
            const before = text.substring(0, match.index)
            const isInLink = before.includes('](') && !before.substring(before.lastIndexOf('](')).includes(')')
            if (!isInLink) {
              decorations.push(Decoration.inline(from, to, { class: 'md-url' }))
            }
          }
        })
        
        return DecorationSet.create(state.doc, decorations)
      },
    },
  })
}

// Placeholder plugin
function placeholderPlugin(text: string) {
  return new Plugin({
    props: {
      attributes(state): Record<string, string> {
        const doc = state.doc
        const isEmpty = doc.childCount === 1 && doc.firstChild?.isTextblock && doc.firstChild.content.size === 0
        return isEmpty ? { 'data-placeholder': text } : {}
      },
    },
  })
}

// Convert plain text to ProseMirror doc
function textToDoc(text: string, schema: Schema) {
  const div = document.createElement('div')
  const lines = text.split('\n')
  div.innerHTML = lines.map(line => `<p>${line || '<br>'}</p>`).join('')
  return DOMParser.fromSchema(schema).parse(div)
}

// Convert ProseMirror doc to plain text
function docToText(doc: any) {
  const lines: string[] = []
  doc.forEach((node: any) => {
    lines.push(node.textContent)
  })
  const text = lines.join('\n')
  return text.trim() === '' ? '' : text
}

interface ProseEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
  isEditing?: boolean
  onStartEditing?: () => void
}

export function ProseEditor({
  value,
  onChange,
  onBlur,
  placeholder = '',
  disabled = false,
  className = '',
  isEditing = true,
  onStartEditing,
}: ProseEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isUpdatingRef = useRef(false)
  
  const onChangeRef = useRef(onChange)
  const onBlurRef = useRef(onBlur)
  const onStartEditingRef = useRef(onStartEditing)
  
  onChangeRef.current = onChange
  onBlurRef.current = onBlur
  onStartEditingRef.current = onStartEditing

  useEffect(() => {
    if (!editorRef.current) return

    const doc = value ? textToDoc(value, schema) : schema.node('doc', null, [schema.node('paragraph')])

    const state = EditorState.create({
      doc,
      plugins: [
        markdownDecorationPlugin(),
        placeholderPlugin(placeholder),
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
        }),
        keymap(baseKeymap),
      ],
    })

    const view = new EditorView(editorRef.current, {
      state,
      editable: () => !disabled && isEditing,
      dispatchTransaction(transaction: Transaction) {
        const newState = view.state.apply(transaction)
        view.updateState(newState)

        if (transaction.docChanged && !isUpdatingRef.current) {
          const text = docToText(newState.doc)
          onChangeRef.current(text)
        }
      },
      handleDOMEvents: {
        blur: () => {
          onBlurRef.current?.()
          return false
        },
        focus: () => {
          onStartEditingRef.current?.()
          return false
        },
      },
      handleClick(_view, _pos, event) {
        const target = event.target as HTMLElement
        // Handle clicks on URLs
        if (target.classList.contains('md-url') || target.classList.contains('md-link-url')) {
          const url = target.textContent
          if (url) {
            window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer')
            return true
          }
        }
        // Handle clicks on link text
        if (target.classList.contains('md-link-text')) {
          const parent = target.parentElement
          const urlEl = parent?.querySelector('.md-link-url')
          if (urlEl?.textContent) {
            window.open(urlEl.textContent, '_blank', 'noopener,noreferrer')
            return true
          }
        }
        return false
      },
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [disabled, placeholder])

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.setProps({
        editable: () => !disabled && isEditing,
      })
    }
  }, [isEditing, disabled])

  useEffect(() => {
    if (!viewRef.current || isUpdatingRef.current) return

    const currentText = docToText(viewRef.current.state.doc)
    if (currentText !== value) {
      isUpdatingRef.current = true
      const doc = value ? textToDoc(value, schema) : schema.node('doc', null, [schema.node('paragraph')])
      const state = EditorState.create({
        doc,
        plugins: viewRef.current.state.plugins,
      })
      viewRef.current.updateState(state)
      isUpdatingRef.current = false
    }
  }, [value])

  useEffect(() => {
    if (isEditing && viewRef.current) {
      viewRef.current.focus()
    }
  }, [isEditing])

  return (
    <div
      ref={editorRef}
      onClick={() => !disabled && !isEditing && onStartEditing?.()}
      className={cn(
        'prose-editor',
        'w-full bg-transparent text-lg md:text-[15px] leading-[1.625] resize-none min-h-[26px]',
        'outline-none border-0 p-0 m-0 text-foreground/80',
        !isEditing && 'cursor-text',
        className,
      )}
    />
  )
}
