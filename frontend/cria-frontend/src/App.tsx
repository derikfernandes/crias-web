import { Navigate, Route, Routes } from 'react-router-dom'
import { getSession } from './lib/session'
import ChatLayout from './layouts/ChatLayout'
import LoginPage from './pages/LoginPage'
import TrailsPage from './pages/TrailsPage'
import PlayerPage from './pages/PlayerPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <ChatLayout />
            </RequireAuth>
          }
        >
          <Route index element={<TrailsPage />} />
          <Route path="trilha/:trailId" element={<PlayerPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
