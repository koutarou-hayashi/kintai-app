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
          {/* PCでは横並び、スマホでは縦積み（上がNavbar、下がコンテンツ） */}
          <div className="flex flex-col md:flex-row min-h-screen">
            <Navbar />
            <main className="flex-1 overflow-y-auto w-full">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}