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
          {/* 全体を横並びにして、左側にサイドバー、右側にメインコンテンツを配置 */}
          <div className="flex min-h-screen">
            <Navbar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}