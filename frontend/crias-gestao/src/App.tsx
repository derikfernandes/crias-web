import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AdminLayout } from './layouts/AdminLayout'
import { ProtectedPage, RequireStudentAuth } from './layouts/RouteGuards'
import { LoginPage } from './pages/LoginPage'
import './design/styles/app.css'

// Code splitting: cada página vira um chunk próprio, carregado sob demanda.
// Os componentes e o comportamento das páginas permanecem idênticos.
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const DocPage = lazy(() =>
  import('./pages/DocPage').then((m) => ({ default: m.DocPage })),
)
const GabaritoPage = lazy(() =>
  import('./pages/GabaritoPage').then((m) => ({ default: m.GabaritoPage })),
)
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const InstitutionDetailPage = lazy(() =>
  import('./pages/InstitutionDetailPage').then((m) => ({
    default: m.InstitutionDetailPage,
  })),
)
const InstitutionNewPage = lazy(() =>
  import('./pages/InstitutionNewPage').then((m) => ({
    default: m.InstitutionNewPage,
  })),
)
const TrailDetailPage = lazy(() =>
  import('./pages/TrailDetailPage').then((m) => ({
    default: m.TrailDetailPage,
  })),
)
const TrailStageQuestionsPage = lazy(() =>
  import('./pages/TrailStageQuestionsPage').then((m) => ({
    default: m.TrailStageQuestionsPage,
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
const GerenciamentoPage = lazy(() =>
  import('./pages/GerenciamentoPage').then((m) => ({
    default: m.GerenciamentoPage,
  })),
)
const StudentsListPage = lazy(() =>
  import('./pages/StudentsListPage').then((m) => ({
    default: m.StudentsListPage,
  })),
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
                <InstitutionDetailPage />
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
          <Route
            path="/gerenciamento"
            element={
              <ProtectedPage>
                <GerenciamentoPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedPage>
                <DashboardPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedPage>
                <AdminPage />
              </ProtectedPage>
            }
          />
          <Route
            path="/gabarito"
            element={
              <ProtectedPage>
                <GabaritoPage />
              </ProtectedPage>
            }
          />
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
            path="/trilhas/:trailId/stages/:stageNumber/questoes"
            element={
              <ProtectedPage>
                <TrailStageQuestionsPage />
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
