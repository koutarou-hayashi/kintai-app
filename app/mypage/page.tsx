// app/mypage/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type MyAttendance = {
    id: string
    date: string
    status: string
    clockInTime: string
    clockOutTime: string
    breakFormatted: string
    workFormatted: string
}

export default function MyPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [list, setList] = useState<MyAttendance[]>([])
    const [summary, setSummary] = useState({ totalDays: 0, totalWorkFormatted: '0分' })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
            return
        }

        if (status === 'authenticated') {
            fetch('/api/user/attendances')
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        setList(data.list)
                        setSummary(data.summary)
                    }
                })
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
            <div className="max-w-4xl mx-auto space-y-6">

                {/* ヘッダー & サマリーカード */}
                <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">マイページ（勤務履歴）</h1>
                        <p className="text-sm text-gray-500">ご自身の過去の出退勤記録と労働時間の一覧です</p>
                    </div>
                    <div className="flex gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div>
                            <span className="text-xs text-gray-400 block">出勤日数</span>
                            <span className="text-lg font-bold text-gray-800">{summary.totalDays} 日</span>
                        </div>
                        <div className="border-l pl-4 border-gray-200">
                            <span className="text-xs text-gray-400 block">総労働時間</span>
                            <span className="text-lg font-bold text-emerald-600">{summary.totalWorkFormatted}</span>
                        </div>
                    </div>
                </div>

                {/* 履歴テーブル */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                                    <th className="p-4">日付</th>
                                    <th className="p-4">ステータス</th>
                                    <th className="p-4">出勤時刻</th>
                                    <th className="p-4">退勤時刻</th>
                                    <th className="p-4">休憩時間</th>
                                    <th className="p-4">実労働時間</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {list.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-400">
                                            記録がまだありません。
                                        </td>
                                    </tr>
                                ) : (
                                    list.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-medium text-gray-800">{row.date}</td>
                                            <td className="p-4">
                                                {row.status === 'working' && (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">勤務中</span>
                                                )}
                                                {row.status === 'finished' && (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">退勤済み</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-700">{row.clockInTime}</td>
                                            <td className="p-4 text-gray-700">{row.clockOutTime}</td>
                                            <td className="p-4 text-gray-600">{row.breakFormatted}</td>
                                            <td className="p-4 text-emerald-700 font-bold">{row.workFormatted}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </main>
    )
}