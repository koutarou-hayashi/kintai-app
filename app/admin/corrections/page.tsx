// app/admin/corrections/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type CorrectionRequest = {
    id: string
    targetDate: string
    newClockInTime: string | null
    newClockOutTime: string | null
    newBreakMinutes: number | null
    reason: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
    user: {
        name: string
        email: string
    }
}

export default function AdminCorrectionsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [requests, setRequests] = useState<CorrectionRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

    // 申請一覧を取得する関数
    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/attendance/corrections')
            const data = await res.json()
            if (data.success) {
                setRequests(data.requests)
            }
        } catch (err) {
            console.error('修正申請の取得に失敗しました', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (status === 'authenticated') {
            const role = (session.user as any).role
            if (role !== 'admin' && role !== 'manager') {
                alert('権限がありません。')
                router.push('/')
                return
            }
            fetchRequests()
        }
    }, [status, router, session])

    // 承認 / 否認の処理
    const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
        if (!confirm(`この申請を${newStatus === 'approved' ? '承認' : '否認'}しますか？`)) {
            return
        }

        setActionLoadingId(id)
        try {
            const res = await fetch(`/api/attendance/corrections/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            const data = await res.json()
            if (data.success) {
                alert(`申請を${newStatus === 'approved' ? '承認' : '否認'}しました。`)
                fetchRequests() // 一覧を再取得
            } else {
                alert('エラー: ' + data.error)
            }
        } catch (err) {
            alert('通信エラーが発生しました。')
        } finally {
            setActionLoadingId(null)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-medium">読み込み中...</p>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ヘッダー */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">打刻修正申請の管理</h1>
                        <p className="text-xs text-gray-500 mt-1">従業員からの打刻修正依頼を確認し、承認・否認を行います。</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                    >
                        打刻画面へ戻る
                    </button>
                </div>

                {/* 申請一覧リスト */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    {requests.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm">
                            現在、確認待ちの修正申請はありません。
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {requests.map((req) => {
                                const isPending = req.status === 'pending'
                                return (
                                    <div key={req.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 transition">

                                        {/* 申請情報 */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 text-sm">{req.user.name}</span>
                                                <span className="text-xs text-gray-400">({req.user.email})</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                    {req.status === 'pending' ? '承認待ち' : req.status === 'approved' ? '承認済み' : '否認'}
                                                </span>
                                            </div>

                                            <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                                                <div><span className="font-bold text-gray-500">対象日:</span> {new Date(req.targetDate).toLocaleDateString('ja-JP')}</div>
                                                <div><span className="font-bold text-gray-500">希望出勤:</span> {req.newClockInTime ? new Date(req.newClockInTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '変更なし'}</div>
                                                <div><span className="font-bold text-gray-500">希望退勤:</span> {req.newClockOutTime ? new Date(req.newClockOutTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '変更なし'}</div>
                                                <div><span className="font-bold text-gray-500">休憩:</span> {req.newBreakMinutes !== null ? `${req.newBreakMinutes}分` : '変更なし'}</div>
                                            </div>

                                            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-200/60">
                                                <span className="font-bold text-gray-500">理由: </span>{req.reason}
                                            </div>
                                        </div>

                                        {/* アクションボタン（承認待ちのときだけ操作可能） */}
                                        {isPending && (
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, 'approved')}
                                                    disabled={actionLoadingId === req.id}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-sm"
                                                >
                                                    承認する
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                                    disabled={actionLoadingId === req.id}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-xs transition disabled:opacity-50"
                                                >
                                                    否認する
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div>
        </main>
    )
}