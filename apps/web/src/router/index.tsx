import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'

const Spinner = () => <div className="p-8 text-gray-400 text-sm">Loading…</div>
const s = (C: React.LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<Spinner />}><C /></Suspense>
)

const OcrPage         = lazy(() => import('@/features/ocr/OcrPage'))
const OcrDocumentPage = lazy(() => import('@/features/ocr/OcrDocumentPage'))
const OcrConfigPage   = lazy(() => import('@/features/ocr/OcrConfigPage'))
const OcrMetricsPage  = lazy(() => import('@/features/ocr/OcrMetricsPage'))

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,         element: <Navigate to="/ocr" replace /> },
      { path: 'ocr',         element: s(OcrPage) },
      { path: 'ocr/config',  element: s(OcrConfigPage) },
      { path: 'ocr/metrics', element: s(OcrMetricsPage) },
      { path: 'ocr/:id',     element: s(OcrDocumentPage) },
    ],
  },
  { path: '*', element: <Navigate to="/ocr" replace /> },
])
