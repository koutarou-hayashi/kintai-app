// app/api/attendance/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }

        const userId = (session.user as any).id
        const body = await request.json()
        const { type, lat, lng, siteId } = body

        // 今日の日付（00:00:00）を取得
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // 本日の勤怠レコードを取得
        let attendance = await prisma.attendance.findUnique({
            where: { userId_workDate: { userId, workDate: today } },
            include: { breaks: true },
        })

        const now = new Date()

        if (type === 'in') {
            if (attendance && attendance.clockInTime) {
                return NextResponse.json({ success: false, error: 'すでに本日は出勤打刻済みです。' }, { status: 400 })
            }

            // ★ 出勤時に現場が選択されているか、またはデータがあるかチェック
            if (!siteId) {
                return NextResponse.json({ success: false, error: '作業現場が選択されていません。' }, { status: 400 })
            }

            attendance = await prisma.attendance.upsert({
                where: { userId_workDate: { userId, workDate: today } },
                update: {
                    clockInTime: now,
                    clockInLat: lat || null,
                    clockInLng: lng || null,
                    siteId: siteId, // ★ 現場IDを保存
                    status: 'working',
                },
                create: {
                    userId,
                    workDate: today,
                    clockInTime: now,
                    clockInLat: lat || null,
                    clockInLng: lng || null,
                    siteId: siteId, // ★ 現場IDを保存
                    status: 'working',
                },
                include: { breaks: true, site: true }, // 必要に応じて現場情報もレスポンスに含める
            })
        } else if (type === 'out') {
            if (!attendance || !attendance.clockInTime) {
                return NextResponse.json({ success: false, error: '出勤打刻がされていません。' }, { status: 400 })
            }
            if (attendance.clockOutTime) {
                return NextResponse.json({ success: false, error: 'すでに退勤打刻済みです。' }, { status: 400 })
            }

            // もし休憩中のまま退勤しようとした場合は未終了の休憩を強制終了する
            const activeBreak = attendance.breaks.find((b) => !b.breakEnd)
            let additionalBreakMinutes = 0
            if (activeBreak) {
                const diffMs = now.getTime() - new Date(activeBreak.breakStart).getTime()
                additionalBreakMinutes = Math.floor(diffMs / (1000 * 60))
                await prisma.break.update({
                    where: { id: activeBreak.id },
                    data: { breakEnd: now },
                })
            }

            const totalBreakMinutes = attendance.breakMinutes + additionalBreakMinutes

            // 実労働時間の計算（出勤から退勤までの総分数 - 休憩総分数）
            const totalWorkMs = now.getTime() - new Date(attendance.clockInTime).getTime()
            let totalWorkMinutes = Math.floor(totalWorkMs / (1000 * 60)) - totalBreakMinutes
            if (totalWorkMinutes < 0) totalWorkMinutes = 0

            // 労働基準法に基づく自動休憩控除の適用例（例: 8時間超なら60分、6時間超なら45分を最低保証など、必要に応じて）
            let finalBreakMinutes = totalBreakMinutes
            if (totalWorkMinutes + totalBreakMinutes > 360 && totalBreakMinutes < 45) {
                finalBreakMinutes = 45
            }
            if (totalWorkMinutes + totalBreakMinutes > 480 && totalBreakMinutes < 60) {
                finalBreakMinutes = 60
            }
            const netWorkMinutes = Math.max(0, (totalWorkMinutes + totalBreakMinutes) - finalBreakMinutes)

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    clockOutTime: now,
                    clockOutLat: lat || null,
                    clockOutLng: lng || null,
                    breakMinutes: finalBreakMinutes,
                    workMinutes: netWorkMinutes,
                    status: 'finished',
                },
                include: { breaks: true },
            })
        } else if (type === 'break_in') {
            if (!attendance || !attendance.clockInTime || attendance.clockOutTime) {
                return NextResponse.json({ success: false, error: '勤務中ではありません。' }, { status: 400 })
            }
            // すでに休憩中（breakEndがnullのレコードがある）かチェック
            const activeBreak = attendance.breaks.find((b) => !b.breakEnd)
            if (activeBreak) {
                return NextResponse.json({ success: false, error: 'すでに休憩中です。' }, { status: 400 })
            }

            // 新しい休憩レコードを作成
            await prisma.break.create({
                data: {
                    attendanceId: attendance.id,
                    breakStart: now,
                },
            })

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: { status: 'breaking' },
                include: { breaks: true },
            })
        } else if (type === 'break_out') {
            if (!attendance) {
                return NextResponse.json({ success: false, error: '勤怠データが見つかりません。' }, { status: 400 })
            }
            // 進行中の休憩を探す
            const activeBreak = attendance.breaks.find((b) => !b.breakEnd)
            if (!activeBreak) {
                return NextResponse.json({ success: false, error: '休憩中ではありません。' }, { status: 400 })
            }

            const diffMs = now.getTime() - new Date(activeBreak.breakStart).getTime()
            const diffMinutes = Math.floor(diffMs / (1000 * 60))

            // 休憩を終了し、累積の breakMinutes を更新
            await prisma.break.update({
                where: { id: activeBreak.id },
                data: { breakEnd: now },
            })

            const newBreakMinutes = attendance.breakMinutes + diffMinutes

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    breakMinutes: newBreakMinutes,
                    status: 'working',
                },
                include: { breaks: true },
            })
        }

        return NextResponse.json({ success: true, attendance })
    } catch (error) {
        console.error('打刻エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}