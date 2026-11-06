// app/admin/sites/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Site = {
    id: string
    name: string
    address: string | null
    latitude: number | null
    longitude: number | null
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
    const [radiusMeter, setRadiusMeter] = useState('100')
    const [submitting, setSubmitting] = useState(false)

    // 編集モーダル用 state
    const [editingSite, setEditingSite] = useState<Site | null>(null)
    const [editName, setEditName] = useState('')
    const [editAddress, setEditAddress] = useState('')
    const [editRadiusMeter, setEditRadiusMeter] = useState('100')
    const [updating, setUpdating] = useState(false)

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
            const role = (session?.user as any)?.role
            if (role !== 'admin' && role !== 'manager') {
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
                body: JSON.stringify({
                    name,
                    address,
                    radiusMeter: radiusMeter ? parseInt(radiusMeter, 10) : 100,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setName('')
                setAddress('')
                setRadiusMeter('100')
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

    // 編集モーダルを開く
    const openEditModal = (site: Site) => {
        setEditingSite(site)
        setEditName(site.name)
        setEditAddress(site.address || '')
        setEditRadiusMeter(site.radiusMeter.toString())
    }

    // 現場情報の更新処理
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingSite || !editName.trim()) return

        setUpdating(true)
        try {
            const res = await fetch(`/api/admin/sites/${editingSite.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    address: editAddress,
                    radiusMeter: editRadiusMeter ? parseInt(editRadiusMeter, 10) : 100,
                }),
            })
            const data = await res.json()
            if (data.success) {
                setEditingSite(null)
                fetchSites()
            } else {
                alert(data.error || '更新に失敗しました。')
            }
        } catch (error) {
            console.error('更新エラー', error)
        } finally {
            setUpdating(false)
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
        <main className="min-h-screen bg-gray-50 p-8 relative">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ヘッダー */}
                <div className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">現場マスタ管理</h1>
                        <p className="text-sm text-gray-500">打刻対象となる現場の登録・編集・表示切替を行います</p>
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
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                <label className="block text-xs font-bold text-gray-600 mb-1">住所（自動で緯度経度を取得）</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="例: 岐阜県多治見市..."
                                    className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">許容半径 (m)</label>
                                <input
                                    type="number"
                                    value={radiusMeter}
                                    onChange={(e) => setRadiusMeter(e.target.value)}
                                    placeholder="100"
                                    className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                            >
                                {submitting ? '登録中（位置情報取得中...）' : '現場を追加する'}
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
                                    <th className="p-4">取得座標 (緯度, 経度)</th>
                                    <th className="p-4">許容半径</th>
                                    <th className="p-4">ステータス</th>
                                    <th className="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {sites.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-400">
                                            登録されている現場がありません。
                                        </td>
                                    </tr>
                                ) : (
                                    sites.map((site) => (
                                        <tr key={site.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-medium text-gray-800">{site.name}</td>
                                            <td className="p-4 text-gray-600">{site.address || '未設定'}</td>
                                            <td className="p-4 text-xs font-mono">
                                                {site.latitude !== null && site.longitude !== null ? (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                                        title="Googleマップで確認"
                                                    >
                                                        {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                ) : (
                                                    <span className="text-amber-600 font-sans font-medium">未取得（座標なし）</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-600 font-mono">{site.radiusMeter} m</td>
                                            <td className="p-4">
                                                {site.isActive ? (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                                        表示中
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
                                                        非表示
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button
                                                    onClick={() => openEditModal(site)}
                                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition"
                                                >
                                                    編集
                                                </button>
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

            {/* 編集モーダル */}
            {editingSite && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-xl">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-lg font-bold text-gray-800">現場情報の編集</h3>
                            <button
                                onClick={() => setEditingSite(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">現場名 *</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">住所（変更すると自動で座標が再取得されます）</label>
                                <input
                                    type="text"
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">許容半径 (m)</label>
                                <input
                                    type="number"
                                    value={editRadiusMeter}
                                    onChange={(e) => setEditRadiusMeter(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setEditingSite(null)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                                >
                                    {updating ? '保存中...' : '変更を保存する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}