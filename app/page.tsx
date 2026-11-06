// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Site = {
  id: string
  name: string
  address: string | null
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // 現場選択用のstate
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      // 有効な現場一覧を取得
      fetch('/api/admin/sites?active=true')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.sites) {
            setSites(data.sites)
            if (data.sites.length > 0) {
              setSelectedSiteId(data.sites[0].id) // 初期選択
            }
          }
        })
        .catch((err) => console.error('現場一覧の取得に失敗しました', err))
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

  const handleClock = (type: 'in' | 'out' | 'break_in' | 'break_out') => {
    // 出勤のときは現場が選択されているかチェック
    if (type === 'in' && !selectedSiteId) {
      alert('作業現場を選択してください。')
      return
    }

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
            body: JSON.stringify({
              type,
              lat,
              lng,
              siteId: type === 'in' ? selectedSiteId : undefined, // 出勤時のみ現場IDを送る
            }),
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

        {/* 現場選択プルダウン（出勤時や作業前に選択） */}
        <div className="space-y-1 text-left">
          <label className="block text-xs font-bold text-gray-600">作業現場の選択</label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {sites.length === 0 ? (
              <option value="">選択できる現場がありません</option>
            ) : (
              sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} {site.address ? `(${site.address})` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleClock('in')}
            disabled={loading || sites.length === 0}
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