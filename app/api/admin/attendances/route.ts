// app/api/admin/attendances/route.ts
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
        const role = (session.user as any).role
        if (role !== 'admin' && role !== 'manager') {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        // 本日の日付（00:00:00）と翌日（00:00:00）を算出（今日作成された、または今日にまたがるデータを広く拾うため）
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const todayEnd = new Date(todayStart)
        todayEnd.setDate(todayEnd.getDate() + 1)

        // 1. ロールに応じたユーザーIDの絞り込み条件を構築
        let userWhereCondition = {}

        if (role === 'manager') {
            const subordinates = await prisma.user.findMany({
                where: { managerId: userId },
                select: { id: true },
            })
            const targetUserIds = [userId, ...subordinates.map((s) => s.id)]
            userWhereCondition = { id: { in: targetUserIds } }
        }

        // 2. ユーザーを取得し、本日の打刻データ（または未退勤のデータ）を柔軟に取得する
        const usersWithAttendance = await prisma.user.findMany({
            where: userWhereCondition,
            include: {
                attendances: {
                    where: {
                        OR: [
                            // 条件A: 今日作成されたもの、または今日中に打刻されたもの
                            { createdAt: { gte: todayStart, lt: todayEnd } },
                            // 条件B: 日をまたいでまだ退勤していないもの（夜勤・アクティブなシフト）
                            { status: { not: 'out' } },
                        ],
                    },
                    include: {
                        site: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        const formatMinutes = (minutes: number) => {
            if (!minutes || minutes === 0) return '-'
            const h = Math.floor(minutes / 60)
            const m = minutes % 60
            return h > 0 ? `${h}時間${m}分` : `${m}分`
        }

        // 3. 1人のユーザーが複数シフトを持っている場合も考慮して、すべての勤務レコードを平坦化（flatten）してリスト化
        const list: any[] = []

        usersWithAttendance.forEach((user) => {
            if (user.attendances.length === 0) {
                // 打刻データが1件もない場合は「未出勤」として1行表示する
                list.push({
                    id: `${user.id}-not-clocked`,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    siteName: '未選択',
                    status: 'not_clocked',
                    clockInTime: '-',
                    clockOutTime: '-',
                    clockInLat: null,
                    clockInLng: null,
                    clockOutLat: null,
                    clockOutLng: null,
                    breakMinutes: 0,
                    workMinutes: 0,
                    breakFormatted: '-',
                    workFormatted: '-',
                })
            } else {
                // 勤務データがある場合は、それぞれのシフト（複数可）を個別の行として展開する
                user.attendances.forEach((att) => {
                    const breakMins = att.breakMinutes || 0
                    const workMins = att.workMinutes || 0

                    list.push({
                        id: att.id, // 各シフトの固有ID
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        siteName: att.site?.name || '未選択',
                        status: att.status,
                        clockInTime: att.clockInTime ? new Date(att.clockInTime).toLocaleTimeString('ja-JP') : '-',
                        clockOutTime: att.clockOutTime ? new Date(att.clockOutTime).toLocaleTimeString('ja-JP') : '-',
                        clockInLat: att.clockInLat !== null && att.clockInLat !== undefined ? Number(att.clockInLat) : null,
                        clockInLng: att.clockInLng !== null && att.clockInLng !== undefined ? Number(att.clockInLng) : null,
                        clockOutLat: att.clockOutLat !== null && att.clockOutLat !== undefined ? Number(att.clockOutLat) : null,
                        clockOutLng: att.clockOutLng !== null && att.clockOutLng !== undefined ? Number(att.clockOutLng) : null,
                        breakMinutes: breakMins,
                        workMinutes: workMins,
                        breakFormatted: formatMinutes(breakMins),
                        workFormatted: formatMinutes(workMins),
                    })
                })
            }
        })

        return NextResponse.json({ success: true, list })
    } catch (error) {
        console.error('管理者データ取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}