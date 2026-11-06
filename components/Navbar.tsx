// components/Navbar.tsx
'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function Navbar() {
    const { data: session } = useSession()
    const pathname = usePathname()

    if (!session || !session.user) {
        return null
    }

    const userRole = (session.user as any).role
    const userName = session.user.name || 'ユーザー'

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* ロゴ / タイトル */}
                <div className="flex items-center gap-8">
                    <span className="font-bold text-gray-800 text-lg">社内勤怠システム</span>

                    <nav className="flex items-center gap-2">
                        <Link
                            href="/"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${pathname === '/'
                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            打刻画面
                        </Link>

                        <Link
                            href="/leaves"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${pathname === '/leaves'
                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            休暇申請
                        </Link>

                        <Link
                            href="/mypage"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${pathname === '/mypage'
                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            マイページ
                        </Link>

                        {/* 管理者またはマネージャー権限を持つユーザーに表示するセクション */}
                        {(userRole === 'admin' || userRole === 'manager') && (
                            <>
                                <Link
                                    href="/admin"
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${pathname === '/admin'
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    管理者ダッシュボード
                                </Link>

                                <Link
                                    href="/admin/leaves"
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${pathname === '/admin/leaves'
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    休暇承認管理
                                </Link>

                                <Link
                                    href="/admin/sites"
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${pathname === '/admin/sites'
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    現場管理
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                {/* ユーザー情報 & ログアウト */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-xs text-gray-400 block">ログイン中</span>
                        <span className="text-sm font-bold text-gray-800">{userName}</span>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium px-3 py-2 bg-rose-50 rounded-xl transition"
                    >
                        ログアウト
                    </button>
                </div>

            </div>
        </header>
    )
}