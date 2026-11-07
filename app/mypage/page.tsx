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

    // モーダル管理用の状態
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
        <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ヘッダー & サマリーカード */}
                <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">マイページ</h1>
                        <p className="text-sm text-gray-500">ご自身の勤務履歴と有給休暇の保有状況です</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                        <div className="flex justify-between sm:justify-start gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1">
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
                            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition whitespace-nowrap text-center"
                        >
                            打刻画面へ戻る
                        </button>
                    </div>
                </div>

                {/* 有給休暇残高カード */}
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-gray-800">有給休暇の保有状況</h2>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                        <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl">
                            <span className="text-[10px] sm:text-xs text-emerald-600 font-bold block mb-1">残り日数</span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-700">{leaveBalance.remainingDays} <span className="text-xs sm:text-sm font-normal">日</span></span>
                        </div>
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                            <span className="text-[10px] sm:text-xs text-gray-500 font-bold block mb-1">付与総日数</span>
                            <span className="text-xl sm:text-2xl font-bold text-gray-700">{leaveBalance.totalGranted} <span className="text-xs sm:text-sm font-normal">日</span></span>
                        </div>
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                            <span className="text-[10px] sm:text-xs text-gray-500 font-bold block mb-1">消化済日数</span>
                            <span className="text-xl sm:text-2xl font-bold text-gray-700">{leaveBalance.totalUsed} <span className="text-xs sm:text-sm font-normal">日</span></span>
                        </div>
                    </div>
                </div>

                {/* 履歴リスト・テーブルセクション */}
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">勤務履歴一覧</h2>

                    {list.length === 0 ? (
                        <p className="p-8 text-center text-gray-400 text-sm">記録がまだありません。</p>
                    ) : (
                        <>
                            {/* スマホ用カード型レイアリウト（md未満で表示） */}
                            <div className="block md:hidden space-y-3">
                                {list.map((row) => (
                                    <div key={row.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-800 text-sm">{row.date}</span>
                                            <div>
                                                {row.status === 'working' && (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold whitespace-nowrap">勤務中</span>
                                                )}
                                                {row.status === 'breaking' && (
                                                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold whitespace-nowrap">休憩中</span>
                                                )}
                                                {(row.status === 'finished' || row.status === 'out') && (
                                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold whitespace-nowrap">退勤済み</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200/60">
                                            <div>
                                                <span className="text-gray-400 block text-[10px]">出勤 - 退勤</span>
                                                <span className="font-medium text-gray-700">{row.clockInTime} 〜 {row.clockOutTime}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block text-[10px]">休憩 / 実労働</span>
                                                <span className="font-medium text-gray-700">{row.breakFormatted} / <strong className="text-emerald-700">{row.workFormatted}</strong></span>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2 border-t border-gray-200/60">
                                            <button
                                                onClick={() => {
                                                    setSelectedRecord(row)
                                                    setIsModalOpen(true)
                                                }}
                                                className="px-4 py-1.5 bg-white border border-gray-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-gray-700 font-bold rounded-lg text-xs transition shadow-sm"
                                            >
                                                修正申請
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* PC用テーブルレイアウト（md以上で表示） */}
                            <div className="hidden md:block overflow-x-auto">
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
                                        {list.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50 transition">
                                                <td className="p-4 font-medium text-gray-800 whitespace-nowrap">{row.date}</td>
                                                <td className="p-4 whitespace-nowrap">
                                                    {row.status === 'working' && (
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">勤務中</span>
                                                    )}
                                                    {row.status === 'breaking' && (
                                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">休憩中</span>
                                                    )}
                                                    {(row.status === 'finished' || row.status === 'out') && (
                                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">退勤済み</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-700 whitespace-nowrap">{row.clockInTime}</td>
                                                <td className="p-4 text-gray-700 whitespace-nowrap">{row.clockOutTime}</td>
                                                <td className="p-4 text-gray-600 whitespace-nowrap">{row.breakFormatted}</td>
                                                <td className="p-4 text-emerald-700 font-bold whitespace-nowrap">{row.workFormatted}</td>
                                                <td className="p-4 text-center whitespace-nowrap">
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
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
                    fetchMyData()
                }}
                targetRecord={selectedRecord}
            />
        </main>
    )
}