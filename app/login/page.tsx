// app/login/page.tsx
'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-800">社内勤怠システム</h1>
                    <p className="text-sm text-gray-500">Microsoftアカウントでサインインしてください</p>
                </div>

                <button
                    onClick={() => signIn('azure-ad', { callbackUrl: '/' })}
                    className="w-full py-4 bg-[#00a4ef] hover:bg-[#0078d4] text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-3"
                >
                    <span>Microsoftでサインイン</span>
                </button>
            </div>
        </main>
    )
} 