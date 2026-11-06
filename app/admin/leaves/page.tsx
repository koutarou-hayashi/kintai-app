// app/admin/leaves/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type AdminLeaveItem = {
    id: string
    startDate: string
    endDate: string
    leaveType: string
    reason: string | null
    status: string
    user: {
        name: string
        email: string
    }
}

export default function AdminLeavesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [list, setList] = useState<AdminLeaveItem[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLeaves = () => {
        fetch('/api/leaves')
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setList(data.requests)
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
            const role = (session?.user as any)?.role
            // ★ 管理者またはマネージャーを許可するように変更
            if (role !== 'admin' && role !== 'manager') {
                router.push('/mypage') // 許可されていない場合はマイページへリダイレクト
                return
            }
            fetchLeaves()
        }
    }, [status, session, router])

    // ステータス更新（承認 / 否認）
    const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
        const actionText = newStatus === 'approved' ? '承認' : '否認'
        if (!confirm(`この申請を${actionText}しますか？`)) return

        try {
            const res = await fetch(`/api/leaves/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const data = await res.json()

            if (data.success) {
                fetchLeaves()
            } else {
                alert(data.error || 'ステータスの更新に失敗しました。')
            }
        } catch (error) {
            console.error('通信エラー:', error)
            alert('通信エラーが発生しました。')
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

                {/* ヘッダー */}
                <div className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">休暇申請の承認管理</h1>
                        <p className="text-sm text-gray-500 mt-1">社員から提出された有給休暇や欠勤の申請を確認・管理します。</p>
                    </div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
                    >
                        管理画面トップへ戻る
                    </button>
                </div>

                {/* 申請一覧テーブル / カード */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-6">
                    <div className="space-y-4">
                        {list.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-12">現在、申請データはありません。</p>
                        ) : (
                            list.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-5 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 hover:bg-gray-100/50 transition"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-900 text-base">{item.user.name}</span>
                                            <span className="text-xs text-gray-400">({item.user.email})</span>
                                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">
                                                {getLeaveTypeLabel(item.leaveType)}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600 font-medium">
                                            期間: {new Date(item.startDate).toLocaleDateString()} 〜 {new Date(item.endDate).toLocaleDateString()}
                                        </div>

                                        {item.reason && (
                                            <p className="text-xs text-gray-500 bg-white p-2 rounded-lg border border-gray-200 inline-block">
                                                理由: {item.reason}
                                            </p>
                                        )}
                                    </div>

                                    {/* アクションボタン / ステータスバッジ */}
                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        {item.status === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(item.id, 'approved')}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                                                >
                                                    承認する
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(item.id, 'rejected')}
                                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                                                >
                                                    否認する
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${item.status === 'approved'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {item.status === 'approved' ? '承認済み' : '否認済み'}
                                            </span>
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