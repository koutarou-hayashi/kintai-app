// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AttendanceCorrectionModal from '@/components/AttendanceCorrectionModal' // ★ 先ほどのモーダルをインポート
import { CLIENT_STATIC_FILES_RUNTIME_MAIN_APP } from 'next/dist/shared/lib/constants'

type Site = {
  id: string
  name: string
  address: string | null
}

type AttendanceStatus = 'not_clocked' | 'working' | 'breaking' | 'out'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // リアルタイム時計
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  // 現場選択
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState('')

  // ★ 現在の勤怠ステータス
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('not_clocked')

  // ★ 修正申請モーダルの開閉状態
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false)

  // 1. 時計のタイマー
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. メッセージの自動消去
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message])

  // 3. 初期データ取得（現場一覧 ＆ 本日の打刻状態）
  const fetchTodayStatus = async () => {
    try {
      const res = await fetch('/api/attendance/today')
      const data = await res.json()
      if (data.success) {
        if (!data.attendance) {
          setAttendanceStatus('not_clocked')
        } else {
          setAttendanceStatus(data.attendance.status) // 'working', 'breaking', 'out' など
        }
      }
    } catch (err) {
      console.error('打刻状態の取得に失敗しました', err)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      // 現場一覧の取得
      fetch('/api/admin/sites?active=true')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.sites) {
            setSites(data.sites)
            if (data.sites.length > 0) setSelectedSiteId(data.sites[0].id)
          }
        })
        .catch((err) => console.error('現場一覧の取得に失敗しました', err))

      // 本日の打刻状況を取得
      fetchTodayStatus()
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

  // const handleClock = (type: 'in' | 'out' | 'break_in' | 'break_out') => {
  const handleClock = (type: 'in' | 'out' | 'break_in' | 'break_out') => {
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
              siteId: type === 'in' ? selectedSiteId : undefined,
            }),
          })

          const data = await res.json()
          if (data.success) {
            const messages: Record<string, string> = {
              in: '出勤打刻が完了しました！',
              out: '退勤打刻が完了しました！',
              break_in: '休憩を開始しました。',
              break_out: '休憩を終了しました。',
            }
            setMessage(messages[type] || '打刻が完了しました。')

            // 打刻成功後に最新のステータスを再取得してボタン状態を更新
            await fetchTodayStatus()
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

        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">社内勤怠管理システム</h1>
          {/* 修正申請ボタン */}
          <button
            onClick={() => setIsCorrectionModalOpen(true)}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 px-3 rounded-lg transition"
          >
            修正申請
          </button>
        </div>

        {/* リアルタイム時計表示 */}
        <div className="bg-gray-900 text-emerald-400 py-4 px-6 rounded-xl shadow-inner">
          <div className="text-xs text-gray-400 font-medium mb-1">
            {currentTime ? currentTime.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '---'}
          </div>
          <div className="text-3xl font-black tracking-wider font-mono">
            {currentTime ? currentTime.toLocaleTimeString('ja-JP') : '--:--:--'}
          </div>
          {/* 現在のステータス表示 */}
          <div className="mt-2 text-xs text-gray-300">
            状態: <span className="font-bold text-emerald-300">
              {attendanceStatus === 'not_clocked' && '未出勤'}
              {attendanceStatus === 'working' && '勤務中'}
              {attendanceStatus === 'breaking' && '休憩中'}
              {attendanceStatus === 'out' && '退勤済み'}
            </span>
          </div>
        </div>

        {/* 現場選択プルダウン */}
        <div className="space-y-1 text-left">
          <label className="block text-xs font-bold text-gray-600">作業現場の選択</label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            disabled={attendanceStatus === 'working' || attendanceStatus === 'breaking'}
            className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-400"
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

        {/* ボタン群（状態に応じて disabled を厳格に制御） */}
        <div className="flex flex-col gap-3">
          {/* 出勤する */}
          <button
            onClick={() => handleClock('in')}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-40 disabled:bg-gray-300 text-sm"
          >
            出勤する
          </button>

          <div className="grid grid-cols-2 gap-3">
            {/* 休憩開始 */}
            <button
              onClick={() => handleClock('break_in')}
              className="py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition disabled:opacity-40 disabled:bg-gray-300 text-xs"
            >
              休憩開始
            </button>
            {/* 休憩終了 */}
            <button
              onClick={() => handleClock('break_out')}
              className="py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-40 disabled:bg-gray-300 text-xs"
            >
              休憩終了
            </button>
          </div>

          {/* 退勤する */}
          <button
            onClick={() => handleClock('out')}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-40 disabled:bg-gray-300 text-sm"
          >
            退勤する
          </button>
        </div>

        {/* メッセージ */}
        {message && (
          <div className="text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg transition-all">
            {message}
          </div>
        )}
      </div>

      {/* 打刻修正申請用モーダル */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        onSuccess={() => {
          // 必要であれば再取得などの処理
        }}
      />
    </main>
  )
}