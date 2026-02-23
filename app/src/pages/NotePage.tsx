import {
  type CSSProperties,
  type ClipboardEvent as ReactClipboardEvent,
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

import { createRoot } from 'react-dom/client'
import { isAdminEmail } from '../lib/admin'
import { SELECTABLE_ICONS, FolderIcon } from '../components/FolderIcons'
import { uploadMedia, dataUrlToBlob } from '../lib/storage'
import { sanitizeHtmlTable } from '../lib/sanitizeTable'
import { CALCULATORS, CALCULATOR_TYPES, type CalculatorType } from '../components/calculators/registry'

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
          if (!note || !canDelete) return
          void moveNoteToTrash(note.id).then(() => navigate(backPath)).catch(() => {/* Fehler wird im AppDataContext angezeigt */})
        }}
        onMoveNote={canDelete ? () => setShowMoveModal(true) : undefined}
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

/* ── Draft Autosave (localStorage, survives reload) ── */
const DRAFT_KEY_PREFIX = 'pwa_notes_draft:'

type Draft = { title: string; content: string; updatedAt: number }

function getDraftKey(noteId: string): string {
  return `${DRAFT_KEY_PREFIX}${noteId}`
}

function loadDraft(noteId: string): Draft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(noteId))
    if (!raw) return null
    const data = JSON.parse(raw) as Draft
    if (typeof data.title !== 'string' || typeof data.content !== 'string' || typeof data.updatedAt !== 'number') return null
    return data
  } catch {
    return null
  }
}

function saveDraft(noteId: string, draft: Draft): void {
  try {
    localStorage.setItem(getDraftKey(noteId), JSON.stringify(draft))
  } catch {
    // ignore quota / private mode
  }
}

function clearDraft(noteId: string): void {
  try {
    localStorage.removeItem(getDraftKey(noteId))
  } catch {
    // ignore
  }
}

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

type ToolbarPanel = 'none' | 'format' | 'insert' | 'link' | 'draw' | 'table' | 'fontcolor' | 'symbols' | 'calculator'

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
  const [draftRestored, setDraftRestored] = useState(false)
  const [editorMounted, setEditorMounted] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const latestTitleRef = useRef(note?.title ?? 'Neue Notiz')
  const initAppliedForNoteIdRef = useRef<string | null>(null)
  /** Inhalt, den wir zuletzt aus Server/Draft in den Editor geschrieben haben – damit wir bei Refresh (neues note.content) nachziehen. */
  const lastAppliedContentRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    latestTitleRef.current = titleValue
  }, [titleValue])
  const noteMenuRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isNoteMenuOpen, setNoteMenuOpen] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving'>('saved')
  const [activePanel, setActivePanel] = useState<ToolbarPanel>('none')
  const [tableSelected, setTableSelected] = useState(false)
  const selectedTableRef = useRef<HTMLTableElement | null>(null)
  const selectedCellRef = useRef<HTMLTableCellElement | null>(null)
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false, strikeThrough: false, block: 'p' as string, list: '' as string })

  // Link-Dialog state
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  /** Gespeicherte Cursor-Position für Link-Einfügen (geht verloren wenn User ins URL-Feld tippt). */
  const savedLinkSelectionRef = useRef<Range | null>(null)

  // Table dialog state
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#1e293b')
  const [drawSize, setDrawSize] = useState(3)
  const [isEraser, setIsEraser] = useState(false)
  const drawingRef = useRef(false)
  const drawHistoryRef = useRef<ImageData[]>([])

  // Active font color tracking
  const [activeFontColor, setActiveFontColor] = useState('')

  const setEditorNode = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node
    setEditorMounted(!!node)
  }, [])

  /** Entfernt einen Smart-Block aus dem Editor und speichert. Optional: folgendes leeres <p><br></p> mit entfernen. */
  function removeSmartBlock(el: HTMLElement) {
    const editor = editorRef.current
    if (!editor || !editor.contains(el)) return
    const next = el.nextElementSibling
    if (next?.tagName === 'P') {
      const text = next.textContent?.replace(/\s/g, '') ?? ''
      const brOnly = next.innerHTML === '<br>' || next.innerHTML === '<br/>' || (text === '' && next.querySelector('br'))
      if (brOnly) next.remove()
    }
    el.remove()
    editor.focus()
    syncEditorContent()
  }

  /** Dupliziert einen Calculator-Block (gleicher type + config) direkt darunter und mountet neu. */
  function duplicateSmartBlock(el: HTMLElement) {
    const editor = editorRef.current
    if (!editor || !editor.contains(el)) return
    const type = (el.getAttribute('data-calculator-type') as CalculatorType) || 'dantrolene'
    const configRaw = el.getAttribute('data-config') ?? '{}'
    const version = el.getAttribute('data-version') ?? '1'
    const clone = document.createElement('div')
    clone.setAttribute('data-smart-block', 'calculator')
    clone.setAttribute('data-calculator-type', type)
    clone.setAttribute('data-version', version)
    clone.setAttribute('data-config', configRaw)
    clone.setAttribute('contenteditable', 'false')
    el.insertAdjacentElement('afterend', clone)
    const br = document.createElement('p')
    br.innerHTML = '<br>'
    clone.insertAdjacentElement('afterend', br)
    syncEditorContent()
    mountSmartBlocks(editor)
    editor.focus()
  }

  /** Aktualisiert die gespeicherte Config eines Blocks und speichert. */
  function updateSmartBlockConfig(el: HTMLElement, nextConfig: Record<string, unknown>) {
    const editor = editorRef.current
    if (!editor || !editor.contains(el)) return
    el.setAttribute('data-config', JSON.stringify(nextConfig))
    syncEditorContent()
  }

  /** Migriert alte NA/Catecholamin-Blöcke zu noradrenaline-perfusor und setzt data-* für Persistenz. */
  function migrateCalculatorConfig(
    rawType: string | null,
    config: Record<string, unknown>,
    el: HTMLElement,
  ): { type: CalculatorType; config: Record<string, unknown> } {
    if (rawType === 'noradrenaline' || rawType === 'catecholamine') {
      const mgTotal = Number(config.mgTotal ?? config.mgInSyringe ?? 5)
      const mlTotal = Number(config.mlTotal ?? 50)
      const migrated = {
        label: 'Noradrenalin Perfusor',
        mgTotal: Number.isFinite(mgTotal) && mgTotal > 0 ? mgTotal : 5,
        mlTotal: Number.isFinite(mlTotal) && mlTotal > 0 ? mlTotal : 50,
        defaultRateMlH: 5,
        defaultWeightKg: 70,
      }
      el.setAttribute('data-calculator-type', 'noradrenaline-perfusor')
      el.setAttribute('data-config', JSON.stringify(migrated))
      return { type: 'noradrenaline-perfusor', config: migrated }
    }
    const type = (rawType as CalculatorType) || 'dantrolene'
    return { type, config }
  }

  /** Mounts Smart Blocks ([data-smart-block="calculator"]) aus Registry. Fallback: kaputter JSON → Block ignorieren. */
  function mountSmartBlocks(container: HTMLElement) {
    const blocks = container.querySelectorAll<HTMLElement>('[data-smart-block="calculator"]')
    blocks.forEach((el) => {
      el.setAttribute('contenteditable', 'false')
      const rawType = el.getAttribute('data-calculator-type')
      let config: Record<string, unknown> = {}
      try {
        const raw = el.getAttribute('data-config')
        if (raw) config = JSON.parse(raw) as Record<string, unknown>
      } catch {
        return
      }
      const { type, config: resolvedConfig } = migrateCalculatorConfig(rawType, config, el)
      const def = CALCULATORS[type]
      if (!def) return
      const { Component } = def
      const root = (el as unknown as { __smartBlockRoot?: ReturnType<typeof createRoot> }).__smartBlockRoot
      const component = (
        <Component
          config={resolvedConfig}
          onRemove={() => removeSmartBlock(el)}
          onDuplicate={() => duplicateSmartBlock(el)}
          onUpdateConfig={(next) => updateSmartBlockConfig(el, next)}
        />
      )
      if (root) {
        root.render(component)
      } else {
        const r = createRoot(el)
        ;(el as unknown as { __smartBlockRoot?: ReturnType<typeof createRoot> }).__smartBlockRoot = r
        r.render(component)
      }
    })
  }

  // Apply draft or server content when editor is mounted; after Refresh (note.content from server changes) always show server content
  useEffect(() => {
    if (!note?.id || !editorRef.current || !editorMounted) return

    const serverContent = note.content ?? ''

    // Server hat neuen Inhalt geliefert (z. B. nach Refresh) → immer Server anzeigen, Draft verwerfen
    if (initAppliedForNoteIdRef.current === note.id && lastAppliedContentRef.current !== serverContent) {
      clearDraft(note.id)
      editorRef.current.innerHTML = serverContent
      latestContentRef.current = serverContent
      lastAppliedContentRef.current = serverContent
      const mountId = window.setTimeout(() => { const ed = editorRef.current; if (ed) mountSmartBlocks(ed) }, 0)
      return () => window.clearTimeout(mountId)
    }

    if (initAppliedForNoteIdRef.current === note.id) return

    initAppliedForNoteIdRef.current = note.id
    const draft = loadDraft(note.id)

    // Draft nur anzeigen wenn er neuer als der Server-Stand ist (anderes Gerät könnte neueren Stand haben)
    const serverUpdatedAt = note.updatedAt ?? 0
    const draftIsNewer = draft && (serverUpdatedAt === 0 || draft.updatedAt > serverUpdatedAt)

    if (draftIsNewer) {
      editorRef.current.innerHTML = draft.content
      setTitleValue(draft.title)
      latestTitleRef.current = draft.title
      latestContentRef.current = draft.content
      lastAppliedContentRef.current = draft.content
      setDraftRestored(true)
      const t = window.setTimeout(() => setDraftRestored(false), 4000)
      const mountId = window.setTimeout(() => { const ed = editorRef.current; if (ed) mountSmartBlocks(ed) }, 0)
      return () => {
        window.clearTimeout(t)
        window.clearTimeout(mountId)
      }
    }

    if (draft && !draftIsNewer) {
      // Server ist neuer (andere Person hat auf einem anderen Gerät gespeichert) → Draft verwerfen
      clearDraft(note.id)
    }

    editorRef.current.innerHTML = serverContent
    latestContentRef.current = serverContent
    lastAppliedContentRef.current = serverContent
    clearDraft(note.id)
    const mountId = window.setTimeout(() => { const ed = editorRef.current; if (ed) mountSmartBlocks(ed) }, 0)
    return () => window.clearTimeout(mountId)
  }, [note?.id, note?.content, editorMounted])

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
        // Detect inline heading styles (span with font-size)
        if (tag === 'span' && node.style.fontSize) {
          const fs = parseFloat(node.style.fontSize)
          if (fs >= 1.9) blockTag = 'h1'
          else if (fs >= 1.4) blockTag = 'h2'
          else if (fs >= 1.1) blockTag = 'h3'
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
      if (note?.id && !readOnly) {
        saveDraft(note.id, {
          title: latestTitleRef.current,
          content: html,
          updatedAt: Date.now(),
        })
      }
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = window.setTimeout(() => setSaveIndicator('saved'), 900)
    },
    [originalOnContentChange, note?.id, readOnly],
  )

  // Flush pending content on unmount (before navigation)
  useEffect(() => {
    return () => {
      if (hasPendingChangeRef.current) {
        originalOnContentChange(latestContentRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // beforeunload: persist current state to draft so reload doesn't lose data
  useEffect(() => {
    if (!note?.id || readOnly) return
    const handler = () => {
      const content = editorRef.current?.innerHTML ?? latestContentRef.current
      saveDraft(note.id, {
        title: latestTitleRef.current,
        content,
        updatedAt: Date.now(),
      })
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [note?.id, readOnly])

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
      positionDeleteBtn()
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
      if (deleteBtn) {
        deleteBtn.remove()
        deleteBtn = null
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

    let deleteBtn: HTMLButtonElement | null = null

    function positionDeleteBtn() {
      if (!selectedImg || !deleteBtn || !editor) return
      const editorRect = editor.getBoundingClientRect()
      const imgRect = selectedImg.getBoundingClientRect()
      deleteBtn.style.left = `${imgRect.right - editorRect.left - 28 + editor.scrollLeft}px`
      deleteBtn.style.top = `${imgRect.top - editorRect.top + 4 + editor.scrollTop}px`
    }

    function deleteSelectedImage() {
      if (!selectedImg) return
      const wrap = selectedImg.closest('.img-wrap')
      if (wrap) {
        wrap.remove()
      } else {
        selectedImg.remove()
      }
      removeHandle()
      syncEditorContent()
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

      // Löschen-Button
      deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className = 'img-delete-btn'
      deleteBtn.innerHTML = '✕'
      deleteBtn.title = 'Bild löschen'
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        deleteSelectedImage()
      })
      editor!.appendChild(deleteBtn)
      positionDeleteBtn()

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
      // Link-Klick: Ctrl+Klick (Windows) oder Cmd+Klick (Mac) öffnet Link in neuem Tab
      const anchor = (target instanceof HTMLAnchorElement ? target : target.closest('a')) as HTMLAnchorElement | null
      if (anchor && editor!.contains(anchor) && anchor.href) {
        e.preventDefault()
        window.open(anchor.href, '_blank', 'noopener,noreferrer')
        return
      }
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

    // Delete/Backspace löscht selektiertes Bild
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedImg && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        deleteSelectedImage()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

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
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleOutsideClick)
      removeHandle()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Table selection + column resize handles ── */
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    let overlay: HTMLDivElement | null = null
    let resizeColIndex = -1
    let resizeStartX = 0
    let resizeStartWidths: number[] = []

    function clearTableSelection() {
      const tbl = selectedTableRef.current
      const cell = selectedCellRef.current
      if (tbl) {
        tbl.classList.remove('table-selected')
        tbl.querySelectorAll('.cell-selected').forEach((el) => el.classList.remove('cell-selected'))
      }
      if (cell) cell.classList.remove('cell-selected')
      selectedTableRef.current = null
      selectedCellRef.current = null
      setTableSelected(false)
      if (overlay) {
        overlay.remove()
        overlay = null
      }
    }

    function getColumnCount(table: HTMLTableElement): number {
      const firstRow = table.querySelector('tr')
      if (!firstRow) return 0
      return firstRow.querySelectorAll('th, td').length
    }

    function getCellsInColumn(table: HTMLTableElement, colIndex: number): HTMLTableCellElement[] {
      const cells: HTMLTableCellElement[] = []
      table.querySelectorAll('tr').forEach((tr) => {
        const cell = tr.querySelectorAll('th, td')[colIndex] as HTMLTableCellElement | undefined
        if (cell) cells.push(cell)
      })
      return cells
    }

    function positionHandles() {
      const table = selectedTableRef.current
      if (!table || !overlay || !editor) return
      const colCount = getColumnCount(table)
      const firstRow = table.querySelector('tr')
      if (!firstRow) return
      const editorRect = editor.getBoundingClientRect()
      const rowCells = firstRow.querySelectorAll('th, td')
      overlay.innerHTML = ''
      for (let c = 0; c < colCount; c++) {
        const cell = rowCells[c] as HTMLTableCellElement
        if (!cell) continue
        const cellRect = cell.getBoundingClientRect()
        const handle = document.createElement('div')
        handle.className = 'table-col-resize-handle'
        handle.setAttribute('data-col', String(c))
        handle.style.left = `${cellRect.right - editorRect.left - 4 + editor.scrollLeft}px`
        handle.style.top = `${cellRect.top - editorRect.top + editor.scrollTop}px`
        handle.style.height = `${cellRect.height}px`
        handle.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          resizeColIndex = c
          resizeStartX = e.clientX
          resizeStartWidths = Array.from({ length: colCount }, (_, i) => {
            const cells = getCellsInColumn(table, i)
            const w = cells[0]?.offsetWidth ?? 80
            return w
          })
          document.addEventListener('pointermove', onResizeMove)
          document.addEventListener('pointerup', onResizeEnd)
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        })
        overlay.appendChild(handle)
      }
    }

    function onResizeMove(e: PointerEvent) {
      if (resizeColIndex < 0 || !selectedTableRef.current) return
      e.preventDefault()
      const table = selectedTableRef.current
      const dx = e.clientX - resizeStartX
      const newW = Math.max(30, (resizeStartWidths[resizeColIndex] ?? 80) + dx)
      const cells = getCellsInColumn(table, resizeColIndex)
      cells.forEach((cell) => {
        cell.style.width = `${newW}px`
        cell.style.minWidth = `${newW}px`
      })
      positionHandles()
    }

    function onResizeEnd() {
      document.removeEventListener('pointermove', onResizeMove)
      document.removeEventListener('pointerup', onResizeEnd)
      resizeColIndex = -1
      syncEditorContent()
      positionHandles()
    }

    function selectTableAndCell(tableEl: HTMLTableElement, cellEl: HTMLTableCellElement | null) {
      clearTableSelection()
      selectedTableRef.current = tableEl
      selectedCellRef.current = cellEl
      tableEl.classList.add('table-selected')
      if (cellEl) cellEl.classList.add('cell-selected')
      setTableSelected(true)
      editor!.style.position = 'relative'
      overlay = document.createElement('div')
      overlay.className = 'table-resize-overlay'
      editor!.appendChild(overlay)
      positionHandles()
      if (cellEl) {
        editor!.focus()
        const sel = document.getSelection()
        if (sel) {
          const range = document.createRange()
          range.selectNodeContents(cellEl)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }

    function handleTablePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement
      if (!editor!.contains(target)) return
      const cell = target.closest('td, th') as HTMLTableCellElement | null
      const table = target.closest('table') as HTMLTableElement | null
      if (table && editor!.contains(table)) {
        e.preventDefault()
        selectTableAndCell(table, cell ?? table.querySelector('td, th') as HTMLTableCellElement | null)
      } else if (target !== overlay && !overlay?.contains(target)) {
        const onHandle = (target as HTMLElement).closest?.('.table-col-resize-handle')
        if (!onHandle) clearTableSelection()
      }
    }

    function handleOutsideTableClick(e: Event) {
      const target = e.target as Node
      if (editor!.contains(target)) return
      if (overlay?.contains(target)) return
      clearTableSelection()
    }

    editor.addEventListener('pointerdown', handleTablePointerDown)
    document.addEventListener('click', handleOutsideTableClick)

    return () => {
      editor.removeEventListener('pointerdown', handleTablePointerDown)
      document.removeEventListener('click', handleOutsideTableClick)
      clearTableSelection()
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
          if (text.trim() === '') {
            event.preventDefault()
            document.execCommand('formatBlock', false, '<p>')
            syncEditorContent()
            return
          }
        }
      }
      // Nach Enter: Heading-Inline-Styles auf der neuen Zeile neutralisieren → "Text" wird Standard
      if (!event.shiftKey) {
        window.setTimeout(() => {
          if (!editorRef.current) return
          const s = document.getSelection()
          if (!s || !s.anchorNode) return

          // Prüfe ob der Cursor in einem Heading-Span liegt
          let headingSpan: HTMLSpanElement | null = null
          let el = s.anchorNode instanceof HTMLElement ? s.anchorNode : s.anchorNode.parentElement
          while (el && el !== editorRef.current) {
            if (el instanceof HTMLSpanElement && el.style.fontSize) {
              headingSpan = el
              break
            }
            el = el.parentElement
          }

          if (headingSpan) {
            const content = headingSpan.textContent || ''
            if (content.replace(/[\u200B\s]/g, '') === '') {
              // Leerer Span auf neuer Zeile → Heading-Styles entfernen
              headingSpan.style.fontSize = ''
              headingSpan.style.fontWeight = ''
            } else {
              // Cursor steckt noch im alten Heading-Span → Cursor NACH den Span setzen
              // (kein \u200B einfügen – das verursacht Cursor-Verwirrung und unlesbaren Text)
              const nr = document.createRange()
              nr.setStartAfter(headingSpan)
              nr.collapse(true)
              s.removeAllRanges()
              s.addRange(nr)
            }
          }

          syncEditorContent()
          updateFormatState()
        }, 0)
      }
    }
  }

  function parseMarkdownTableRow(row: string): string[] | null {
    if (!row.includes('|')) return null
    let normalized = row.trim()
    if (normalized.startsWith('|')) normalized = normalized.slice(1)
    if (normalized.endsWith('|')) normalized = normalized.slice(0, -1)
    const cells = normalized.split('|').map((cell) => cell.trim())
    return cells.length >= 2 ? cells : null
  }

  function escapeHtml(text: string) {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function isSeparatorRow(cells: string[]): boolean {
    return cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  }

  /** Finds 0..n markdown table blocks in pasted text. Each block = header + separator + 0..n body rows. */
  function findMarkdownTableBlocks(text: string): { startLine: number; endLine: number; lines: string[] }[] {
    const allLines = text.split(/\r?\n/)
    const blocks: { startLine: number; endLine: number; lines: string[] }[] = []
    let i = 0

    while (i < allLines.length) {
      while (i < allLines.length && allLines[i].trim() === '') i++
      if (i >= allLines.length) break

      const headerCells = parseMarkdownTableRow(allLines[i].trim())
      if (!headerCells || headerCells.length < 2) {
        i++
        continue
      }
      if (i + 1 >= allLines.length) {
        i++
        continue
      }

      const sepTrimmed = allLines[i + 1].trim()
      const sepCells = parseMarkdownTableRow(sepTrimmed)
      if (!sepCells || sepCells.length !== headerCells.length || !isSeparatorRow(sepCells)) {
        i++
        continue
      }

      const startLine = i
      const blockLines: string[] = [allLines[i].trim(), allLines[i + 1].trim()]
      let j = i + 2

      while (j < allLines.length) {
        const trimmed = allLines[j].trim()
        if (trimmed === '') break
        const row = parseMarkdownTableRow(trimmed)
        if (row === null || row.length !== headerCells.length) break
        blockLines.push(trimmed)
        j++
      }

      blocks.push({ startLine, endLine: j, lines: blockLines })
      i = j
    }

    return blocks
  }

  /** Converts a single table block (header + separator + body lines) to HTML. */
  function markdownTableBlockToHtml(lines: string[]): string {
    if (lines.length < 2) return ''
    const headerCells = parseMarkdownTableRow(lines[0])!
    const colCount = headerCells.length
    const normalize = (cells: string[]) =>
      cells.slice(0, colCount).concat(Array(Math.max(0, colCount - cells.length)).fill(''))

    let html = '<table style="width:100%;border-collapse:collapse;margin:8px 0"><thead><tr>'
    for (const cell of normalize(headerCells)) {
      html += `<th style="border:1px solid var(--color-border,#cbd5e1);padding:6px 10px;text-align:left">${escapeHtml(cell)}</th>`
    }
    html += '</tr></thead><tbody>'
    for (let r = 2; r < lines.length; r++) {
      const row = parseMarkdownTableRow(lines[r])
      if (!row) break
      html += '<tr>'
      for (const cell of normalize(row)) {
        html += `<td style="border:1px solid var(--color-border,#cbd5e1);padding:6px 10px">${escapeHtml(cell)}</td>`
      }
      html += '</tr>'
    }
    html += '</tbody></table><p><br></p>'
    return html
  }

  /** Builds combined HTML from paste: text segments as <p> with <br>, table blocks as <table>. */
  function buildPasteHtml(
    allLines: string[],
    blocks: { startLine: number; endLine: number; lines: string[] }[],
  ): string {
    let result = ''
    let lastEnd = 0

    function appendTextSegment(lineStart: number, lineEnd: number) {
      const segmentLines = allLines.slice(lineStart, lineEnd)
      const paragraph = segmentLines.join('\n').trim()
      if (!paragraph) return
      const paras = paragraph.split(/\n\n+/).filter(Boolean)
      result += paras
        .map((p) => '<p>' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>')
        .join('')
    }

    for (const block of blocks) {
      appendTextSegment(lastEnd, block.startLine)
      result += markdownTableBlockToHtml(block.lines)
      lastEnd = block.endLine
    }
    appendTextSegment(lastEnd, allLines.length)
    return result
  }

  /** Paste Quality Guard: TSV = mind. ein Tab und mind. zwei Zeilen (Excel/Sheets/Numbers). */
  function isTSV(text: string): boolean {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    return lines.length >= 2 && lines.some((l) => l.includes('\t'))
  }

  /** Paste Quality Guard: Markdown-Tabelle = Pipe-Syntax mit Separator-Zeile. */
  function isMarkdownTable(text: string): boolean {
    return findMarkdownTableBlocks(text).length > 0
  }

  /**
   * Paste-Pipeline (Priorität: 1 TSV, 2 Markdown-Tabelle, 3 HTML-Table, 4 normales Paste).
   * Nur bei 1–3: preventDefault + insertHTML. Sonst: Browser-Standard-Paste.
   */
  function handleEditorPaste(event: ReactClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain')

    // STEP 1 — TSV (Primary Path, stabilster Weg für Excel/Sheets/Numbers)
    if (text && isTSV(text)) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      const rows = lines.map((line) => line.split('\t').map((cell) => escapeHtml(cell.trim())))
      const colCount = Math.max(...rows.map((r) => r.length), 1)
      let tsvHtml = '<table style="width:100%;border-collapse:collapse;margin:8px 0"><tbody>'
      for (const row of rows) {
        tsvHtml += '<tr>'
        for (let c = 0; c < colCount; c++) {
          tsvHtml += `<td style="border:1px solid var(--color-border,#cbd5e1);padding:6px 10px">${row[c] ?? ''}</td>`
        }
        tsvHtml += '</tr>'
      }
      tsvHtml += '</tbody></table><p><br></p>'
      event.preventDefault()
      editorRef.current?.focus()
      document.execCommand('insertHTML', false, tsvHtml)
      syncEditorContent()
      return
    }

    // STEP 2 — Markdown-Tabelle (Pipe-Syntax + Separator)
    if (text && isMarkdownTable(text)) {
      const allLines = text.split(/\r?\n/)
      const blocks = findMarkdownTableBlocks(text)
      event.preventDefault()
      editorRef.current?.focus()
      const html = buildPasteHtml(allLines, blocks)
      document.execCommand('insertHTML', false, html || '<p><br></p>')
      syncEditorContent()
      return
    }

    // STEP 3 — HTML-Table (nur wenn echte <table> im Clipboard)
    const htmlData = event.clipboardData.getData('text/html')
    if (htmlData && /<table[\s>]/i.test(htmlData)) {
      const parsed = new DOMParser().parseFromString(htmlData, 'text/html')
      const firstTable = parsed.querySelector('table')
      if (firstTable) {
        const rawTable = firstTable.outerHTML
        const sanitized = sanitizeHtmlTable(rawTable)
        if (sanitized) {
          const tableStyle = 'width:100%;border-collapse:collapse;margin:8px 0'
          const wrapped = sanitized.replace(/<table\s*[^>]*>/i, `<table style="${tableStyle}">`)
          event.preventDefault()
          editorRef.current?.focus()
          document.execCommand('insertHTML', false, wrapped + '<p><br></p>')
          syncEditorContent()
          return
        }
      }
    }

    // STEP 4 — Fallback: kein preventDefault → Browser-Standard-Paste (inkl. normaler Rich-Text / OCR-Text)
  }

  /* ── Heading-Styles: inline font-size (same-line mixing), blockquote: block-level ── */
  function runFormatBlock(tag: string) {
    if (!editorRef.current) return
    editorRef.current.focus()

    // Blockquote → real block-level command
    if (tag === '<blockquote>') {
      document.execCommand('formatBlock', false, tag)
      syncEditorContent()
      updateFormatState()
      return
    }

    const selection = document.getSelection()
    if (!selection || selection.rangeCount === 0) return

    // Inline style definitions for headings
    const headingStyles: Record<string, { fontSize: string; fontWeight: string }> = {
      '<h1>': { fontSize: '2em', fontWeight: '700' },
      '<h2>': { fontSize: '1.5em', fontWeight: '600' },
      '<h3>': { fontSize: '1.17em', fontWeight: '600' },
    }

    // "Text" → reset to normal (remove heading inline styles)
    if (tag === '<p>') {
      if (!selection.isCollapsed) {
        // Selected text → remove format
        document.execCommand('removeFormat')
      } else {
        // No selection → insert reset span so subsequent typing is normal
        const span = document.createElement('span')
        span.style.fontSize = '1em'
        span.style.fontWeight = 'normal'
        span.appendChild(document.createTextNode('\u200B'))
        const range = selection.getRangeAt(0)
        range.insertNode(span)
        if (span.firstChild) {
          const nr = document.createRange()
          nr.setStartAfter(span.firstChild)
          nr.collapse(true)
          selection.removeAllRanges()
          selection.addRange(nr)
        }
      }
      syncEditorContent()
      updateFormatState()
      return
    }

    // H1 / H2 / H3 → inline font-size + font-weight
    const style = headingStyles[tag]
    if (!style) return

    if (selection.isCollapsed) {
      // No selection → insert styled span, subsequent typing inherits it
      const span = document.createElement('span')
      span.style.fontSize = style.fontSize
      span.style.fontWeight = style.fontWeight
      span.appendChild(document.createTextNode('\u200B'))
      const range = selection.getRangeAt(0)
      range.insertNode(span)
      if (span.firstChild) {
        const nr = document.createRange()
        nr.setStartAfter(span.firstChild)
        nr.collapse(true)
        selection.removeAllRanges()
        selection.addRange(nr)
      }
    } else {
      // Text selected → wrap in styled span
      const range = selection.getRangeAt(0)
      const span = document.createElement('span')
      span.style.fontSize = style.fontSize
      span.style.fontWeight = style.fontWeight
      try {
        range.surroundContents(span)
      } catch {
        const fragment = range.extractContents()
        span.appendChild(fragment)
        range.insertNode(span)
      }
      const nr = document.createRange()
      nr.selectNodeContents(span)
      nr.collapse(false)
      selection.removeAllRanges()
      selection.addRange(nr)
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
    // Cursor-Position wiederherstellen (geht verloren wenn User ins URL-Feld getippt hat)
    const savedRange = savedLinkSelectionRef.current
    if (savedRange) {
      const sel = document.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(savedRange)
      }
      savedLinkSelectionRef.current = null
    }
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

  function insertCalculatorBlock(type: CalculatorType) {
    const def = CALCULATORS[type]
    if (!def) return
    const config = JSON.stringify(def.defaultConfig)
    const configAttr = config.replace(/"/g, '&quot;')
    const html = `<div data-smart-block="calculator" data-calculator-type="${type}" data-version="1" contenteditable="false" data-config="${configAttr}"></div><p><br></p>`
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, html)
    syncEditorContent()
    const ed = editorRef.current
    if (ed) mountSmartBlocks(ed)
    setActivePanel('none')
  }

  function tableInsertRowAfter() {
    const table = selectedTableRef.current
    const cell = selectedCellRef.current
    if (!table || !cell) return
    const tr = cell.closest('tr')
    if (!tr) return
    const colCount = tr.querySelectorAll('th, td').length
    const isHeaderRow = tr.querySelector('th') != null
    const tag = isHeaderRow ? 'th' : 'td'
    const newRow = document.createElement('tr')
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement(tag)
      td.style.border = '1px solid var(--color-border,#cbd5e1)'
      td.style.padding = '6px 10px'
      td.appendChild(document.createTextNode('\u00A0'))
      newRow.appendChild(td)
    }
    tr.nextElementSibling ? tr.insertAdjacentElement('afterend', newRow) : tr.parentElement?.appendChild(newRow)
    syncEditorContent()
    selectedCellRef.current = newRow.querySelector('td, th') as HTMLTableCellElement
    editorRef.current?.focus()
    const sel = document.getSelection()
    if (sel && selectedCellRef.current) {
      const range = document.createRange()
      range.selectNodeContents(selectedCellRef.current)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  function tableDeleteRow() {
    const table = selectedTableRef.current
    const cell = selectedCellRef.current
    if (!table || !cell) return
    const tr = cell.closest('tr')
    if (!tr) return
    const rows = table.querySelectorAll('tr')
    if (rows.length <= 1) return
    tr.remove()
    syncEditorContent()
    const nextTr = table.querySelector('tr')
    selectedCellRef.current = nextTr?.querySelector('td, th') as HTMLTableCellElement ?? null
    if (!nextTr) selectedTableRef.current = null
    setTableSelected(!!selectedTableRef.current)
  }

  function tableInsertColAfter() {
    const table = selectedTableRef.current
    const cell = selectedCellRef.current
    if (!table || !cell) return
    const tr = cell.closest('tr')
    if (!tr) return
    const cells = tr.querySelectorAll('th, td')
    const colIndex = Array.from(cells).indexOf(cell)
    if (colIndex < 0) return
    const tag = cell.tagName.toLowerCase()
    table.querySelectorAll('tr').forEach((row) => {
      const newCell = document.createElement(tag)
      newCell.style.border = '1px solid var(--color-border,#cbd5e1)'
      newCell.style.padding = '6px 10px'
      newCell.appendChild(document.createTextNode('\u00A0'))
      const ref = row.querySelectorAll('th, td')[colIndex]
      ref ? ref.insertAdjacentElement('afterend', newCell) : row.appendChild(newCell)
    })
    syncEditorContent()
    const nextCell = tr.querySelectorAll('th, td')[colIndex + 1] as HTMLTableCellElement
    selectedCellRef.current = nextCell ?? (tr.querySelectorAll('th, td')[colIndex] as HTMLTableCellElement)
    editorRef.current?.focus()
    const sel = document.getSelection()
    if (sel && selectedCellRef.current) {
      const range = document.createRange()
      range.selectNodeContents(selectedCellRef.current)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  function tableDeleteCol() {
    const table = selectedTableRef.current
    const cell = selectedCellRef.current
    if (!table || !cell) return
    const tr = cell.closest('tr')
    if (!tr) return
    const cells = tr.querySelectorAll('th, td')
    const colIndex = Array.from(cells).indexOf(cell)
    if (colIndex < 0) return
    const colCount = cells.length
    if (colCount <= 1) return
    table.querySelectorAll('tr').forEach((row) => {
      const cellToRemove = row.querySelectorAll('th, td')[colIndex]
      cellToRemove?.remove()
    })
    syncEditorContent()
    const nextCell = tr.querySelectorAll('th, td')[Math.min(colIndex, tr.querySelectorAll('th, td').length - 1)] as HTMLTableCellElement | undefined
    selectedCellRef.current = nextCell ?? null
    if (!selectedCellRef.current) setTableSelected(false)
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

  function saveDrawState() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    // Limit history to 30 steps
    if (drawHistoryRef.current.length > 30) drawHistoryRef.current.shift()
  }

  function undoDraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const history = drawHistoryRef.current
    if (history.length === 0) {
      // Clear to white if no history
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }
    const prev = history.pop()!
    ctx.putImageData(prev, 0, 0)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    saveDrawState()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    saveDrawState()
    drawingRef.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = drawSize * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = drawColor
      ctx.lineWidth = drawSize
    }
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
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.globalCompositeOperation = 'source-over'
  }

  async function insertDrawing() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    setIsDrawing(false)
    setActivePanel('none')

    try {
      const blob = dataUrlToBlob(dataUrl)
      const url = await uploadMedia(blob, 'drawing.png')
      editorRef.current?.focus()
      document.execCommand(
        'insertHTML',
        false,
        `<div class="img-wrap" contenteditable="false" style="margin:8px 0"><img src="${url}" alt="Zeichnung" style="max-width:100%;width:300px;border-radius:12px;display:block" /></div><p><br></p>`,
      )
      syncEditorContent()
    } catch (err) {
      console.error('[NotePage] Drawing upload failed:', err)
      // Fallback: Base64 direkt einfügen
      editorRef.current?.focus()
      document.execCommand(
        'insertHTML',
        false,
        `<div class="img-wrap" contenteditable="false" style="margin:8px 0"><img src="${dataUrl}" alt="Zeichnung" style="max-width:100%;width:300px;border-radius:12px;display:block" /></div><p><br></p>`,
      )
      syncEditorContent()
    }
  }

  /* ── Foto/Datei-Upload ── */

  function handleFileUpload(accept: string) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return

      void (async () => {
        try {
          const url = await uploadMedia(file, file.name)
          editorRef.current?.focus()

          let html = ''
          if (file.type.startsWith('image/')) {
            html = `<div class="img-wrap" contenteditable="false" style="margin:8px 0"><img src="${url}" alt="${file.name}" style="max-width:100%;width:400px;border-radius:12px;display:block" /></div><p><br></p>`
          } else if (file.type.startsWith('video/')) {
            html = `<video src="${url}" controls style="max-width:100%;border-radius:12px;margin:8px 0"></video><p><br></p>`
          } else if (file.type.startsWith('audio/')) {
            html = `<audio src="${url}" controls style="width:100%;margin:8px 0"></audio><p><br></p>`
          } else {
            html = `<a href="${url}" download="${file.name}" style="color:#3b82f6;text-decoration:underline">📎 ${file.name}</a>&nbsp;`
          }

          document.execCommand('insertHTML', false, html)
          syncEditorContent()
        } catch (err) {
          console.error('[NotePage] File upload failed, using Base64 fallback:', err)
          const reader = new FileReader()
          reader.onload = () => {
            editorRef.current?.focus()
            const dataUrl = reader.result as string
            let html = ''
            if (file.type.startsWith('image/')) {
              html = `<img src="${dataUrl}" alt="${file.name}" style="max-width:100%;width:400px;border-radius:12px;margin:8px 0" /><p><br></p>`
            } else if (file.type.startsWith('video/')) {
              html = `<video src="${dataUrl}" controls style="max-width:100%;border-radius:12px;margin:8px 0"></video><p><br></p>`
            } else if (file.type.startsWith('audio/')) {
              html = `<audio src="${dataUrl}" controls style="width:100%;margin:8px 0"></audio><p><br></p>`
            } else {
              html = `<a href="${dataUrl}" download="${file.name}" style="color:#3b82f6;text-decoration:underline">📎 ${file.name}</a>&nbsp;`
            }
            document.execCommand('insertHTML', false, html)
            syncEditorContent()
          }
          reader.readAsDataURL(file)
        }
      })()
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

        void (async () => {
          try {
            const url = await uploadMedia(blob, 'recording.webm')
            editorRef.current?.focus()
            document.execCommand(
              'insertHTML',
              false,
              `<audio src="${url}" controls style="width:100%;margin:8px 0"></audio><p><br></p>`,
            )
            syncEditorContent()
          } catch (err) {
            console.error('[NotePage] Audio upload failed, using Base64 fallback:', err)
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
        })()
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

  function handleExportBackup() {
    const html = editorRef.current?.innerHTML ?? latestContentRef.current ?? ''
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleValue || 'Notiz'}</title></head><body>${html}</body></html>`
    const blob = new Blob([doc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${titleValue || 'Notiz'}-backup.html`
    a.click()
    URL.revokeObjectURL(url)
  }

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
                onClick={(e) => layout.onRefresh(e.shiftKey)}
                disabled={layout.isRefreshing}
                className={headerBtn}
                style={headerBtnStyle}
                aria-label="Aktualisieren"
                title="Aktualisieren. Shift+Klick: vom Server laden (Cache ignorieren)"
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
            <span title="Nur Lesen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 shrink-0 text-amber-400">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg></span>
          ) : (
            <p className={`text-xs font-medium transition-opacity duration-300 ${saveIndicator === 'saving' ? 'text-blue-400' : 'text-emerald-600'}`}>
              {saveIndicator === 'saving' ? 'Speichert...' : 'Gespeichert'}
            </p>
          )}
          {draftRestored ? (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400" role="status">
              Draft wiederhergestellt
            </p>
          ) : null}
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
                <button
                  type="button"
                  onClick={() => { handleExportBackup(); setNoteMenuOpen(false) }}
                  className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors hover:bg-[var(--color-bg-app)]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Notiz-Backup exportieren
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
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('undo')} className={`${tbtn} ${tbtnDefault}`} aria-label="Undo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H8" /><path d="M7 14l-4-4 4-4" /></svg>
          </button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('redo')} className={`${tbtn} ${tbtnDefault}`} aria-label="Redo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 10H11a5 5 0 00-5 5v0a5 5 0 005 5h5" /><path d="M17 14l4-4-4-4" /></svg>
          </button>
          <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('bold')} className={`${tbtn} ${formatState.bold ? tbtnActive : tbtnDefault} font-bold`} aria-label="Fett">B</button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('italic')} className={`${tbtn} ${formatState.italic ? tbtnActive : tbtnDefault} italic`} aria-label="Kursiv">I</button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('underline')} className={`${tbtn} ${formatState.underline ? tbtnActive : tbtnDefault} underline`} aria-label="Unterstrichen">U</button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => runCommand('strikeThrough')} className={`${tbtn} ${formatState.strikeThrough ? tbtnActive : tbtnDefault} line-through`} aria-label="Durchgestrichen">S</button>
          <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'fontcolor' ? 'none' : 'fontcolor'))} className={`${tbtn} ${activePanel === 'fontcolor' ? tbtnActive : tbtnDefault} relative`} aria-label="Schriftfarbe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M4 20h16" /><path d="M9.5 4h5l4.5 12h-2l-1.2-3H8.2L7 16H5L9.5 4z" /></svg>
            {activeFontColor ? <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full" style={{ backgroundColor: activeFontColor }} /> : null}
          </button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'format' ? 'none' : 'format'))} className={`${tbtn} ${activePanel === 'format' ? tbtnActive : tbtnDefault}`} aria-label="Format">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>
          </button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'insert' ? 'none' : 'insert'))} className={`${tbtn} ${activePanel === 'insert' ? tbtnActive : tbtnDefault}`} aria-label="Einfügen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
          </button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => setActivePanel((p) => (p === 'table' ? 'none' : 'table'))} className={`${tbtn} ${activePanel === 'table' ? tbtnActive : tbtnDefault}`} aria-label="Tabelle einfügen" title="Tabelle einfügen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
          </button>
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => {
            const sel = document.getSelection()
            if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
              savedLinkSelectionRef.current = sel.getRangeAt(0).cloneRange()
            }
            setActivePanel((p) => (p === 'link' ? 'none' : 'link'))
          }} className={`${tbtn} ${activePanel === 'link' ? tbtnActive : tbtnDefault}`} aria-label="Link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
          </button>
          <button type="button" onClick={openDrawing} className={`${tbtn} ${tbtnDefault}`} aria-label="Zeichnen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
          </button>
          <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
          <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => { editorRef.current?.focus(); document.execCommand('insertHTML', false, '<div style="display:flex;align-items:flex-start;gap:6px;margin:4px 0"><input type="checkbox" style="margin-top:4px;width:16px;height:16px;accent-color:#3b82f6" /><span>Aufgabe</span></div><p><br></p>'); syncEditorContent() }} className={`${tbtn} ${tbtnDefault}`} aria-label="Aufgabe">
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
                    setActiveFontColor(c.value)
                  } else {
                    const editor = editorRef.current
                    if (editor) {
                      editor.focus()
                      const defaultColor = getComputedStyle(editor).color
                      document.execCommand('foreColor', false, defaultColor)
                      syncEditorContent()
                      updateFormatState()
                    }
                    setActiveFontColor('')
                  }
                  setActivePanel('none')
                }}
                className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${activeFontColor === c.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-[var(--color-border)] hover:bg-[var(--color-bg-card)]'}`}
                style={{ color: 'var(--color-text-primary)' }}
              >
                <span className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: c.value || 'var(--color-text-primary)', borderColor: activeFontColor === c.value ? '#3b82f6' : 'var(--color-border)' }} />
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
            <button type="button" onClick={() => setActivePanel('calculator')} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`} title="Rechner einfügen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h8M8 14h4" /></svg>
              Rechner
            </button>
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
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={() => { editorRef.current?.focus(); document.execCommand('insertHorizontalRule'); syncEditorContent() }} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>— Linie</button>
            <button type="button" onClick={() => setActivePanel('symbols')} className={`${tbtn} ${tbtnDefault} gap-1.5 text-xs`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Symbole
            </button>
          </div>
        ) : null}

        {/* ── Calculator selector sub-panel ── */}
        {activePanel === 'calculator' ? (
          <div className="mt-1.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Rechner einfügen</p>
              <button type="button" onClick={() => setActivePanel('insert')} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>← Zurück</button>
            </div>
            <div className="flex flex-col gap-1.5">
              {CALCULATOR_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => insertCalculatorBlock(type)}
                  className={`${tbtn} ${tbtnDefault} w-full justify-start gap-2 text-xs`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h8M8 14h4" /></svg>
                  {CALCULATORS[type].title}
                </button>
              ))}
            </div>
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
                <button key={item.id} type="button" title={item.label} onClick={() => { editorRef.current?.focus(); const emojiMap: Record<string, string> = { folder: '📁', bulb: '💡', megaphone: '📢', palette: '🎨', gear: '⚙️', chart: '📊', star: '⭐', heart: '❤️', chat: '💬', calendar: '📅', book: '📖', code: '💻', globe: '🌍', camera: '📷', music: '🎵', plane: '✈️', car: '🚗', thought: '💭', alert: '⚠️', pill: '💊', bolt: '⚡', clock: '🕐', pencil: '✏️', key: '🔑', users: '👥', check: '✅', euro: '💶', phone: '📞', mail: '📧', handshake: '🤝', target: '🎯', trending: '📈', briefcase: '💼', award: '🏆', clipboard: '📋', cart: '🛒', receipt: '🧾', tag: '🏷️', percent: '%', building: '🏢', handshake2: '📃' }; document.execCommand('insertText', false, emojiMap[item.id] || item.label); syncEditorContent() }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                  <FolderIcon icon={item.id} className="h-4.5 w-4.5 stroke-slate-600 dark:stroke-slate-300" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Table edit (when a table is selected) ── */}
        {tableSelected ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="mr-1 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Tabelle:</span>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={tableInsertRowAfter} className={`${tbtn} ${tbtnDefault} gap-1 text-xs`} title="Zeile darunter einfügen" aria-label="Zeile +">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
              Zeile +
            </button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={tableDeleteRow} className={`${tbtn} ${tbtnDefault} gap-1 text-xs`} title="Zeile löschen" aria-label="Zeile –">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M5 12h14" /></svg>
              Zeile –
            </button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={tableInsertColAfter} className={`${tbtn} ${tbtnDefault} gap-1 text-xs`} title="Spalte rechts einfügen" aria-label="Spalte +">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
              Spalte +
            </button>
            <button type="button" onMouseDown={keepEditorFocus} onTouchStart={keepEditorFocus} onClick={tableDeleteCol} className={`${tbtn} ${tbtnDefault} gap-1 text-xs`} title="Spalte löschen" aria-label="Spalte –">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M5 12h14" /></svg>
              Spalte –
            </button>
          </div>
        ) : null}

        {/* ── Table size dialog ── */}
        {activePanel === 'table' ? (
          <div className="mt-1.5 flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Tabelle einfügen</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>Zeilen <input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(Math.max(1, Number(e.target.value)))} className="h-9 w-16 rounded-lg border px-2 text-center text-sm focus:border-blue-400 focus:outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }} /></label>
              <span style={{ color: 'var(--color-text-muted)' }}>×</span>
              <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>Spalten <input type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(Math.max(1, Number(e.target.value)))} className="h-9 w-16 rounded-lg border px-2 text-center text-sm focus:border-blue-400 focus:outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }} /></label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => insertTable(tableRows, tableCols)} className="h-9 rounded-xl bg-blue-500 px-4 text-sm font-medium text-white active:bg-blue-600">Einfügen</button>
              <button type="button" onClick={() => setActivePanel('none')} className="h-9 rounded-xl border px-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>Zurück</button>
            </div>
          </div>
        ) : null}

        {/* ── Link sub-panel ── */}
        {activePanel === 'link' ? (
          <div className="mt-1.5 flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-10 rounded-xl border px-3 text-sm focus:border-blue-400 focus:outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }} />
            <input type="text" placeholder="Angezeigter Name (optional)" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="h-10 rounded-xl border px-3 text-sm focus:border-blue-400 focus:outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }} />
            <div className="flex gap-2">
              <button type="button" onClick={insertLink} className="h-10 rounded-xl bg-blue-500 px-4 text-sm font-medium text-white active:bg-blue-600">Einfügen</button>
              <button type="button" onClick={() => setActivePanel('none')} className="h-10 rounded-xl border px-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>Abbrechen</button>
            </div>
          </div>
        ) : null}
      </header>

      {/* ── Drawing overlay ── */}
      {isDrawing ? (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-bg-app)' }}>
          <div className="flex items-center justify-between px-3 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))', borderBottom: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => { setIsDrawing(false); setActivePanel('none'); setIsEraser(false); drawHistoryRef.current = [] }} className="rounded-xl px-3 py-2 text-sm transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
              Abbrechen
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Zeichnen</span>
            <button type="button" onClick={() => { void insertDrawing(); setIsEraser(false); drawHistoryRef.current = [] }} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white active:bg-blue-600">
              Einfügen
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-none" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setDrawColor(c); setIsEraser(false) }}
                className={`h-8 w-8 shrink-0 rounded-full border-2 ${!isEraser && drawColor === c ? 'ring-2 ring-blue-300' : 'border-transparent'}`}
                style={{ backgroundColor: c, borderColor: !isEraser && drawColor === c ? 'var(--color-text-primary)' : 'transparent' }}
              />
            ))}
            <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
            {/* Radierer */}
            <button type="button" onClick={() => setIsEraser((v) => !v)} className={`flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs ${isEraser ? 'border-blue-500 bg-blue-500 text-white' : 'border-[var(--color-border)]'}`} style={isEraser ? {} : { color: 'var(--color-text-primary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M20 20H7L3 16l9-9 8 8-4 4" /><path d="M6.5 13.5l5-5" /></svg>
            </button>
            {/* Rückgängig */}
            <button type="button" onClick={undoDraw} className="flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H8" /><path d="M7 14l-4-4 4-4" /></svg>
            </button>
            {/* Alles löschen */}
            <button type="button" onClick={clearCanvas} className="flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            </button>
            <div className="h-6 w-px shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />
            <input type="range" min={1} max={12} value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} className="w-20 shrink-0 accent-blue-500" />
            <span className="shrink-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>{drawSize}px</span>
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
            if (note?.id) {
              saveDraft(note.id, {
                title: nextTitle,
                content: latestContentRef.current,
                updatedAt: Date.now(),
              })
            }
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
            onPaste={readOnly ? undefined : handleEditorPaste}
            onFocus={readOnly ? undefined : () => updateFormatState()}
            className={`note-editor min-h-[40vh] lg:min-h-[55vh] w-full overflow-x-hidden rounded-2xl border p-4 text-base leading-7 outline-none ${readOnly ? 'cursor-default' : ''}`}
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
