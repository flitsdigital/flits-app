import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CrmBootstrap } from './components/CrmBootstrap'
import { PageLoader } from './components/PageLoader'

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Clients = lazy(() => import('./pages/Clients').then((m) => ({ default: m.Clients })))
const ClientDetail = lazy(() => import('./pages/ClientDetail').then((m) => ({ default: m.ClientDetail })))
const Timeline = lazy(() => import('./pages/Timeline').then((m) => ({ default: m.Timeline })))
const Content = lazy(() => import('./pages/Content').then((m) => ({ default: m.Content })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const TravelExpenses = lazy(() => import('./pages/TravelExpenses').then((m) => ({ default: m.TravelExpenses })))
const TimeTracking = lazy(() => import('./pages/TimeTracking').then((m) => ({ default: m.TimeTracking })))
const Projects = lazy(() => import('./pages/Projects').then((m) => ({ default: m.Projects })))
const TaskDetail = lazy(() => import('./pages/TaskDetail').then((m) => ({ default: m.TaskDetail })))
const Leads = lazy(() => import('./pages/Leads').then((m) => ({ default: m.Leads })))
const LeadDetail = lazy(() => import('./pages/LeadDetail').then((m) => ({ default: m.LeadDetail })))

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function CrmRoutes() {
  return (
    <Routes>
      <Route element={<CrmBootstrap />}>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route element={<ProtectedRoute page="dashboard" />}>
              <Route
                index
                element={
                  <Lazy>
                    <Dashboard />
                  </Lazy>
                }
              />
            </Route>

            <Route element={<ProtectedRoute page="clients" />}>
              <Route
                path="clients"
                element={
                  <Lazy>
                    <Clients />
                  </Lazy>
                }
              />
              <Route
                path="clients/:id"
                element={
                  <Lazy>
                    <ClientDetail />
                  </Lazy>
                }
              />
            </Route>

            <Route element={<ProtectedRoute page="timeline" />}>
              <Route
                path="timeline"
                element={
                  <Lazy>
                    <Timeline />
                  </Lazy>
                }
              />
            </Route>

            <Route element={<ProtectedRoute page="content" />}>
              <Route
                path="content"
                element={
                  <Lazy>
                    <Content />
                  </Lazy>
                }
              />
            </Route>

            <Route element={<ProtectedRoute page="reiskosten" />}>
              <Route
                path="reiskosten"
                element={
                  <Lazy>
                    <TravelExpenses />
                  </Lazy>
                }
              />
            </Route>

            <Route element={<ProtectedRoute page="time_tracking" />}>
              <Route
                path="uren"
                element={
                  <Lazy>
                    <TimeTracking />
                  </Lazy>
                }
              />
            </Route>

            <Route element={<ProtectedRoute page="projects" />}>
              <Route
                path="projects"
                element={
                  <Lazy>
                    <Projects />
                  </Lazy>
                }
              />
              <Route
                path="projecten/:projectId/taken/:taskId"
                element={
                  <Lazy>
                    <TaskDetail />
                  </Lazy>
                }
              />
            </Route>

            <Route element={<ProtectedRoute page="leads" />}>
              <Route
                path="leads"
                element={
                  <Lazy>
                    <Leads />
                  </Lazy>
                }
              />
              <Route
                path="leads/:id"
                element={
                  <Lazy>
                    <LeadDetail />
                  </Lazy>
                }
              />
            </Route>

            <Route
              path="settings"
              element={
                <Lazy>
                  <Settings />
                </Lazy>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
