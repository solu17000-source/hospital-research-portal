import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Health & Nursing Research Unit | PMNH Jazan',
    template: '%s | PMNH Research Portal',
  },
  description:
    'Health and Nursing Research Unit – Prince Mohammed Bin Nasser Hospital, Jazan Research Portal. Enterprise-grade hospital research management system.',
  keywords: ['hospital research', 'PMNH', 'Jazan', 'Saudi Arabia', 'clinical research', 'nursing research'],
  authors: [{ name: 'PMNH Research Unit' }],
  robots: 'noindex, nofollow',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a8a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              fontSize: '14px',
              fontWeight: 500,
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  )
}
