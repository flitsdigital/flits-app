import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { ScrollToTop } from './components/ScrollToTop'
import { PageLoader } from './components/PageLoader'

const CrmRoutes = lazy(() => import('./CrmRoutes'))
const PostPreview = lazy(() => import('./pages/PostPreview').then((m) => ({ default: m.PostPreview })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })),
)

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            <Lazy>
              <Login />
            </Lazy>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Lazy>
              <ForgotPassword />
            </Lazy>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Lazy>
              <ResetPassword />
            </Lazy>
          }
        />
        <Route
          path="preview/:postId"
          element={
            <Lazy>
              <PostPreview />
            </Lazy>
          }
        />

        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <CrmRoutes />
            </Suspense>
          }
        />
      </Routes>

      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  )
}
