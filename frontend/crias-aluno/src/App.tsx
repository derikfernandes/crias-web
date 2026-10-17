import PainelPage from './pages/PainelPage'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getSession } from './lib/session'
import { useOverflowFade } from './lib/useOverflowFade'
import ChatLayout from './layouts/ChatLayout'
import LoginPage from './pages/LoginPage'
import TrailsPage from './pages/TrailsPage'
import PlayerPage from './pages/PlayerPage'
import MonitoriaPage from './pages/MonitoriaPage'

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
  useOverflowFade()
  return (
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
        <Route path="painel" element={<PainelPage />} />
        <Route path="monitoria" element={<MonitoriaPage />} />
        {/* Maria foi aposentada: o tutor se chama monitor. Links antigos continuam funcionando. */}
        <Route path="maria" element={<Navigate to="/monitoria" replace />} />
        <Route path="trilha/:trailId" element={<PlayerPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
