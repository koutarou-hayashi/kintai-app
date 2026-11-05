// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type AttendanceRow = {
    id: string
    name: string
    email: string
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

    // 管理者権限チェック & データフェッチ
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
            return
        }

        if (status === 'authenticated') {
            // 簡易的なロールチェック（必要に応じて）
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
    }, [status, router])

    if (status === 'loading' || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-medium">読み込み中...</p>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* ヘッダー */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">管理者ダッシュボード</h1>
                        <p className="text-sm text-gray-500">本日の全社員の出退勤・GPS打刻状況一覧</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm"
                    >
                        打刻画面へ戻る
                    </button>
                </div>

                {/* 一覧テーブル */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                                    <th className="p-4">社員名</th>
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
                                        <td className="p-4 font-medium text-gray-800">
                                            {row.name}
                                            <span className="block text-xs text-gray-400">{row.email}</span>
                                        </td>
                                        <td className="p-4">
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
                                        <td className="p-4 text-gray-700">{row.clockInTime}</td>
                                        <td className="p-4 text-xs text-gray-600">
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
                                        <td className="p-4 text-gray-700">{row.clockOutTime}</td>
                                        <td className="p-4 text-xs text-gray-600">
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </main>
    )
}