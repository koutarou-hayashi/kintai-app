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

        // 本日の日付（00:00:00）
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const attendance = await prisma.attendance.findUnique({
            where: {
                userId_workDate: {
                    userId,
                    workDate: today,
                },
            },
            include: {
                breaks: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        })

        // ★ データがない場合は attendance: null として JSON を返す
        if (!attendance) {
            return NextResponse.json({ success: true, attendance: null })
        }

        return NextResponse.json({ success: true, attendance })
    } catch (error) {
        console.error('打刻状態取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}