// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type AttendanceRow = {
    id: string
    name: string
    email: string
    siteName: string
    role: string
    status: string
    clockInTime: string
    clockOutTime: string
    clockInLat: number | null
    clockInLng: number | null
    clockOutLat: number | null
    clockOutLng: number | null
    breakFormatted: string
    workFormatted: string
}

export default function AdminDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [dataList, setDataList] = useState<AttendanceRow[]>([])
    const [loading, setLoading] = useState(true)

    // CSVエクスポート用の対象月（初期値: 現在の年月 例: "2026-11"）
    const [selectedMonth, setSelectedMonth] = useState('')

    useEffect(() => {
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        setSelectedMonth(`${y}-${m}`)
    }, [])

    // 管理者権限チェック & データフェッチ
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
            return
        }

        if (status === 'authenticated') {
            const role = (session?.user as any)?.role
            if (role !== 'admin' && role !== 'manager') {
                router.push('/')
                return
            }

            fetch('/api/admin/attendances')
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        setDataList(data.list)
                    } else {
                        alert(data.error || 'データ取得に失敗しました。')
                    }
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false))
        }
    }, [status, session, router])

    // CSVダウンロード処理
    const handleDownloadCsv = () => {
        window.location.href = `/api/admin/attendances/export?month=${selectedMonth}`
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-medium">読み込み中...</p>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* ヘッダー */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">管理者ダッシュボード</h1>
                        <p className="text-sm text-gray-500">本日の全社員の出退勤・GPS打刻状況一覧</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm w-full md:w-auto text-center"
                    >
                        打刻画面へ戻る
                    </button>
                </div>

                {/* CSVダウンロード＆年月選択バー */}
                <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <label className="text-xs font-bold text-gray-600 whitespace-nowrap">エクスポート対象月:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="p-2.5 border rounded-xl text-sm bg-gray-50 w-full sm:w-auto"
                        />
                    </div>
                    <button
                        onClick={handleDownloadCsv}
                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        勤怠データをCSVダウンロード
                    </button>
                </div>

                {/* 一覧セクション */}
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">本日の打刻状況一覧</h2>

                    {dataList.length === 0 ? (
                        <p className="p-8 text-center text-gray-400 text-sm">データがありません。</p>
                    ) : (
                        <>
                            {/* スマホ用カード型レイアウト（md未満で表示） */}
                            <div className="block md:hidden space-y-4">
                                {dataList.map((row) => (
                                    <div key={row.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <span className="font-bold text-gray-800 text-sm block">{row.name}</span>
                                                <span className="text-[11px] text-gray-400 block">{row.email}</span>
                                            </div>
                                            <div>
                                                {row.status === 'working' && (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold whitespace-nowrap">勤務中</span>
                                                )}
                                                {row.status === 'finished' && (
                                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold whitespace-nowrap">退勤済み</span>
                                                )}
                                                {row.status === 'not_clocked' && (
                                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold whitespace-nowrap">未出勤</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">作業現場:</span>
                                            <span className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold">
                                                {row.siteName || '未選択'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60">
                                            <div>
                                                <span className="text-gray-400 block text-[10px]">出勤時刻 / GPS</span>
                                                <span className="font-medium text-gray-700 block">{row.clockInTime}</span>
                                                {row.clockInLat && row.clockInLng ? (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${row.clockInLat},${row.clockInLng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline font-mono text-[10px] block"
                                                    >
                                                        📍 地図を開く
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">-</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block text-[10px]">退勤時刻 / GPS</span>
                                                <span className="font-medium text-gray-700 block">{row.clockOutTime}</span>
                                                {row.clockOutLat && row.clockOutLng ? (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${row.clockOutLat},${row.clockOutLng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline font-mono text-[10px] block"
                                                    >
                                                        📍 地図を開く
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">-</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-gray-200/60 text-xs">
                                            <div>
                                                <span className="text-gray-400">休憩: </span>
                                                <span className="font-medium text-gray-700">{row.breakFormatted}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">実労働: </span>
                                                <span className="font-bold text-emerald-700">{row.workFormatted}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* PC用テーブルレイアウト（md以上で表示） */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                                            <th className="p-4">社員名</th>
                                            <th className="p-4">作業現場</th>
                                            <th className="p-4">ステータス</th>
                                            <th className="p-4">出勤時刻</th>
                                            <th className="p-4">出勤GPS (緯度, 経度)</th>
                                            <th className="p-4">退勤時刻</th>
                                            <th className="p-4">退勤GPS (緯度, 経度)</th>
                                            <th className="p-4">休憩時間</th>
                                            <th className="p-4">実労働時間</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {dataList.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50 transition">
                                                <td className="p-4 font-medium text-gray-800 whitespace-nowrap">
                                                    {row.name}
                                                    <span className="block text-xs text-gray-400">{row.email}</span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                                                        {row.siteName || '未選択'}
                                                    </span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    {row.status === 'working' && (
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">勤務中</span>
                                                    )}
                                                    {row.status === 'finished' && (
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">退勤済み</span>
                                                    )}
                                                    {row.status === 'not_clocked' && (
                                                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">未出勤</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-700 whitespace-nowrap">{row.clockInTime}</td>
                                                <td className="p-4 text-xs text-gray-600 whitespace-nowrap">
                                                    {row.clockInLat && row.clockInLng ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${row.clockInLat},${row.clockInLng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline font-mono"
                                                        >
                                                            {row.clockInLat.toFixed(4)}, {row.clockInLng.toFixed(4)}
                                                        </a>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-700 whitespace-nowrap">{row.clockOutTime}</td>
                                                <td className="p-4 text-xs text-gray-600 whitespace-nowrap">
                                                    {row.clockOutLat && row.clockOutLng ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${row.clockOutLat},${row.clockOutLng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline font-mono"
                                                        >
                                                            {row.clockOutLat.toFixed(4)}, {row.clockOutLng.toFixed(4)}
                                                        </a>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-700 font-medium whitespace-nowrap">{row.breakFormatted}</td>
                                                <td className="p-4 text-gray-700 font-bold whitespace-nowrap">{row.workFormatted}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </main>
    )
}