// app/mypage/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AttendanceCorrectionModal from '@/components/AttendanceCorrectionModal'

type MyAttendance = {
    id: string
    date: string
    status: string
    clockInTime: string
    clockOutTime: string
    breakFormatted: string
    workFormatted: string
}

type LeaveBalance = {
    totalGranted: number
    totalUsed: number
    remainingDays: number
}

export default function MyPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [list, setList] = useState<MyAttendance[]>([])
    const [summary, setSummary] = useState({ totalDays: 0, totalWorkFormatted: '0分' })
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ totalGranted: 0, totalUsed: 0, remainingDays: 0 })
    const [loading, setLoading] = useState(true)

    // ★ モーダル管理用の状態
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<MyAttendance | null>(null)

    const fetchMyData = () => {
        Promise.all([
            fetch('/api/user/attendances').then((res) => res.json()),
            fetch('/api/user/leaves/balance').then((res) => res.json()).catch(() => ({ success: false }))
        ])
            .then(([attData, leaveData]) => {
                if (attData.success) {
                    setList(attData.list)
                    setSummary(attData.summary)
                }
                if (leaveData && leaveData.success) {
                    setLeaveBalance(leaveData.balance)
                }
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
            return
        }
        if (status === 'authenticated') {
            fetchMyData()
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
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ヘッダー & サマリーカード */}
                <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">マイページ</h1>
                        <p className="text-sm text-gray-500">ご自身の勤務履歴と有給休暇の保有状況です</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <span className="text-xs text-gray-400 block">今月出勤日数</span>
                                <span className="text-lg font-bold text-gray-800">{summary.totalDays} 日</span>
                            </div>
                            <div className="border-l pl-4 border-gray-200">
                                <span className="text-xs text-gray-400 block">総労働時間</span>
                                <span className="text-lg font-bold text-emerald-600">{summary.totalWorkFormatted}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/')}
                            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                        >
                            打刻画面へ戻る
                        </button>
                    </div>
                </div>

                {/* 有給休暇残高カード */}
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-gray-800">有給休暇の保有状況</h2>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-emerald-50 rounded-xl">
                            <span className="text-xs text-emerald-600 font-bold block mb-1">残り日数</span>
                            <span className="text-2xl font-black text-emerald-700">{leaveBalance.remainingDays} <span className="text-sm font-normal">日</span></span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <span className="text-xs text-gray-500 font-bold block mb-1">付与総日数</span>
                            <span className="text-2xl font-bold text-gray-700">{leaveBalance.totalGranted} <span className="text-sm font-normal">日</span></span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <span className="text-xs text-gray-500 font-bold block mb-1">消化済日数</span>
                            <span className="text-2xl font-bold text-gray-700">{leaveBalance.totalUsed} <span className="text-sm font-normal">日</span></span>
                        </div>
                    </div>
                </div>

                {/* 履歴テーブル */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">勤務履歴一覧</h2>
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
                                    <th className="p-4 text-center">修正申請</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {list.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-400">
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
                                                {row.status === 'breaking' && (
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">休憩中</span>
                                                )}
                                                {row.status === 'finished' || row.status === 'out' && (
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">退勤済み</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-700">{row.clockInTime}</td>
                                            <td className="p-4 text-gray-700">{row.clockOutTime}</td>
                                            <td className="p-4 text-gray-600">{row.breakFormatted}</td>
                                            <td className="p-4 text-emerald-700 font-bold">{row.workFormatted}</td>
                                            <td className="p-4 text-center">
                                                {/* 各行ごとの修正申請ボタン */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedRecord(row)
                                                        setIsModalOpen(true)
                                                    }}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-700 font-bold rounded-lg text-xs transition"
                                                >
                                                    修正
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* 修正申請モーダル */}
            <AttendanceCorrectionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedRecord(null)
                }}
                onSuccess={() => {
                    fetchMyData() // 成功したらデータを再読み込み
                }}
                targetRecord={selectedRecord}
            />
        </main>
    )
}