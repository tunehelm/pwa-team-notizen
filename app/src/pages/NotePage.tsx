import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { type NoteItem } from '../data/mockData'
import { MoveNoteModal } from '../components/MoveNoteModal'
import { ShareModal } from '../components/ShareModal'
import { useAppData } from '../state/useAppData'

export function NotePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const {
    currentUserId,
    findNoteById,
    findFolderById,
    moveNoteToTrash,
    toggleNotePinned,
    updateNoteTitle,
    updateNoteContent,
  } = useAppData()
  const note = findNoteById(id)
  const isOwner = Boolean(note && (!note.ownerId || (currentUserId && note.ownerId === currentUserId)))

  // Check if the note lives in a readonly folder
  const parentFolder = note?.folderId ? findFolderById(note.folderId) : undefined
  const isReadonly = parentFolder?.access === 'readonly' && !isOwner

  const backPath = note?.folderId ? `/folder/${note.folderId}` : '/'

  return (
    <>
      <NoteEditor
        key={id || 'new'}
        note={note}
        isOwner={isOwner}
        readOnly={isReadonly}
        backPath={backPath}
        onTitleChange={(title) => {
          if (!note || isReadonly) return
          updateNoteTitle(note.id, title)
        }}
        onContentChange={(content) => {
          if (!note || isReadonly) return
          updateNoteContent(note.id, content)
        }}
        isPinned={Boolean(note?.pinned)}
        onTogglePinned={() => {
          if (!note) return
          void toggleNotePinned(note.id)
        }}
        onDeleteNote={() => {
          if (!note) return
          void moveNoteToTrash(note.id).then(() => navigate(backPath))
        }}
        onMoveNote={() => setShowMoveModal(true)}
        onShareNote={() => setShowShareModal(true)}
      />
      {showShareModal && note ? (
        <ShareModal
          title={note.title}
          text={note.content ? note.content.replace(/<[^>]*>/g, '').slice(0, 1000) : ''}
          onClose={() => setShowShareModal(false)}
        />
      ) : null}
      {showMoveModal && note ? (
        <MoveNoteModal
          noteId={note.id}
          noteTitle={note.title}
          currentFolderId={note.folderId}
          onClose={() => setShowMoveModal(false)}
          onMoved={() => setShowMoveModal(false)}
        />
      ) : null}
    </>
  )
}

/* ─────────────────────── Types ─────────────────────── */

interface NoteEditorProps {
  note?: NoteItem
  isOwner: boolean
  readOnly?: boolean
  backPath: string
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  isPinned: boolean
  onTogglePinned: () => void
  onDeleteNote: () => void
  onMoveNote?: () => void
  onShareNote?: () => void
}

type ToolbarPanel = 'none' | 'format' | 'insert' | 'link' | 'draw'

/* ─────────────────────── Editor ─────────────────────── */

function NoteEditor({
  note,
  isOwner,
  readOnly = false,
  backPath,
  onTitleChange,
  onContentChange,
  isPinned,
  onTogglePinned,
  onDeleteNote,
  onMoveNote,
  onShareNote,
}: NoteEditorProps) {
  const [titleValue, setTitleValue] = useState(note?.title ?? 'Neue Notiz')
  const editorRef = useRef<HTMLDivElement>(null)
  const didInitEditorRef = useRef(false)
  const noteMenuRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEditorEmpty, setEditorEmpty] = useState(stripHtmlText(note?.content ?? '') === '')
  const [isNoteMenuOpen, setNoteMenuOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<ToolbarPanel>('none')
  const [showListMenu, setShowListMenu] = useState(false)
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false })

  // Link-Dialog state
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#1e293b')
  const [drawSize, setDrawSize] = useState(3)
  const drawingRef = useRef(false)

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
        prev.bold || prev.italic || prev.underline ? { bold: false, italic: false, underline: false } : prev,
      )
      return
    }
    const next = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    }
    setFormatState((prev) =>
      prev.bold === next.bold && prev.italic === next.italic && prev.underline === next.underline ? prev : next,
    )
  }, [])

  useEffect(() => {
    const handler = () => updateFormatState()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [updateFormatState])

  useEffect(() => {
    if (!isNoteMenuOpen) return
    function handleOutside(event: globalThis.MouseEvent | globalThis.TouchEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!noteMenuRef.current?.contains(target)) setNoteMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [isNoteMenuOpen])

  /* ── Commands ── */

  function runCommand(command: string, value?: string) {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command, false, value)
    syncEditorContent()
    updateFormatState()
  }

  function keepEditorFocus(event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) {
    event.preventDefault()
    editorRef.current?.focus()
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      document.execCommand('insertHTML', false, '&emsp;')
      syncEditorContent()
    }
  }

  /* ── Link einfügen ── */

  function insertLink() {
    const url = linkUrl.trim()
    if (!url) return
    const label = linkLabel.trim() || url
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener" style="color:#3b82f6;text-decoration:underline">${label}</a>&nbsp;`)
    syncEditorContent()
    setLinkUrl('')
    setLinkLabel('')
    setActivePanel('none')
  }

  /* ── Tabelle einfügen ── */

  function insertTable(rows: number, cols: number) {
    let html = '<table style="width:100%;border-collapse:collapse;margin:8px 0"><tbody>'
    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #cbd5e1;padding:6px 10px;min-width:60px" contenteditable="true">&nbsp;</td>'
      }
      html += '</tr>'
    }
    html += '</tbody></table><p><br></p>'
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, html)
    syncEditorContent()
    setActivePanel('none')
  }

  /* ── Zeichnung (Canvas) ── */

  function openDrawing() {
    setIsDrawing(true)
    setActivePanel('draw')
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    })
  }

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    drawingRef.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.strokeStyle = drawColor
    ctx.lineWidth = drawSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function moveDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function endDraw() {
    drawingRef.current = false
  }

  function insertDrawing() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    editorRef.current?.focus()
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${dataUrl}" alt="Zeichnung" style="max-width:100%;border-radius:12px;margin:8px 0" /><p><br></p>`,
    )
    syncEditorContent()
    setIsDrawing(false)
    setActivePanel('none')
  }

  /* ── Foto/Datei-Upload ── */

  function handleFileUpload(accept: string) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return

      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader()
        reader.onload = () => {
          editorRef.current?.focus()
          const tag = file.type.startsWith('video/')
            ? `<video src="${reader.result as string}" controls style="max-width:100%;border-radius:12px;margin:8px 0"></video>`
            : `<img src="${reader.result as string}" alt="${file.name}" style="max-width:100%;border-radius:12px;margin:8px 0" />`
          document.execCommand('insertHTML', false, `${tag}<p><br></p>`)
          syncEditorContent()
        }
        reader.readAsDataURL(file)
      } else if (file.type.startsWith('audio/')) {
        const reader = new FileReader()
        reader.onload = () => {
          editorRef.current?.focus()
          document.execCommand(
            'insertHTML',
            false,
            `<audio src="${reader.result as string}" controls style="width:100%;margin:8px 0"></audio><p><br></p>`,
          )
          syncEditorContent()
        }
        reader.readAsDataURL(file)
      } else {
        // Generic file – display as download link
        const reader = new FileReader()
        reader.onload = () => {
          editorRef.current?.focus()
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${reader.result as string}" download="${file.name}" style="color:#3b82f6;text-decoration:underline">📎 ${file.name}</a>&nbsp;`,
          )
          syncEditorContent()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
    setActivePanel('none')
  }

  /* ── Audio aufnehmen ── */

  function startAudioRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Audio-Aufnahme wird von diesem Browser nicht unterstützt.')
      return
    }

    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => {
          editorRef.current?.focus()
          document.execCommand(
            'insertHTML',
            false,
            `<audio src="${reader.result as string}" controls style="width:100%;margin:8px 0"></audio><p><br></p>`,
          )
          syncEditorContent()
        }
        reader.readAsDataURL(blob)
      }

      recorder.start()
      // Stop after user confirms
      const stopBtn = document.createElement('div')
      stopBtn.id = 'audio-recording-overlay'
      stopBtn.style.cssText =
        'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5)'
      stopBtn.innerHTML =
        '<button style="background:#ef4444;color:white;border:none;padding:16px 32px;border-radius:16px;font-size:16px;font-weight:600;cursor:pointer">⏹ Aufnahme beenden</button>'
      stopBtn.onclick = () => {
        recorder.stop()
        stopBtn.remove()
      }
      document.body.appendChild(stopBtn)
    })

    setActivePanel('none')
  }

  /* ── Render ── */

  const tbtn =
    'flex h-10 min-w-10 items-center justify-center rounded-xl border px-2.5 text-sm transition-colors'
  const tbtnDefault = 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] active:bg-[var(--color-border)]'
  const tbtnActive = 'border-blue-500 bg-blue-500 text-white'

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-3xl pb-[calc(env(safe-area-inset-bottom)+7rem)]" style={{ backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)' }}>
        {/* ── Top bar ── */}
        <header
          className="sticky top-0 z-30 px-3 pb-2 backdrop-blur"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)', backgroundColor: 'color-mix(in srgb, var(--color-bg-app) 92%, transparent)', borderBottom: '1px solid var(--color-border)' } as CSSProperties}
        >
          <div className="flex items-center justify-between gap-2">
            <Link to={backPath} className="h-11 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-card)]" style={{ color: 'var(--color-text-primary)' }}>
              ← Zurück
            </Link>
            <p className={`text-xs font-medium ${readOnly ? 'text-amber-500' : 'text-emerald-600'}`}>
              {readOnly ? 'Nur Lesen' : 'Gespeichert'}
            </p>
            <div className="relative" ref={noteMenuRef}>
              <button
                type="button"
                onClick={() => setNoteMenuOpen((prev) => !prev)}
                className="h-11 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-card)]"
                style={{ color: 'var(--color-text-primary)' }}
              >
                ...
              </button>
              {isNoteMenuOpen ? (
                <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border p-1 shadow-lg" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
                  <button
                    type="button"
                    onClick={() => { onTogglePinned(); setNoteMenuOpen(false) }}
                    className="flex h-11 w-full items-center rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {isPinned ? 'Fixierung lösen' : 'Fixieren'}
                  </button>
                  {onShareNote ? (
                    <button
                      type="button"
                      onClick={() => { onShareNote(); setNoteMenuOpen(false) }}
                      className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      Teilen
                    </button>
                  ) : null}
                  {onMoveNote ? (
                    <button
                      type="button"
                      onClick={() => { onMoveNote(); setNoteMenuOpen(false) }}
                      className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M15 3h6v6" />
                        <path d="M10 14L21 3" />
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      </svg>
                      Verschieben
                    </button>
                  ) : null}
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => { onDeleteNote(); setNoteMenuOpen(false) }}
                      className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      In Papierkorb
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Primary toolbar row ── */}
          <div className={`mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none ${readOnly ? 'hidden' : ''}`}>
            {/* Undo / Redo */}
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('undo')} className={`${tbtn} ${tbtnDefault}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H8" /><path d="M7 14l-4-4 4-4" /></svg>
            </button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('redo')} className={`${tbtn} ${tbtnDefault}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 10H11a5 5 0 00-5 5v0a5 5 0 005 5h5" /><path d="M17 14l4-4-4-4" /></svg>
            </button>

            <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* B / I / U */}
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('bold')} className={`${tbtn} ${formatState.bold ? tbtnActive : tbtnDefault} font-bold`} aria-label="Fett">B</button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('italic')} className={`${tbtn} ${formatState.italic ? tbtnActive : tbtnDefault} italic`} aria-label="Kursiv">I</button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('underline')} className={`${tbtn} ${formatState.underline ? tbtnActive : tbtnDefault} underline`} aria-label="Unterstrichen">U</button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('strikeThrough')} className={`${tbtn} ${tbtnDefault} line-through`} aria-label="Durchgestrichen">S</button>

            <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Format panel toggle */}
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'format' ? 'none' : 'format'))} className={`${tbtn} ${activePanel === 'format' ? tbtnActive : tbtnDefault}`} aria-label="Format">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>
            </button>

            {/* Insert panel toggle */}
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'insert' ? 'none' : 'insert'))} className={`${tbtn} ${activePanel === 'insert' ? tbtnActive : tbtnDefault}`} aria-label="Einfügen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
            </button>

            {/* Link */}
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'link' ? 'none' : 'link'))} className={`${tbtn} ${activePanel === 'link' ? tbtnActive : tbtnDefault}`} aria-label="Link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
            </button>

            {/* Draw */}
            <button type="button" onClick={openDrawing} className={`${tbtn} ${activePanel === 'draw' ? tbtnActive : tbtnDefault}`} aria-label="Zeichnen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
            </button>
          </div>

          {/* ── Format sub-panel ── */}
          {activePanel === 'format' ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('formatBlock', '<h1>')} className={`${tbtn} ${tbtnDefault} text-xs`}>H1</button>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('formatBlock', '<h2>')} className={`${tbtn} ${tbtnDefault} text-xs`}>H2</button>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('formatBlock', '<h3>')} className={`${tbtn} ${tbtnDefault} text-xs`}>H3</button>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('formatBlock', '<p>')} className={`${tbtn} ${tbtnDefault} text-xs`}>Text</button>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('formatBlock', '<blockquote>')} className={`${tbtn} ${tbtnDefault} text-xs`}>Zitat</button>
              <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('insertUnorderedList')} className={`${tbtn} ${tbtnDefault}`} aria-label="Aufzählung">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>
              </button>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('insertOrderedList')} className={`${tbtn} ${tbtnDefault}`} aria-label="Nummerierung">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="2" y="7" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">1</text><text x="2" y="13" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">2</text><text x="2" y="19" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">3</text></svg>
              </button>
              <button
                type="button"
                onMouseDown={keepEditorFocus}
                onTouchStart={keepEditorFocus}
                onClick={() => {
                  editorRef.current?.focus()
                  document.execCommand(
                    'insertHTML',
                    false,
                    '<div style="display:flex;align-items:flex-start;gap:6px;margin:4px 0"><input type="checkbox" style="margin-top:4px;width:16px;height:16px;accent-color:#3b82f6" /><span>Aufgabe</span></div>',
                  )
                  syncEditorContent()
                }}
                className={`${tbtn} ${tbtnDefault}`}
                aria-label="Checkliste"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
              </button>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('indent')} className={`${tbtn} ${tbtnDefault}`} aria-label="Einrücken">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><line x1="3" y1="4" x2="21" y2="4" /><line x1="11" y1="10" x2="21" y2="10" /><line x1="11" y1="16" x2="21" y2="16" /><line x1="3" y1="22" x2="21" y2="22" /><polyline points="3 10 7 13 3 16" /></svg>
              </button>
              <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('outdent')} className={`${tbtn} ${tbtnDefault}`} aria-label="Ausrücken">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><line x1="3" y1="4" x2="21" y2="4" /><line x1="11" y1="10" x2="21" y2="10" /><line x1="11" y1="16" x2="21" y2="16" /><line x1="3" y1="22" x2="21" y2="22" /><polyline points="7 10 3 13 7 16" /></svg>
              </button>
            </div>
          ) : null}

          {/* ── Insert sub-panel ── */}
          {activePanel === 'insert' ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button type="button" onClick={() => insertTable(3, 3)} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                Tabelle
              </button>
              <button type="button" onClick={() => handleFileUpload('image/*')} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                Foto
              </button>
              <button type="button" onClick={() => handleFileUpload('video/*')} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                Video
              </button>
              <button type="button" onClick={startAudioRecording} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                Audio
              </button>
              <button type="button" onClick={() => handleFileUpload('*/*')} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                Datei
              </button>
              <button
                type="button"
                onMouseDown={keepEditorFocus}
                onTouchStart={keepEditorFocus}
                onClick={() => {
                  editorRef.current?.focus()
                  document.execCommand('insertHorizontalRule')
                  syncEditorContent()
                }}
                className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}
              >
                — Linie
              </button>
            </div>
          ) : null}

          {/* ── Link sub-panel ── */}
          {activePanel === 'link' ? (
            <div className="mt-1.5 flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <input
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-10 rounded-xl border px-3 text-sm focus:border-blue-400 focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
              />
              <input
                type="text"
                placeholder="Angezeigter Name (optional)"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                className="h-10 rounded-xl border px-3 text-sm focus:border-blue-400 focus:outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
              />
              <div className="flex gap-2">
                <button type="button" onClick={insertLink} className="h-10 rounded-xl bg-blue-500 px-4 text-sm font-medium text-white active:bg-blue-600">
                  Einfügen
                </button>
                <button type="button" onClick={() => setActivePanel('none')} className="h-10 rounded-xl border px-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  Abbrechen
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {/* ── Drawing overlay ── */}
        {isDrawing ? (
          <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <button type="button" onClick={() => { setIsDrawing(false); setActivePanel('none') }} className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Abbrechen
              </button>
              <span className="text-sm font-medium text-slate-700">Zeichnen</span>
              <button type="button" onClick={insertDrawing} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white active:bg-blue-600">
                Einfügen
              </button>
            </div>
            <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2">
              {['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDrawColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${drawColor === c ? 'border-slate-900 ring-2 ring-blue-300' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="h-6 w-px bg-slate-200" />
              <input type="range" min={1} max={12} value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} className="w-24 accent-blue-500" />
              <span className="text-xs text-slate-500">{drawSize}px</span>
            </div>
            <canvas
              ref={canvasRef}
              className="flex-1 touch-none"
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
            />
          </div>
        ) : null}

        {/* ── Content ── */}
        <section className="px-4 pb-10 pt-5">
          {note ? (
            <p className="mb-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>Zuletzt aktualisiert: {note.updatedLabel}</p>
          ) : (
            <p className="mb-3 text-xs text-amber-600">
              Hinweis: Diese Notiz-ID ist nicht in den Dummy-Daten vorhanden.
            </p>
          )}

          <input
            id="note-title"
            name="noteTitle"
            value={titleValue}
            readOnly={readOnly}
            onChange={(event) => {
              if (readOnly) return
              const nextTitle = event.target.value
              setTitleValue(nextTitle)
              void onTitleChange(nextTitle)
            }}
            className={`w-full border-0 bg-transparent text-3xl font-semibold leading-tight placeholder:text-[var(--color-text-muted)] focus:outline-none ${readOnly ? 'cursor-default' : ''}`}
            style={{ color: 'var(--color-text-primary)' }}
            placeholder="Titel"
          />

          <div className="relative mt-4">
            {isEditorEmpty && !readOnly ? (
              <p className="pointer-events-none absolute left-4 top-4 text-base" style={{ color: 'var(--color-text-muted)' }}>
                Schreib hier...
              </p>
            ) : null}
            <div
              ref={setEditorNode}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onBlur={readOnly ? undefined : syncEditorContent}
              onInput={readOnly ? undefined : syncEditorContent}
              onKeyDown={readOnly ? undefined : handleEditorKeyDown}
              onFocus={readOnly ? undefined : () => updateFormatState()}
              className={`note-editor min-h-[40vh] w-full rounded-2xl border p-4 text-base leading-7 outline-none ${readOnly ? 'cursor-default' : ''}`}
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </section>

        {/* ── Bottom Toolbar (wie Apple Notes) ── */}
        {!readOnly ? (
          <div
            className="sticky bottom-0 z-30 flex items-center justify-between px-3 py-2"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderTop: '1px solid var(--color-border)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
            }}
          >
            <div className="flex items-center gap-1">
              {/* Einrücken links (Outdent) */}
              <button
                type="button"
                onMouseDown={keepEditorFocus}
                onTouchStart={keepEditorFocus}
                onClick={() => runCommand('outdent')}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Ausrücken"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                  <line x1="3" y1="4" x2="21" y2="4" />
                  <line x1="11" y1="10" x2="21" y2="10" />
                  <line x1="11" y1="16" x2="21" y2="16" />
                  <line x1="3" y1="22" x2="21" y2="22" />
                  <polyline points="7 10 3 13 7 16" />
                </svg>
              </button>

              {/* Einrücken rechts (Indent) */}
              <button
                type="button"
                onMouseDown={keepEditorFocus}
                onTouchStart={keepEditorFocus}
                onClick={() => runCommand('indent')}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Einrücken"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                  <line x1="3" y1="4" x2="21" y2="4" />
                  <line x1="11" y1="10" x2="21" y2="10" />
                  <line x1="11" y1="16" x2="21" y2="16" />
                  <line x1="3" y1="22" x2="21" y2="22" />
                  <polyline points="3 10 7 13 3 16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Pin */}
              <button
                type="button"
                onClick={onTogglePinned}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isPinned ? 'text-blue-500' : ''}`}
                style={isPinned ? undefined : { color: 'var(--color-text-secondary)' }}
                aria-label={isPinned ? 'Fixierung lösen' : 'Fixieren'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M12 17v5" />
                  <path d="M9 11V4a1 1 0 011-1h4a1 1 0 011 1v7" />
                  <path d="M5 17h14" />
                  <path d="M7 11l1.5 6h7L17 11" />
                </svg>
              </button>

              {/* Download / Export */}
              <button
                type="button"
                onClick={() => {
                  if (!note) return
                  const text = editorRef.current?.innerText || note.content?.replace(/<[^>]*>/g, '') || ''
                  const blob = new Blob([`# ${titleValue}\n\n${text}`], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${titleValue || 'Notiz'}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Herunterladen"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>

              {/* Checkbox / Aufgabe */}
              <button
                type="button"
                onMouseDown={keepEditorFocus}
                onTouchStart={keepEditorFocus}
                onClick={() => {
                  editorRef.current?.focus()
                  document.execCommand(
                    'insertHTML',
                    false,
                    '<div style="display:flex;align-items:flex-start;gap:6px;margin:4px 0"><input type="checkbox" style="margin-top:4px;width:16px;height:16px;accent-color:#3b82f6" /><span>Aufgabe</span></div>',
                  )
                  syncEditorContent()
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Checkliste"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </button>

              {/* Aufzählungslisten-Menü */}
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={keepEditorFocus}
                  onTouchStart={keepEditorFocus}
                  onClick={() => setShowListMenu((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Aufzählungsliste"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <circle cx="4" cy="6" r="1" fill="currentColor" />
                    <circle cx="4" cy="12" r="1" fill="currentColor" />
                    <circle cx="4" cy="18" r="1" fill="currentColor" />
                  </svg>
                </button>
                {showListMenu ? (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-56 rounded-2xl border p-1 shadow-lg"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
                  >
                    <button
                      type="button"
                      onMouseDown={keepEditorFocus}
                      onClick={() => { runCommand('insertUnorderedList'); setShowListMenu(false) }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <circle cx="4" cy="6" r="1" fill="currentColor" />
                        <circle cx="4" cy="12" r="1" fill="currentColor" />
                        <circle cx="4" cy="18" r="1" fill="currentColor" />
                      </svg>
                      Aufzählungspunkte
                    </button>
                    <button
                      type="button"
                      onMouseDown={keepEditorFocus}
                      onClick={() => {
                        editorRef.current?.focus()
                        document.execCommand('insertHTML', false, '<ul style="list-style-type: \'-  \'">' +
                          '<li>Element</li></ul>')
                        syncEditorContent()
                        setShowListMenu(false)
                      }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="2" y1="6" x2="5" y2="6" />
                        <line x1="2" y1="12" x2="5" y2="12" />
                        <line x1="2" y1="18" x2="5" y2="18" />
                      </svg>
                      Mit Bindestrich
                    </button>
                    <button
                      type="button"
                      onMouseDown={keepEditorFocus}
                      onClick={() => { runCommand('insertOrderedList'); setShowListMenu(false) }}
                      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                        <line x1="10" y1="6" x2="21" y2="6" />
                        <line x1="10" y1="12" x2="21" y2="12" />
                        <line x1="10" y1="18" x2="21" y2="18" />
                        <text x="2" y="7" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">1</text>
                        <text x="2" y="13" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">2</text>
                        <text x="2" y="19" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">3</text>
                      </svg>
                      Nummeriert
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  )
}

function stripHtmlText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
}
