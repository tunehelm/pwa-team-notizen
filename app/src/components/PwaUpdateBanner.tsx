import { useEffect, useState } from 'react'
import {
  applyPwaUpdate,
  clearOfflineReady,
  subscribePwaUpdate,
  type PwaUpdateState,
} from '../lib/pwaUpdater'

const INITIAL_STATE: PwaUpdateState = {
  needRefresh: false,
  offlineReady: false,
  updating: false,
}

export function PwaUpdateBanner() {
  const [state, setState] = useState<PwaUpdateState>(INITIAL_STATE)
  const [hiddenByUser, setHiddenByUser] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribePwaUpdate((next) => {
      setState(next)
      if (!next.needRefresh) setHiddenByUser(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!state.offlineReady) return
    const timeoutId = window.setTimeout(() => clearOfflineReady(), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [state.offlineReady])

  if (state.needRefresh && !hiddenByUser) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-[120] rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-amber-900">
          Neue Version verfuegbar.
        </p>
        <p className="mt-1 text-xs text-amber-800">
          Mit Aktualisieren wird die App neu geladen.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => { void applyPwaUpdate() }}
            disabled={state.updating}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {state.updating ? 'Aktualisiere...' : 'Jetzt aktualisieren'}
          </button>
          <button
            type="button"
            onClick={() => {
              setHiddenByUser(true)
            }}
            className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            Spaeter
          </button>
        </div>
      </div>
    )
  }

  if (state.offlineReady) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[120] -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 shadow-lg">
        App ist offline bereit.
      </div>
    )
  }

  return null
}
