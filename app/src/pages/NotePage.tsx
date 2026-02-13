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
import { SidebarLayout } from '../components/SidebarLayout'
import { useLayoutContext } from '../context/LayoutContext'
import { MoveNoteModal } from '../components/MoveNoteModal'
import { ShareModal } from '../components/ShareModal'
import { useAppData } from '../state/useAppData'

import { isAdminEmail } from '../lib/admin'
import { SELECTABLE_ICONS, FolderIcon } from '../components/FolderIcons'

export function NotePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const {
    currentUserId,
    currentUserEmail,
    findNoteById,
    findFolderById,
    moveNoteToTrash,
    toggleNotePinned,
    updateNoteTitle,
    updateNoteContent,
  } = useAppData()
  const note = findNoteById(id)
  const isAdmin = isAdminEmail(currentUserEmail)
  const isOwner = Boolean(note && (!note.ownerId || (currentUserId && note.ownerId === currentUserId)))
  const canDelete = isOwner || isAdmin

  // Prüfe ob die Notiz in einem readonly Ordner (oder dessen Eltern) liegt
  const parentFolder = note?.folderId ? findFolderById(note.folderId) : undefined
  let folderIsReadonly = parentFolder?.access === 'readonly'
  if (!folderIsReadonly && parentFolder?.parentId) {
    let ancestor = findFolderById(parentFolder.parentId)
    while (ancestor) {
      if (ancestor.access === 'readonly') { folderIsReadonly = true; break }
      ancestor = ancestor.parentId ? findFolderById(ancestor.parentId) : undefined
    }
  }
  const isReadonly = folderIsReadonly && !isOwner && !isAdmin

  const backPath = note?.folderId ? `/folder/${note.folderId}` : '/'

  return (
    <SidebarLayout title={note?.title || 'Notiz'} showCreate={false}>
      <NoteEditor
        key={id || 'new'}
        note={note}
        canDelete={canDelete}
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
          if (!note || isReadonly) return
          void moveNoteToTrash(note.id).then(() => navigate(backPath)).catch(() => {/* Fehler wird im AppDataContext angezeigt */})
        }}
        onMoveNote={!isReadonly ? () => setShowMoveModal(true) : undefined}
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
    </SidebarLayout>
  )
}

/* ─────────────────────── Types ─────────────────────── */

interface NoteEditorProps {
  note?: NoteItem
  canDelete: boolean
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

type ToolbarPanel = 'none' | 'format' | 'insert' | 'link' | 'draw' | 'table' | 'fontcolor' | 'symbols'

/* ── Font color presets ── */
const FONT_COLORS = [
  { label: 'Standard', value: '' },
  { label: 'Rot', value: '#ef4444' },
  { label: 'Orange', value: '#f59e0b' },
  { label: 'Grün', value: '#22c55e' },
  { label: 'Blau', value: '#3b82f6' },
  { label: 'Lila', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Grau', value: '#6b7280' },
]

/* ─────────────────────── Editor ─────────────────────── */

function NoteEditor({
  note,
  canDelete,
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
  const [isNoteMenuOpen, setNoteMenuOpen] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving'>('saved')
  const [activePanel, setActivePanel] = useState<ToolbarPanel>('none')
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false, strikeThrough: false, block: 'p' as string, list: '' as string })

  // Link-Dialog state
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  // Table dialog state
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)

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
    trackedContentChange(html)
  }

  const updateFormatState = useCallback(() => {
    if (!editorRef.current) return
    const selection = document.getSelection()
    const anchorNode = selection?.anchorNode
    if (!selection || !anchorNode || !editorRef.current.contains(anchorNode)) {
      setFormatState((prev) =>
        prev.bold || prev.italic || prev.underline || prev.strikeThrough || prev.block !== 'p' || prev.list !== ''
          ? { bold: false, italic: false, underline: false, strikeThrough: false, block: 'p', list: '' }
          : prev,
      )
      return
    }

    // Detect current block format by walking up from anchor node
    let blockTag = 'p'
    let node: Node | null = anchorNode
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase()
        if (['h1', 'h2', 'h3', 'blockquote'].includes(tag)) {
          blockTag = tag
          break
        }
        if (tag === 'p' || tag === 'div') {
          blockTag = 'p'
          break
        }
      }
      node = node.parentNode
    }

    // Detect list state
    let listType = ''
    if (document.queryCommandState('insertUnorderedList')) listType = 'ul'
    else if (document.queryCommandState('insertOrderedList')) listType = 'ol'

    const next = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      block: blockTag,
      list: listType,
    }
    setFormatState((prev) =>
      prev.bold === next.bold &&
      prev.italic === next.italic &&
      prev.underline === next.underline &&
      prev.strikeThrough === next.strikeThrough &&
      prev.block === next.block &&
      prev.list === next.list
        ? prev
        : next,
    )
  }, [])

  // Track latest content so we can flush on unmount
  const latestContentRef = useRef(note?.content ?? '')
  const hasPendingChangeRef = useRef(false)
  const originalOnContentChange = onContentChange

  // Wrap onContentChange to track pending saves + visual feedback
  const saveTimeoutRef = useRef<number | null>(null)
  const trackedContentChange = useCallback(
    (html: string) => {
      latestContentRef.current = html
      hasPendingChangeRef.current = true
      setSaveIndicator('saving')
      originalOnContentChange(html)
      // Show "saved" after debounce+buffer
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = window.setTimeout(() => setSaveIndicator('saved'), 900)
    },
    [originalOnContentChange],
  )

  // Flush pending content on unmount (before navigation)
  useEffect(() => {
    return () => {
      // Content change callback is debounced in AppDataContext,
      // but we want the latest content to go through immediately.
      // The debounce mechanism in context will handle deduplication.
      if (hasPendingChangeRef.current) {
        originalOnContentChange(latestContentRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ── Image Resize + Move Handler ── */
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    let selectedImg: HTMLImageElement | null = null
    let resizeHandle: HTMLDivElement | null = null
    let startX = 0
    let startW = 0
    let startH = 0

    // Move state (für img-wrap)
    let moveWrapper: HTMLElement | null = null
    let moveStartX = 0
    let moveStartY = 0
    let moveStartLeft = 0
    let moveStartTop = 0

    function positionHandle() {
      if (!selectedImg || !resizeHandle || !editor) return
      const editorRect = editor.getBoundingClientRect()
      const imgRect = selectedImg.getBoundingClientRect()
      resizeHandle.style.left = `${imgRect.right - editorRect.left - 7 + editor.scrollLeft}px`
      resizeHandle.style.top = `${imgRect.bottom - editorRect.top - 7 + editor.scrollTop}px`
    }

    function removeHandle() {
      if (selectedImg) {
        selectedImg.classList.remove('img-selected')
        selectedImg.removeEventListener('pointerdown', onImagePointerDown)
        selectedImg = null
      }
      if (resizeHandle) {
        resizeHandle.remove()
        resizeHandle = null
      }
      moveWrapper = null
    }

    function onImagePointerDown(e: PointerEvent) {
      if (!selectedImg) return
      const wrap = selectedImg.parentElement
      if (!wrap?.classList.contains('img-wrap')) return
      e.preventDefault()
      e.stopPropagation()
      moveWrapper = wrap
      moveStartX = e.clientX
      moveStartY = e.clientY
      // Float-Element: margin für Position nutzen (bleibt stabil beim Tippen)
      moveStartLeft = parseFloat(wrap.style.marginLeft || '0')
      moveStartTop = parseFloat(wrap.style.marginTop || '0')
      document.addEventListener('pointermove', onMoveMove)
      document.addEventListener('pointerup', onMoveEnd)
    }

    function onMoveMove(e: PointerEvent) {
      if (!moveWrapper) return
      e.preventDefault()
      const dx = e.clientX - moveStartX
      const dy = e.clientY - moveStartY
      moveWrapper.style.marginLeft = `${moveStartLeft + dx}px`
      moveWrapper.style.marginTop = `${moveStartTop + dy}px`
      positionHandle()
    }

    function onMoveEnd() {
      document.removeEventListener('pointermove', onMoveMove)
      document.removeEventListener('pointerup', onMoveEnd)
      if (moveWrapper) {
        syncEditorContent()
        moveWrapper = null
      }
      positionHandle()
    }

    function selectImage(img: HTMLImageElement) {
      removeHandle()
      selectedImg = img
      img.classList.add('img-selected')

      resizeHandle = document.createElement('div')
      resizeHandle.className = 'img-resize-handle'
      editor!.style.position = 'relative'
      editor!.appendChild(resizeHandle)
      positionHandle()

      resizeHandle.addEventListener('pointerdown', onResizeStart)
      img.addEventListener('pointerdown', onImagePointerDown)
    }

    function onResizeStart(e: PointerEvent) {
      if (!selectedImg) return
      e.preventDefault()
      e.stopPropagation()
      startX = e.clientX
      startW = selectedImg.offsetWidth
      startH = selectedImg.offsetHeight
      document.addEventListener('pointermove', onResizeMove)
      document.addEventListener('pointerup', onResizeEnd)
    }

    function onResizeMove(e: PointerEvent) {
      if (!selectedImg) return
      const dx = e.clientX - startX
      const newW = Math.max(50, startW + dx)
      const ratio = startH / startW
      const newH = Math.max(50, newW * ratio)
      selectedImg.style.width = `${newW}px`
      selectedImg.style.height = `${newH}px`
      positionHandle()
    }

    function onResizeEnd() {
      document.removeEventListener('pointermove', onResizeMove)
      document.removeEventListener('pointerup', onResizeEnd)
      syncEditorContent()
      positionHandle()
    }

    function handleClick(e: Event) {
      const target = e.target as HTMLElement
      if (target instanceof HTMLImageElement && editor!.contains(target)) {
        e.preventDefault()
        selectImage(target)
      } else if (target !== resizeHandle) {
        removeHandle()
      }
    }

    function preventNativeDrag(e: DragEvent) {
      const target = e.target as HTMLElement
      if (target?.closest?.('.img-wrap') || target instanceof HTMLImageElement) {
        e.preventDefault()
      }
    }
    editor.addEventListener('dragstart', preventNativeDrag)

    editor.addEventListener('click', handleClick)
    // Also deselect when clicking outside editor
    function handleOutsideClick(e: Event) {
      if (!editor!.contains(e.target as Node) && (e.target as HTMLElement) !== resizeHandle) {
        removeHandle()
      }
    }
    document.addEventListener('click', handleOutsideClick)

    return () => {
      editor.removeEventListener('dragstart', preventNativeDrag)
      editor.removeEventListener('click', handleClick)
      document.removeEventListener('click', handleOutsideClick)
      removeHandle()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    // Fix: Nach Enter in blockquote, wenn leer -> aus blockquote raus
    if (event.key === 'Enter') {
      const sel = document.getSelection()
      const node = sel?.anchorNode
      if (node) {
        const bq = (node instanceof HTMLElement ? node : node.parentElement)?.closest('blockquote')
        if (bq) {
          const text = bq.textContent || ''
          // Wenn blockquote leer oder nur whitespace, raus aus blockquote
          if (text.trim() === '') {
            event.preventDefault()
            document.execCommand('formatBlock', false, '<p>')
            syncEditorContent()
          }
        }
      }
    }
  }

  /* ── Fix italic leak: after formatBlock, reset italic ── */
  function runFormatBlock(tag: string) {
    if (!editorRef.current) return
    editorRef.current.focus()

    // Check if user has a partial selection within a block
    const selection = document.getSelection()
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer
      const blockNode = container instanceof HTMLElement ? container : container.parentElement
      // If the selection doesn't cover the entire block text, use inline font-size instead
      if (blockNode && editorRef.current.contains(blockNode)) {
        const blockText = (blockNode.closest('p, h1, h2, h3, div, blockquote') || blockNode).textContent || ''
        const selText = selection.toString()
        if (selText.length > 0 && selText.length < blockText.trim().length) {
          // Inline font-size for partial selections
          const sizeMap: Record<string, string> = {
            '<h1>': '1.75em',
            '<h2>': '1.375em',
            '<h3>': '1.125em',
            '<p>': '1em',
          }
          const weightMap: Record<string, string> = {
            '<h1>': '700',
            '<h2>': '600',
            '<h3>': '600',
            '<p>': '400',
          }
          const size = sizeMap[tag]
          const weight = weightMap[tag]
          if (size) {
            const span = document.createElement('span')
            span.style.fontSize = size
            if (weight) span.style.fontWeight = weight
            range.surroundContents(span)
            syncEditorContent()
            updateFormatState()
            return
          }
        }
      }
    }

    document.execCommand('formatBlock', false, tag)
    // Reset italic if it was not explicitly on
    if (document.queryCommandState('italic') && !formatState.italic) {
      document.execCommand('italic', false)
    }
    syncEditorContent()
    updateFormatState()
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
        html += `<td style="border:1px solid var(--color-border,#cbd5e1);padding:6px 10px;min-width:60px" contenteditable="true">&nbsp;</td>`
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
    // Block-Wrapper: float:left + clear:both-Nachbar = Text kann oben, rechts, unten fließen; Bild bleibt stabil
    document.execCommand(
      'insertHTML',
      false,
      `<div class="img-wrap" contenteditable="false" draggable="false" style="float:left;margin:8px 16px 8px 0"><img src="${dataUrl}" alt="Zeichnung" draggable="false" style="max-width:100%;width:300px;border-radius:12px;cursor:move;display:block" /></div><p><br></p>`,
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
            : `<img src="${reader.result as string}" alt="${file.name}" style="max-width:100%;width:400px;border-radius:12px;margin:8px 0" />`
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

  /* ── Download ── */

  function handleDownload() {
    if (!note) return
    const text = editorRef.current?.innerText || note.content?.replace(/<[^>]*>/g, '') || ''
    const blob = new Blob([`# ${titleValue}\n\n${text}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titleValue || 'Notiz'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Render ── */

  const layout = useLayoutContext()
  const tbtn =
    'flex h-10 min-w-10 items-center justify-center rounded-xl border px-2.5 text-sm transition-colors'
  const tbtnDefault = 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)] active:bg-[var(--color-border)]'
  const tbtnActive = 'border-blue-500 bg-blue-500 text-white'

  const headerBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors lg:hidden'
  const headerBtnStyle = { color: 'var(--color-sidebar-text-muted)' }

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl" style={{ color: 'var(--color-text-primary)' }}>
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-30 px-3 pb-2 backdrop-blur"
        style={{ paddingTop: '0.5rem', backgroundColor: 'color-mix(in srgb, var(--color-bg-app) 92%, transparent)', borderBottom: '1px solid var(--color-border)' } as CSSProperties}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Mobile: Menu + Refresh in derselben Zeile wie Zurück/Nur Lesen */}
          {layout ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => layout.setSidebarOpen((v) => !v)}
                className={headerBtn}
                style={headerBtnStyle}
                aria-label="Sidebar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <button
                type="button"
                onClick={layout.onRefresh}
                disabled={layout.isRefreshing}
                className={headerBtn}
                style={headerBtnStyle}
                aria-label="Aktualisieren"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4.5 w-4.5 ${layout.isRefreshing ? 'animate-spin' : ''}`}
                >
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={layout.onSearch}
                className={headerBtn}
                style={headerBtnStyle}
                aria-label="Suche"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4.5 w-4.5">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>
          ) : null}
          <Link to={backPath} className="h-11 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-card)]" style={{ color: 'var(--color-text-primary)' }}>
            ← Zurück
          </Link>
          {readOnly ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-amber-400" title="Nur Lesen">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          ) : (
            <p className={`text-xs font-medium transition-opacity duration-300 ${saveIndicator === 'saving' ? 'text-blue-400' : 'text-emerald-600'}`}>
              {saveIndicator === 'saving' ? 'Speichert...' : 'Gespeichert'}
            </p>
          )}
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
                  className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M12 17v5" /><path d="M9 11V4a1 1 0 011-1h4a1 1 0 011 1v7" /><path d="M5 17h14" /><path d="M7 11l1.5 6h7L17 11" />
                  </svg>
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
                      <path d="M15 3h6v6" /><path d="M10 14L21 3" /><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    </svg>
                    Verschieben
                  </button>
                ) : null}
                {/* Download */}
                <button
                  type="button"
                  onClick={() => { handleDownload(); setNoteMenuOpen(false) }}
                  className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Herunterladen
                </button>
                {canDelete ? (
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

          {/* B / I / U / S */}
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('bold')} className={`${tbtn} ${formatState.bold ? tbtnActive : tbtnDefault} font-bold`} aria-label="Fett">B</button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('italic')} className={`${tbtn} ${formatState.italic ? tbtnActive : tbtnDefault} italic`} aria-label="Kursiv">I</button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('underline')} className={`${tbtn} ${formatState.underline ? tbtnActive : tbtnDefault} underline`} aria-label="Unterstrichen">U</button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('strikeThrough')} className={`${tbtn} ${formatState.strikeThrough ? tbtnActive : tbtnDefault} line-through`} aria-label="Durchgestrichen">S</button>

          <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

          {/* Font Color */}
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'fontcolor' ? 'none' : 'fontcolor'))} className={`${tbtn} ${activePanel === 'fontcolor' ? tbtnActive : tbtnDefault}`} aria-label="Schriftfarbe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M4 20h16" /><path d="M9.5 4h5l4.5 12h-2l-1.2-3H8.2L7 16H5L9.5 4z" /></svg>
          </button>

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

          <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

          {/* Download (in toolbar) */}
          <button type="button" onClick={handleDownload} className={`${tbtn} ${tbtnDefault}`} aria-label="Herunterladen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>

          {/* Aufgabe (in toolbar) */}
          <button
            type="button"
            onMouseDown={keepEditorFocus}
            onTouchStart={keepEditorFocus}
            onClick={() => {
              editorRef.current?.focus()
              document.execCommand(
                'insertHTML',
                false,
                '<div style="display:flex;align-items:flex-start;gap:6px;margin:4px 0"><input type="checkbox" style="margin-top:4px;width:16px;height:16px;accent-color:#3b82f6" /><span>Aufgabe</span></div><p><br></p>',
              )
              syncEditorContent()
            }}
            className={`${tbtn} ${tbtnDefault}`}
            aria-label="Aufgabe"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
          </button>
        </div>

        {/* ── Font color sub-panel ── */}
        {activePanel === 'fontcolor' ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            {FONT_COLORS.map((c) => (
              <button
                key={c.value || 'default'}
                type="button"
                onMouseDown={keepEditorFocus}
                onClick={() => {
                  if (c.value) {
                    runCommand('foreColor', c.value)
                  } else {
                    // Reset to default text color – use a computed color
                    // We use removeFormat only for color by wrapping in a workaround:
                    // First set a known color, then remove the font element
                    const editor = editorRef.current
                    if (editor) {
                      editor.focus()
                      // Get the computed default text color
                      const defaultColor = getComputedStyle(editor).color
                      document.execCommand('foreColor', false, defaultColor)
                      syncEditorContent()
                      updateFormatState()
                    }
                  }
                  setActivePanel('none')
                }}
                className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}
              >
                <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: c.value || 'var(--color-text-primary)', borderColor: 'var(--color-border)' }} />
                {c.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* ── Format sub-panel ── */}
        {activePanel === 'format' ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runFormatBlock('<h1>')} className={`${tbtn} ${formatState.block === 'h1' ? tbtnActive : tbtnDefault} text-xs`}>H1</button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runFormatBlock('<h2>')} className={`${tbtn} ${formatState.block === 'h2' ? tbtnActive : tbtnDefault} text-xs`}>H2</button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runFormatBlock('<h3>')} className={`${tbtn} ${formatState.block === 'h3' ? tbtnActive : tbtnDefault} text-xs`}>H3</button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runFormatBlock('<p>')} className={`${tbtn} ${formatState.block === 'p' && formatState.list === '' ? tbtnActive : tbtnDefault} text-xs`}>Text</button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runFormatBlock('<blockquote>')} className={`${tbtn} ${formatState.block === 'blockquote' ? tbtnActive : tbtnDefault} text-xs`}>Zitat</button>
            <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('insertUnorderedList')} className={`${tbtn} ${formatState.list === 'ul' ? tbtnActive : tbtnDefault}`} aria-label="Aufzählung">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>
            </button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('insertOrderedList')} className={`${tbtn} ${formatState.list === 'ol' ? tbtnActive : tbtnDefault}`} aria-label="Nummerierung">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="2" y="7" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">1</text><text x="2" y="13" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">2</text><text x="2" y="19" fontSize="7" fill="currentColor" stroke="none" fontFamily="system-ui">3</text></svg>
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
            <button type="button" onClick={() => setActivePanel('table')} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
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
            <button type="button" onClick={() => setActivePanel('symbols')} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Symbole
            </button>
          </div>
        ) : null}

        {/* ── Symbols sub-panel ── */}
        {activePanel === 'symbols' ? (
          <div className="mt-1.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Symbol einfügen</p>
              <button type="button" onClick={() => setActivePanel('insert')} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>← Zurück</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SELECTABLE_ICONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    editorRef.current?.focus()
                    // Emoji-basiert: schnell, sauber, und überall unterstützt
                    const emojiMap: Record<string, string> = {
                      folder: '📁', bulb: '💡', megaphone: '📢', palette: '🎨',
                      gear: '⚙️', chart: '📊', star: '⭐', heart: '❤️',
                      chat: '💬', calendar: '📅', book: '📖', code: '💻',
                      globe: '🌍', camera: '📷', music: '🎵', plane: '✈️',
                      car: '🚗', thought: '💭', alert: '⚠️', pill: '💊',
                      bolt: '⚡', clock: '🕐', pencil: '✏️', key: '🔑',
                      users: '👥', check: '✅', euro: '💶', phone: '📞', mail: '📧',
                    }
                    const emoji = emojiMap[item.id] || item.label
                    document.execCommand('insertText', false, emoji)
                    syncEditorContent()
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <FolderIcon icon={item.id} className="h-4.5 w-4.5 stroke-slate-600 dark:stroke-slate-300" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Table size dialog ── */}
        {activePanel === 'table' ? (
          <div className="mt-1.5 flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Tabelle einfügen</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Zeilen
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, Number(e.target.value)))}
                  className="h-9 w-16 rounded-lg border px-2 text-center text-sm focus:border-blue-400 focus:outline-none"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                />
              </label>
              <span style={{ color: 'var(--color-text-muted)' }}>×</span>
              <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                Spalten
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, Number(e.target.value)))}
                  className="h-9 w-16 rounded-lg border px-2 text-center text-sm focus:border-blue-400 focus:outline-none"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => insertTable(tableRows, tableCols)} className="h-9 rounded-xl bg-blue-500 px-4 text-sm font-medium text-white active:bg-blue-600">
                Einfügen
              </button>
              <button type="button" onClick={() => setActivePanel('insert')} className="h-9 rounded-xl border px-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                Zurück
              </button>
            </div>
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
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-bg-app)' }}>
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => { setIsDrawing(false); setActivePanel('none') }} className="rounded-xl px-3 py-2 text-sm transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
              Abbrechen
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Zeichnen</span>
            <button type="button" onClick={insertDrawing} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white active:bg-blue-600">
              Einfügen
            </button>
          </div>
          <div className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDrawColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${drawColor === c ? 'ring-2 ring-blue-300' : 'border-transparent'}`}
                style={{ backgroundColor: c, borderColor: drawColor === c ? 'var(--color-text-primary)' : 'transparent' }}
              />
            ))}
            <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <input type="range" min={1} max={12} value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} className="w-24 accent-blue-500" />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{drawSize}px</span>
          </div>
          <canvas
            ref={canvasRef}
            className="flex-1 touch-none bg-white"
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
          <div
            ref={setEditorNode}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onBlur={readOnly ? undefined : syncEditorContent}
            onInput={readOnly ? undefined : syncEditorContent}
            onKeyDown={readOnly ? undefined : handleEditorKeyDown}
            onFocus={readOnly ? undefined : () => updateFormatState()}
            className={`note-editor min-h-[40vh] lg:min-h-[55vh] w-full rounded-2xl border p-4 text-base leading-7 outline-none ${readOnly ? 'cursor-default' : ''}`}
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </section>
    </div>
  )
}
