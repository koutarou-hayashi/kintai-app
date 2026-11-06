// app/api/admin/attendances/export/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user || (session.user as any).role !== 'admin') {
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

        // 指定月の勤怠データをユーザー情報および現場情報を含めて取得
        const attendances = await prisma.attendance.findMany({
            where: {
                workDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                user: { select: { name: true, email: true } },
                site: { select: { name: true } }, // ★ 現場情報を追加
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

        // CSVヘッダーの作成（11列）
        const headers = ['社員名', 'メールアドレス', '勤務日', '作業現場', 'ステータス', '出勤時刻', '退勤時刻', '休憩時間', '実労働時間', '出勤GPS(緯度, 経度)', '退勤GPS(緯度, 経度)']
        const rows = [headers.join(',')]

        // データ行の作成
        for (const att of attendances) {
            const dateStr = new Date(att.workDate).toLocaleDateString('ja-JP')
            const siteName = att.site?.name || '未選択' // ★ 現場名（未選択の場合は「未選択」）
            const inTime = att.clockInTime ? new Date(att.clockInTime).toLocaleTimeString('ja-JP') : '-'
            const outTime = att.clockOutTime ? new Date(att.clockOutTime).toLocaleTimeString('ja-JP') : '-'

            const statusMap: Record<string, string> = {
                working: '勤務中',
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
                `"${siteName}"`, // ★ 作業現場
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
        // Excelで開いたときに文字化けしないようにBOM（\uFEFF）を付与
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