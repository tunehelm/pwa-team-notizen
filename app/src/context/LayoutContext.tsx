import { createContext, useContext, type ReactNode } from 'react'

export interface LayoutContextValue {
  setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  onRefresh: () => void
  isRefreshing: boolean
  /** Öffnet Suche – auf Desktop: Suchfeld im Header, auf Mobile: Navigation zu /search */
  onSearch: () => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function LayoutProvider({
  value,
  children,
}: {
  value: LayoutContextValue
  children: ReactNode
}) {
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayoutContext(): LayoutContextValue | null {
  return useContext(LayoutContext)
}
