// app/admin/sites/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Site = {
    id: string
    name: string
    address: string | null
    radiusMeter: number
    isActive: boolean
}

export default function AdminSitesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [sites, setSites] = useState<Site[]>([])
    const [loading, setLoading] = useState(true)

    // 新規登録フォーム用 state
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // 現場一覧の取得
    const fetchSites = async () => {
        try {
            const res = await fetch('/api/admin/sites')
            const data = await res.json()
            if (data.success) {
                setSites(data.sites)
            }
        } catch (error) {
            console.error('現場一覧の取得に失敗しました', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
            return
        }
        if (status === 'authenticated') {
            if ((session?.user as any)?.role !== 'admin') {
                router.push('/mypage')
                return
            }
            fetchSites()
        }
    }, [status, session, router])

    // 新規現場の登録
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setSubmitting(true)
        try {
            const res = await fetch('/api/admin/sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, address }),
            })
            const data = await res.json()
            if (data.success) {
                setName('')
                setAddress('')
                fetchSites()
            } else {
                alert(data.error || '登録に失敗しました。')
            }
        } catch (error) {
            console.error('登録エラー', error)
        } finally {
            setSubmitting(false)
        }
    }

    // 表示・非表示（isActive）の切り替え
    const toggleActive = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch(`/api/admin/sites/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentActive }),
            })
            const data = await res.json()
            if (data.success) {
                setSites(sites.map(s => s.id === id ? { ...s, isActive: !currentActive } : s))
            }
        } catch (error) {
            console.error('状態変更エラー', error)
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
            <div className="max-w-4xl mx-auto space-y-6">

                {/* ヘッダー */}
                <div className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">現場マスタ管理</h1>
                        <p className="text-sm text-gray-500">打刻対象となる現場の登録・表示切替を行います</p>
                    </div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
                    >
                        管理画面トップへ戻る
                    </button>
                </div>

                {/* 新規登録フォーム */}
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-gray-800">新しい現場を追加</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">現場名 *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: 〇〇ビル新築工事現場"
                                className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">住所（任意）</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="例: 岐阜県多治見市..."
                                className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                            >
                                {submitting ? '登録中...' : '現場を追加する'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 現場一覧テーブル */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">登録済み現場一覧</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                                    <th className="p-4">現場名</th>
                                    <th className="p-4">住所</th>
                                    <th className="p-4">ステータス（打刻時の選択肢）</th>
                                    <th className="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {sites.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400">
                                            登録されている現場がありません。
                                        </td>
                                    </tr>
                                ) : (
                                    sites.map((site) => (
                                        <tr key={site.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-medium text-gray-800">{site.name}</td>
                                            <td className="p-4 text-gray-600">{site.address || '未設定'}</td>
                                            <td className="p-4">
                                                {site.isActive ? (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                                        表示中
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
                                                        非表示（アーカイブ）
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => toggleActive(site.id, site.isActive)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${site.isActive
                                                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                                        }`}
                                                >
                                                    {site.isActive ? '非表示にする' : '表示に戻す'}
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
        </main>
    )
}