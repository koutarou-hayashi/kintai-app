// app/layout.tsx
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen text-gray-800">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}