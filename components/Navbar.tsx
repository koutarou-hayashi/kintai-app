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
    const rawName = session.user.name || 'ユーザー'

    // ★ 「名 姓」を「姓 名」に並び替えるフォーマット関数
    const formatUserName = (name: string) => {
        if (!name) return 'ユーザー'
        // 半角または全角スペースで分割
        const parts = name.trim().split(/[\s ]+/)
        if (parts.length >= 2) {
            // [名, 姓] の順になっている想定なので、[姓, 名] にひっくり返す
            return `${parts[1]} ${parts[0]}`
        }
        return name
    }

    const userName = formatUserName(rawName)

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between sticky top-0 h-screen z-50">
            {/* 上部：タイトル & メニューリンク */}
            <div className="p-6 space-y-8 overflow-y-auto">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800 text-base tracking-wide">社内勤怠システム</span>
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
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 m-4 rounded-2xl flex items-center justify-between">
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
        </aside>
    )
}