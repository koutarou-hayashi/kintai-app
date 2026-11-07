// components/Navbar.tsx
'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Navbar() {
    const { data: session } = useSession()
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    // ページが切り替わったらスマホのメニューを自動で閉じる
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    if (!session || !session.user) {
        return null
    }

    const userRole = (session.user as any).role
    const rawName = session.user.name || 'ユーザー'

    const formatUserName = (name: string) => {
        if (!name) return 'ユーザー'
        const parts = name.trim().split(/[\s ]+/)
        if (parts.length >= 2) {
            return `${parts[1]} ${parts[0]}`
        }
        return name
    }

    const userName = formatUserName(rawName)

    // メニューの中身（PCとスマホ共通）
    const navContent = (
        <div className="flex flex-col justify-between h-full">
            {/* 上部：タイトル & メニューリンク */}
            <div className="p-6 space-y-8 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-base tracking-wide">社内勤怠システム</span>
                    {/* スマホ用閉じるボタン */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="md:hidden text-gray-400 hover:text-gray-600 font-bold text-xl p-1"
                    >
                        &times;
                    </button>
                </div>

                <nav className="space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">メニュー</div>
                    <Link
                        href="/"
                        className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition ${pathname === '/'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        打刻画面
                    </Link>

                    <Link
                        href="/leaves"
                        className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition ${pathname === '/leaves'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        休暇申請
                    </Link>

                    <Link
                        href="/mypage"
                        className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition ${pathname === '/mypage'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        マイページ
                    </Link>

                    {/* 管理者またはマネージャー権限を持つユーザーに表示するセクション */}
                    {(userRole === 'admin' || userRole === 'manager') && (
                        <div className="pt-4 space-y-1.5">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">管理メニュー</div>
                            <Link
                                href="/admin"
                                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition ${pathname === '/admin'
                                    ? 'bg-blue-50 text-blue-700 font-bold'
                                    : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                管理者ダッシュボード
                            </Link>

                            <Link
                                href="/admin/leaves"
                                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition ${pathname === '/admin/leaves'
                                    ? 'bg-blue-50 text-blue-700 font-bold'
                                    : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                休暇承認管理
                            </Link>

                            <Link
                                href="/admin/corrections"
                                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition ${pathname === '/admin/corrections'
                                    ? 'bg-blue-50 text-blue-700 font-bold'
                                    : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                打刻修正承認管理
                            </Link>

                            <Link
                                href="/admin/sites"
                                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition ${pathname === '/admin/sites'
                                    ? 'bg-blue-50 text-blue-700 font-bold'
                                    : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                現場管理
                            </Link>
                        </div>
                    )}
                </nav>
            </div>

            {/* 下部：ユーザー情報 & ログアウト */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 m-4 rounded-2xl flex items-center justify-between shrink-0">
                <div className="overflow-hidden pr-2">
                    <span className="text-[10px] text-gray-400 block">ログイン中</span>
                    <span className="text-sm font-bold text-gray-800 truncate block">{userName}</span>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium px-3 py-2 bg-rose-50 rounded-xl transition shrink-0"
                >
                    ログアウト
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* ① PC用サイドバー（md以上で常時表示） */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 sticky top-0 h-screen z-40 flex-col">
                {navContent}
            </aside>

            {/* ② スマホ用トップヘッダー（md未満で表示） */}
            <header className="md:hidden bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between sticky top-0 z-40 w-full">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
                        aria-label="メニューを開く"
                    >
                        {/* ハンバーガーアイコン */}
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="font-bold text-gray-800 text-sm">社内勤怠システム</span>
                </div>
            </header>

            {/* ③ スマホ用スライドメニュー（オーバーレイ付きドロワー） */}
            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* 背景の黒い半透明幕（タップすると閉じる） */}
                    <div
                        className="fixed inset-0 bg-black/50 transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* 左側からスライドしてくるメニュー本体 */}
                    <div className="relative w-72 max-w-[80%] bg-white h-full shadow-2xl z-10 flex flex-col">
                        {navContent}
                    </div>
                </div>
            )}
        </>
    )
}