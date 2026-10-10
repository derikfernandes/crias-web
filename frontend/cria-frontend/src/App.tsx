import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getSession } from './lib/session'
import ChatLayout from './layouts/ChatLayout'
import LoginPage from './pages/LoginPage'
import TrailsPage from './pages/TrailsPage'
import PlayerPage from './pages/PlayerPage'
import MariaPage from './pages/MariaPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getSession()
  const location = useLocation()
  // C2-R10 N01: guarda destino (deep-link) para restaurar após login.
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
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
          <Route path="maria" element={<MariaPage />} />
          <Route path="trilha/:trailId" element={<PlayerPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
