// app/leaves/page.tsx
'use client'

import { useState, useEffect } from 'react'

type LeaveItem = {
    id: string
    startDate: string
    endDate: string
    leaveType: string
    reason: string | null
    status: string
}

export default function LeavePage() {
    const [list, setList] = useState<LeaveItem[]>([])
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [leaveType, setLeaveType] = useState('paid')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const fetchLeaves = () => {
        fetch('/api/leaves')
            .then((res) => res.json())
            .then((data) => {
                if (data.success) setList(data.requests)
            })
    }

    useEffect(() => {
        fetchLeaves()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!startDate || !endDate) return alert('日付を入力してください')

        setLoading(true)
        const res = await fetch('/api/leaves', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate, leaveType, reason }),
        })
        const data = await res.json()
        setLoading(false)

        if (data.success) {
            alert('休暇申請を送信しました。')
            setStartDate('')
            setEndDate('')
            setReason('')
            fetchLeaves()
        } else {
            alert(data.error || '申請に失敗しました。')
        }
    }

    // 休暇種類の日本語ラベル変換
    const getLeaveTypeLabel = (type: string) => {
        switch (type) {
            case 'paid': return '有給休暇（全日）'
            case 'half_am': return '午前半休'
            case 'half_pm': return '午後半休'
            case 'special': return '特別休暇'
            case 'absent': return '欠勤'
            default: return 'その他'
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">有給休暇・欠勤の申請</h1>
                    <p className="text-sm text-gray-500 mb-6">休暇の申請を行い、承認状況を確認できます。</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">開始日</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-3 border rounded-xl text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">終了日</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-3 border rounded-xl text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">種類</label>
                            <select
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value)}
                                className="w-full p-3 border rounded-xl text-sm bg-white"
                            >
                                <option value="paid">有給休暇（全日）</option>
                                <option value="half_am">午前半休</option>
                                <option value="half_pm">午後半休</option>
                                <option value="special">特別休暇</option>
                                <option value="absent">欠勤</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">理由（任意）</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="私用のため など"
                                className="w-full p-3 border rounded-xl text-sm"
                                rows={2}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-sm shadow-md"
                        >
                            {loading ? '送信中...' : '申請を送信する'}
                        </button>
                    </form>
                </div>

                {/* 申請履歴一覧 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">申請履歴</h2>
                    <div className="space-y-3">
                        {list.length === 0 ? (
                            <p className="text-gray-400 text-sm">申請履歴はありません。</p>
                        ) : (
                            list.map((item) => (
                                <div key={item.id} className="p-4 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50">
                                    {/* 左側：種類、日付、理由 */}
                                    <div className="space-y-1 w-full sm:w-auto">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-gray-800 text-sm">
                                                {getLeaveTypeLabel(item.leaveType)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                                            {new Date(item.startDate).toLocaleDateString()} 〜 {new Date(item.endDate).toLocaleDateString()}
                                        </span>
                                        {item.reason && (
                                            <p className="text-xs text-gray-600 break-words">理由: {item.reason}</p>
                                        )}
                                    </div>

                                    {/* 右側：ステータスバッジ（スマホでも縮まないように shrink-0 を付与） */}
                                    <div className="shrink-0 self-end sm:self-center">
                                        {item.status === 'pending' && (
                                            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold whitespace-nowrap">申請中</span>
                                        )}
                                        {item.status === 'approved' && (
                                            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold whitespace-nowrap">承認済み</span>
                                        )}
                                        {item.status === 'rejected' && (
                                            <span className="inline-block px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold whitespace-nowrap">否認</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}