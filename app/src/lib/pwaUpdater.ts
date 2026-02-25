type UpdateSW = (reloadPage?: boolean) => Promise<void>

export type PwaUpdateState = {
  needRefresh: boolean
  offlineReady: boolean
  updating: boolean
}

const state: PwaUpdateState = {
  needRefresh: false,
  offlineReady: false,
  updating: false,
}

let updateSW: UpdateSW | null = null
const listeners = new Set<(next: PwaUpdateState) => void>()

function emit(): void {
  const snapshot: PwaUpdateState = { ...state }
  listeners.forEach((listener) => listener(snapshot))
}

export function bindPwaUpdateSW(fn: UpdateSW): void {
  updateSW = fn
}

export function notifyNeedRefresh(): void {
  state.needRefresh = true
  emit()
}

export function notifyOfflineReady(): void {
  state.offlineReady = true
  emit()
}

export function clearOfflineReady(): void {
  state.offlineReady = false
  emit()
}

export function subscribePwaUpdate(listener: (next: PwaUpdateState) => void): () => void {
  listeners.add(listener)
  listener({ ...state })
  return () => {
    listeners.delete(listener)
  }
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateSW || state.updating) return
  state.updating = true
  emit()
  try {
    await updateSW(true)
  } finally {
    state.updating = false
    emit()
  }
}
