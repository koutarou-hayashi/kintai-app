// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 未認証の場合、自動的に /login にリダイレクト
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 読み込み中の表示
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">読み込み中...</p>
      </main>
    )
  }

  // 未認証状態の間は何も表示しない（リダイレクトが走るため）
  if (!session) {
    return null
  }

  // ログイン中のユーザー情報
  const userName = session.user?.name || 'ユーザー'

  // 打刻処理
  const handleClock = (type: 'in' | 'out') => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報に対応していません。')
      return
    }

    setLoading(true)
    setMessage('現在地を取得中...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        try {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, lat, lng }),
          })

          const data = await res.json()
          if (data.success) {
            setMessage(type === 'in' ? '出勤打刻が完了しました！' : '退勤打刻が完了しました！')
          } else {
            setMessage('打刻に失敗しました: ' + data.error)
          }
        } catch (err) {
          setMessage('通信エラーが発生しました。')
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        setLoading(false)
        setMessage('位置情報の取得に失敗しました。GPSを有効にしてください。')
      },
      { enableHighAccuracy: true }
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">

        {/* ヘッダー（ユーザー名とログアウト） */}
        <div className="flex justify-between items-center border-b pb-4">
          <div className="text-left">
            <span className="text-xs text-gray-400 block">ログイン中</span>
            <span className="text-sm font-bold text-gray-800">{userName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium px-3 py-1 bg-rose-50 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>

        <h1 className="text-xl font-bold text-gray-800">社内勤怠管理システム</h1>

        <div className="text-sm text-gray-500">
          現在地（GPS）を自動取得して打刻します
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleClock('in')}
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50"
          >
            出勤する
          </button>

          <button
            onClick={() => handleClock('out')}
            disabled={loading}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50"
          >
            退勤する
          </button>
        </div>

        {message && (
          <p className="text-sm font-medium text-gray-700 bg-gray-100 p-3 rounded-lg">
            {message}
          </p>
        )}
      </div>
    </main>
  )
}