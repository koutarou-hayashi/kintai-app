// app/api/user/attendances/route.ts
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

        // ユーザー自身の過去の勤怠データを取得（日付の新しい順）
        const attendances = await prisma.attendance.findMany({
            where: { userId },
            orderBy: { workDate: 'desc' },
            take: 31, // 直近約1ヶ月分
        })

        // 分を「○時間○分」にするヘルパー
        const formatMinutes = (minutes: number) => {
            if (!minutes || minutes === 0) return '-'
            const h = Math.floor(minutes / 60)
            const m = minutes % 60
            return h > 0 ? `${h}時間${m}分` : `${m}分`
        }

        const list = attendances.map((att) => {
            const dateStr = new Date(att.workDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short',
            })

            return {
                id: att.id,
                date: dateStr,
                status: att.status,
                clockInTime: att.clockInTime ? new Date(att.clockInTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-',
                clockOutTime: att.clockOutTime ? new Date(att.clockOutTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-',
                breakFormatted: formatMinutes(att.breakMinutes),
                workFormatted: formatMinutes(att.workMinutes),
                workMinutes: att.workMinutes, // 合計計算用
            }
        })

        // 今月の総労働時間（分）の簡易集計
        const totalMinutes = list.reduce((acc, cur) => acc + cur.workMinutes, 0)
        const totalWorkFormatted = formatMinutes(totalMinutes)

        return NextResponse.json({
            success: true,
            list,
            summary: {
                totalDays: list.length,
                totalWorkFormatted,
            },
        })
    } catch (error) {
        console.error('マイページデータ取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}