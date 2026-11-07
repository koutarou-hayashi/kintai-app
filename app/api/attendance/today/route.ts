// app/api/attendance/today/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }
        const userId = (session.user as any).id

        // ★ 日付ベースの findUnique ではなく、
        // 「まだ退勤していない（status !== 'out'）」アクティブな勤務データを最新順で1件取得する
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                status: { not: 'out' }, // 退勤済み以外のもの（working, breaking など）
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                breaks: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        })

        // アクティブな勤務データがない場合は、今日すでに退勤したか、未出勤の状態
        if (!attendance) {
            return NextResponse.json({ success: true, attendance: null })
        }

        return NextResponse.json({ success: true, attendance })
    } catch (error) {
        console.error('打刻状態取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}