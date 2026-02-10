import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import { type NoteItem } from '../data/mockData'
import { useAppData } from '../state/useAppData'

export function NotePage() {
  const { id = '' } = useParams()
  const { findNoteById, toggleNotePinned, updateNoteTitle, updateNoteContent } = useAppData()
  const note = findNoteById(id)

  return (
    <NoteEditor
      key={id || 'new'}
      note={note}
      onTitleChange={(title) => {
        if (!note) return
        updateNoteTitle(note.id, title)
      }}
      onContentChange={(content) => {
        if (!note) return
        updateNoteContent(note.id, content)
      }}
      isPinned={Boolean(note?.pinned)}
      onTogglePinned={() => {
        if (!note) return
        toggleNotePinned(note.id)
      }}
    />
  )
}

interface NoteEditorProps {
  note?: NoteItem
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  isPinned: boolean
  onTogglePinned: () => void
}

function NoteEditor({
  note,
  onTitleChange,
  onContentChange,
  isPinned,
  onTogglePinned,
}: NoteEditorProps) {
  const [titleValue, setTitleValue] = useState(note?.title ?? 'Neue Notiz')
  const editorRef = useRef<HTMLDivElement>(null)
  const didInitEditorRef = useRef(false)
  const noteMenuRef = useRef<HTMLDivElement>(null)
  const [isEditorEmpty, setEditorEmpty] = useState(
    stripHtmlText(note?.content ?? '') === '',
  )
  const [isNoteMenuOpen, setNoteMenuOpen] = useState(false)
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
  })

  const setEditorNode = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return

      editorRef.current = node

      if (!didInitEditorRef.current) {
        node.innerHTML = note?.content ?? ''
        didInitEditorRef.current = true
      }
    },
    [note?.content],
  )

  function syncEditorContent() {
    const html = editorRef.current?.innerHTML ?? ''
    setEditorEmpty(stripHtmlText(html) === '')
    onContentChange(html)
  }

  const updateFormatState = useCallback(() => {
    if (!editorRef.current) return
    const selection = document.getSelection()
    const anchorNode = selection?.anchorNode

    if (!selection || !anchorNode || !editorRef.current.contains(anchorNode)) {
      setFormatState((prev) =>
        prev.bold || prev.italic || prev.underline
          ? { bold: false, italic: false, underline: false }
          : prev,
      )
      return
    }

    const next = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    }

    setFormatState((prev) =>
      prev.bold === next.bold &&
      prev.italic === next.italic &&
      prev.underline === next.underline
        ? prev
        : next,
    )
  }, [])

  useEffect(() => {
    function handleSelectionChange() {
      updateFormatState()
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [updateFormatState])

  useEffect(() => {
    if (!isNoteMenuOpen) return

    function handleOutsidePointer(event: globalThis.MouseEvent | globalThis.TouchEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!noteMenuRef.current?.contains(target)) {
        setNoteMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsidePointer)
    document.addEventListener('touchstart', handleOutsidePointer)

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer)
      document.removeEventListener('touchstart', handleOutsidePointer)
    }
  }, [isNoteMenuOpen])

  function runCommand(command: 'bold' | 'italic' | 'underline' | 'undo' | 'redo') {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command)
    syncEditorContent()
    updateFormatState()
  }

  function keepEditorFocus(event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) {
    event.preventDefault()
    editorRef.current?.focus()
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-white text-slate-900">
      <header
        className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 pb-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/"
            className="h-11 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            ← Zurück
          </Link>
          <p className="text-xs font-medium text-emerald-600">Gespeichert</p>
          <div className="relative" ref={noteMenuRef}>
            <button
              type="button"
              onClick={() => setNoteMenuOpen((prev) => !prev)}
              className="h-11 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              ...
            </button>
            {isNoteMenuOpen ? (
              <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onTogglePinned()
                    setNoteMenuOpen(false)
                  }}
                  className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  {isPinned ? 'Fixierung lösen' : 'Fixieren'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onMouseDown={keepEditorFocus}
            onTouchStart={keepEditorFocus}
            onClick={() => runCommand('undo')}
            className="h-11 min-w-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700"
          >
            Undo
          </button>
          <button
            type="button"
            onMouseDown={keepEditorFocus}
            onTouchStart={keepEditorFocus}
            onClick={() => runCommand('redo')}
            className="h-11 min-w-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-700"
          >
            Redo
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <button
            type="button"
            onMouseDown={keepEditorFocus}
            onTouchStart={keepEditorFocus}
            onClick={() => runCommand('bold')}
            className={`h-11 min-w-11 rounded-xl border px-3 text-base font-semibold ${
              formatState.bold
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 text-slate-700'
            }`}
            aria-label="Fett"
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={keepEditorFocus}
            onTouchStart={keepEditorFocus}
            onClick={() => runCommand('italic')}
            className={`h-11 min-w-11 rounded-xl border px-3 text-base italic ${
              formatState.italic
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 text-slate-700'
            }`}
            aria-label="Kursiv"
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={keepEditorFocus}
            onTouchStart={keepEditorFocus}
            onClick={() => runCommand('underline')}
            className={`h-11 min-w-11 rounded-xl border px-3 text-base underline ${
              formatState.underline
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 text-slate-700'
            }`}
            aria-label="Unterstrichen"
          >
            U
          </button>
        </div>
      </header>

      <section className="px-4 pb-10 pt-5">
        {note ? (
          <p className="mb-3 text-xs text-slate-500">Zuletzt aktualisiert: {note.updatedLabel}</p>
        ) : (
          <p className="mb-3 text-xs text-amber-600">
            Hinweis: Diese Notiz-ID ist nicht in den Dummy-Daten vorhanden.
          </p>
        )}

        <input
          id="note-title"
          name="noteTitle"
          value={titleValue}
          onChange={(event) => {
            const nextTitle = event.target.value
            setTitleValue(nextTitle)
            onTitleChange(nextTitle)
          }}
          className="w-full border-0 bg-transparent text-3xl font-semibold leading-tight text-slate-900 placeholder:text-slate-300 focus:outline-none"
          placeholder="Titel"
        />

        <div className="relative mt-4">
          {isEditorEmpty ? (
            <p className="pointer-events-none absolute left-4 top-4 text-base text-slate-400">
              Schreib hier...
            </p>
          ) : null}
          <div
            ref={setEditorNode}
            contentEditable
            suppressContentEditableWarning
            onBlur={syncEditorContent}
            onInput={syncEditorContent}
            onFocus={updateFormatState}
            className="min-h-[40vh] w-full rounded-2xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-700 outline-none focus:border-slate-400"
          />
        </div>
      </section>
    </main>
  )
}

function stripHtmlText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
}
