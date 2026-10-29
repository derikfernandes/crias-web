import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AdminLayout } from './layouts/AdminLayout'
import { ProtectedPage, RequireStudentAuth } from './layouts/RouteGuards'
import { LoginPage } from './pages/LoginPage'
import { usePermissions } from './hooks/usePermissions'
import './design/styles/app.css'
import './design/styles/gestao.css'

// Code splitting: cada página vira um chunk próprio, carregado sob demanda.
// Os componentes e o comportamento das páginas permanecem idênticos.
const UsersPage = lazy(() =>
  import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })),
)
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const DocPage = lazy(() =>
  import('./pages/DocPage').then((m) => ({ default: m.DocPage })),
)
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const InstitutionNewPage = lazy(() =>
  import('./pages/InstitutionNewPage').then((m) => ({
    default: m.InstitutionNewPage,
  })),
)
const InstitutionPage = lazy(() =>
  import('./pages/InstitutionPage').then((m) => ({ default: m.InstitutionPage })),
)
const TrailDetailPage = lazy(() =>
  import('./pages/TrailDetailPage').then((m) => ({
    default: m.TrailDetailPage,
  })),
)
const TrailNewPage = lazy(() =>
  import('./pages/TrailNewPage').then((m) => ({ default: m.TrailNewPage })),
)
const StudentDetailPage = lazy(() =>
  import('./pages/StudentDetailPage').then((m) => ({
    default: m.StudentDetailPage,
  })),
)
const StudentNewPage = lazy(() =>
  import('./pages/StudentNewPage').then((m) => ({ default: m.StudentNewPage })),
)
const StudentsListPage = lazy(() =>
  import('./pages/StudentsListPage').then((m) => ({
    default: m.StudentsListPage,
  })),
)
const StudentPasswordsPage = lazy(() =>
  import('./pages/StudentPasswordsPage').then((m) => ({
    default: m.StudentPasswordsPage,
  })),
)
const AiPromptsPage = lazy(() =>
  import('./pages/AiPromptsPage').then((m) => ({
    default: m.AiPromptsPage,
  })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const TrailsListPage = lazy(() =>
  import('./pages/TrailsListPage').then((m) => ({
    default: m.TrailsListPage,
  })),
)
const TrilhaLoginPage = lazy(() =>
  import('./pages/trilha/TrilhaLoginPage').then((m) => ({
    default: m.TrilhaLoginPage,
  })),
)
const TrilhaHomePage = lazy(() =>
  import('./pages/trilha/TrilhaHomePage').then((m) => ({
    default: m.TrilhaHomePage,
  })),
)
const TrilhaPlayerPage = lazy(() =>
  import('./pages/trilha/TrilhaPlayerPage').then((m) => ({
    default: m.TrilhaPlayerPage,
  })),
)
const TrilhaHistoryPage = lazy(() =>
  import('./pages/trilha/TrilhaHistoryPage').then((m) => ({
    default: m.TrilhaHistoryPage,
  })),
)
const TrilhaUxDemoPage = lazy(() =>
  import('./pages/trilha/TrilhaUxDemoPage').then((m) => ({
    default: m.TrilhaUxDemoPage,
  })),
)

const routerBasename =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '')

function TrilhaRoutes() {
  return (
    <Suspense fallback={<p className="muted">Carregando…</p>}>
      <Routes>
        <Route path="login" element={<TrilhaLoginPage />} />
        <Route
          path="play"
          element={
            <RequireStudentAuth>
              <TrilhaPlayerPage />
            </RequireStudentAuth>
          }
        />
        <Route
          path="historico"
          element={
            <RequireStudentAuth>
              <TrilhaHistoryPage />
            </RequireStudentAuth>
          }
        />
        {import.meta.env.DEV ? (
          <Route path="ux-demo" element={<TrilhaUxDemoPage />} />
        ) : null}
        <Route
          index
          element={
            <RequireStudentAuth>
              <TrilhaHomePage />
            </RequireStudentAuth>
          }
        />
        <Route path="*" element={<Navigate to="/trilha" replace />} />
      </Routes>
    </Suspense>
  )
}

function AppRoutes() {
  return (
    <AdminLayout>
      <Suspense fallback={<p className="muted">Carregando…</p>}>
        <Routes>
          <Route path="/doc" element={<DocPage />} />
          <Route
            path="/"
            element={
              <ProtectedPage>
                <HomePage />
              </ProtectedPage>
            }
          />
          <Route
            path="/instituicoes/novo"
            element={
              <ProtectedPage>
                <InstitutionNewPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/instituicoes/:id"
            element={
              <ProtectedPage>
                <InstitutionPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/alunos/novo"
            element={
              <ProtectedPage>
                <StudentNewPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/alunos/senhas"
            element={
              <ProtectedPage>
                <StudentPasswordsPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/prompts"
            element={
              <ProtectedPage>
                <AiPromptsPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/alunos"
            element={
              <ProtectedPage>
                <StudentsListPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/alunos/:id"
            element={
              <ProtectedPage>
                <StudentDetailPage />
              </ProtectedPage>
            }
          />
          <Route path="/gerenciamento" element={<Navigate to="/" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedPage>
                <DashboardPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedPage>
                <UsersEntry />
              </ProtectedPage>
            }
          />
          <Route path="/admin" element={<Navigate to="/usuarios" replace />} />
          <Route
            path="/perfil"
            element={
              <ProtectedPage>
                <ProfilePage />
              </ProtectedPage>
            }
          />
          <Route path="/gabarito" element={<Navigate to="/trilhas" replace />} />
          <Route
            path="/trilhas/novo"
            element={
              <ProtectedPage>
                <TrailNewPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/trilhas"
            element={
              <ProtectedPage>
                <TrailsListPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/trilhas/:id"
            element={
              <ProtectedPage>
                <TrailDetailPage />
              </ProtectedPage>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  )
}

/** Usuários: o Super admin vê as abas Crias e Instituições; a escola vê os usuários da própria instituição. */
function UsersEntry() {
  const { hasFullAccess, adminProfile } = usePermissions()
  return hasFullAccess || adminProfile?.is_super_admin ? <UsersPage /> : <AdminPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={routerBasename}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/trilha/*" element={<TrilhaRoutes />} />
          <Route path="*" element={<AppRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
