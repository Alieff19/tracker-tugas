import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  icons: { icon: '/logo.svg', apple: '/logo.svg' },
  title: 'GoTaks — Group task tracker with measurable contribution',
  description:
    'GoTaks helps student teams split work fairly with a locked Kanban board, leader reviews, and an automatic contribution report you can export for your lecturer.',
}

export const viewport = {
  themeColor: '#F0F1EB',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
