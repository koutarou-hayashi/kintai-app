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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">読み込み中...</p>
      </main>
    )
  }

  if (!session) return null

  const userName = session.user?.name || 'ユーザー'

  const handleClock = (type: 'in' | 'out' | 'break_in' | 'break_out') => {
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
            const messages: Record<string, string> = {
              in: '出勤打刻が完了しました！',
              out: '退勤打刻が完了しました！',
              break_in: '休憩に入りました。',
              break_out: '休憩から戻りました。',
            }
            setMessage(messages[type] || '打刻が完了しました。')
          } else {
            setMessage('打刻に失敗しました: ' + data.error)
          }
        } catch (err) {
          setMessage('通信エラーが発生しました。')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setLoading(false)
        setMessage('位置情報の取得に失敗しました。GPSを有効にしてください。')
      },
      { enableHighAccuracy: true }
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">

        <h1 className="text-xl font-bold text-gray-800">社内勤怠管理システム</h1>

        <div className="text-sm text-gray-500">
          現在地（GPS）を自動取得して打刻します
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleClock('in')}
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-sm"
          >
            出勤する
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleClock('break_in')}
              disabled={loading}
              className="py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-xs"
            >
              休憩に入る
            </button>
            <button
              onClick={() => handleClock('break_out')}
              disabled={loading}
              className="py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-xs"
            >
              休憩戻り
            </button>
          </div>

          <button
            onClick={() => handleClock('out')}
            disabled={loading}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 text-sm"
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