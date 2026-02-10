import { useContext } from 'react'
import { AppDataContext } from './appDataStore'

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error('useAppData muss innerhalb von AppDataProvider verwendet werden.')
  }

  return context
}
