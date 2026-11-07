// app/api/admin/attendances/export/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }

        const userId = (session.user as any).id
        const role = (session.user as any).role

        // ★ admin または manager のみ許可
        if (role !== 'admin' && role !== 'manager') {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const yearMonth = searchParams.get('month') // 例: "2026-11"

        if (!yearMonth) {
            return NextResponse.json({ success: false, error: '年月が指定されていません。' }, { status: 400 })
        }

        const [year, month] = yearMonth.split('-').map(Number)
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0, 23, 59, 59)

        // ★ ロールに応じた取得対象ユーザーの絞り込み条件（where）を構築
        let userWhereCondition = {}

        if (role === 'manager') {
            // マネージャーの場合：「自分自身」＋「部下たち（managerIdが自分のID）」を対象にする
            const subordinates = await prisma.user.findMany({
                where: { managerId: userId },
                select: { id: true },
            })
            const targetUserIds = [userId, ...subordinates.map((s) => s.id)]
            userWhereCondition = { userId: { in: targetUserIds } }
        }
        // admin の場合は条件なし（全ユーザー対象）

        // 指定月の勤怠データを取得
        const attendances = await prisma.attendance.findMany({
            where: {
                ...userWhereCondition, // スコープ条件を適用
                workDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                user: { select: { name: true, email: true } },
                site: { select: { name: true } },
            },
            orderBy: [{ workDate: 'asc' }, { user: { name: 'asc' } }],
        })

        // 分を「時間」表記に変換するヘルパー
        const formatHours = (minutes: number) => {
            if (!minutes) return '0時間0分'
            const h = Math.floor(minutes / 60)
            const m = minutes % 60
            return `${h}時間${m}分`
        }

        // CSVヘッダーの作成
        const headers = ['社員名', 'メールアドレス', '勤務日', '作業現場', 'ステータス', '出勤時刻', '退勤時刻', '休憩時間', '実労働時間', '出勤GPS(緯度, 経度)', '退勤GPS(緯度, 経度)']
        const rows = [headers.join(',')]

        // データ行の作成
        for (const att of attendances) {
            const dateStr = new Date(att.workDate).toLocaleDateString('ja-JP')
            const siteName = att.site?.name || '未選択'
            const inTime = att.clockInTime ? new Date(att.clockInTime).toLocaleTimeString('ja-JP') : '-'
            const outTime = att.clockOutTime ? new Date(att.clockOutTime).toLocaleTimeString('ja-JP') : '-'

            const statusMap: Record<string, string> = {
                working: '勤務中',
                breaking: '休憩中',
                out: '退勤済み',
                finished: '退勤済み',
                not_clocked: '未出勤',
            }
            const statusStr = statusMap[att.status] || att.status
            const breakStr = formatHours(att.breakMinutes)
            const workStr = formatHours(att.workMinutes)

            const inGps = att.clockInLat !== null && att.clockInLng !== null ? `${att.clockInLat}, ${att.clockInLng}` : '-'
            const outGps = att.clockOutLat !== null && att.clockOutLng !== null ? `${att.clockOutLat}, ${att.clockOutLng}` : '-'

            const row = [
                `"${att.user.name}"`,
                `"${att.user.email}"`,
                `"${dateStr}"`,
                `"${siteName}"`,
                `"${statusStr}"`,
                `"${inTime}"`,
                `"${outTime}"`,
                `"${breakStr}"`,
                `"${workStr}"`,
                `"${inGps}"`,
                `"${outGps}"`,
            ]
            rows.push(row.join(','))
        }

        const csvContent = rows.join('\r\n')
        const bom = '\uFEFF'
        const blob = bom + csvContent

        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="attendance_${yearMonth}.csv"`,
            },
        })
    } catch (error) {
        console.error('CSVエクスポートエラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}