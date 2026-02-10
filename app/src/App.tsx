import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { FolderPage } from './pages/FolderPage'
import { NotePage } from './pages/NotePage'
import { AppDataProvider } from './state/AppDataContext'

function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/folder/:id" element={<FolderPage />} />
          <Route path="/note/:id" element={<NotePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  )
}

export default App
