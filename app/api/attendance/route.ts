// app/api/attendance/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// 2地点の緯度経度から距離（メートル）を計算するヘルパー関数
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // 地球の半径 (メートル)
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // メートル単位の距離
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }

        const userId = (session.user as any).id
        const body = await request.json()
        const { type, lat, lng, siteId } = body

        const now = new Date()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // ★ 現在進行形（まだ退勤していない）のアクティブな勤怠レコードを最新順で1件取得
        let attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                status: { not: 'out' }, // 退勤済みではないもの（working, breaking など）
            },
            orderBy: { createdAt: 'desc' },
            include: { breaks: true },
        })

        if (type === 'in') {
            // すでに進行中のシフトがある場合は新規出勤させない（二重出勤防止）
            if (attendance) {
                return NextResponse.json({ success: false, error: 'すでに勤務中のシフトが存在します。先に退勤を行ってください。' }, { status: 400 })
            }

            if (!siteId) {
                return NextResponse.json({ success: false, error: '作業現場が選択されていません。' }, { status: 400 })
            }

            // 選択された現場の情報を取得
            const site = await prisma.site.findUnique({
                where: { id: siteId },
            })

            if (!site) {
                return NextResponse.json({ success: false, error: '選択された現場が存在しません。' }, { status: 400 })
            }

            // 現場に緯度・経度が設定されている場合のみジオフェンス（範囲）チェックを実施
            if (site.latitude !== null && site.longitude !== null) {
                if (lat === null || lat === undefined || lng === null || lng === undefined) {
                    return NextResponse.json({ success: false, error: '位置情報が取得できませんでした。GPSを有効にしてください。' }, { status: 400 })
                }

                const distance = calculateDistanceMeters(lat, lng, site.latitude, site.longitude)
                const allowedRadius = site.radiusMeter || 100 // デフォルト100m

                if (distance > allowedRadius) {
                    return NextResponse.json({
                        success: false,
                        error: `現場の範囲外から打刻されています。（現場から約${Math.round(distance)}m離れています。許容範囲: ${allowedRadius}m以内）`,
                    }, { status: 400 })
                }
            }

            // ★ 新規の勤務レコードを作成（同日であっても独立したレコードとして追加される）
            attendance = await prisma.attendance.create({
                data: {
                    userId,
                    workDate: today,
                    clockInTime: now,
                    clockInLat: lat || null,
                    clockInLng: lng || null,
                    siteId: siteId,
                    status: 'working',
                },
                include: { breaks: true, site: true },
            })
        } else if (type === 'out') {
            if (!attendance || !attendance.clockInTime) {
                return NextResponse.json({ success: false, error: '勤務中のシフトが見つかりません。' }, { status: 400 })
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

            // 実労働時間の計算
            const totalWorkMs = now.getTime() - new Date(attendance.clockInTime).getTime()
            let totalWorkMinutes = Math.floor(totalWorkMs / (1000 * 60)) - totalBreakMinutes
            if (totalWorkMinutes < 0) totalWorkMinutes = 0

            // 労働基準法に基づく自動休憩控除の適用
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
                    status: 'out', // ステータスを退勤済みに変更
                },
                include: { breaks: true },
            })
        } else if (type === 'break_in') {
            if (!attendance || attendance.status !== 'working') {
                return NextResponse.json({ success: false, error: '勤務中ではありません。' }, { status: 400 })
            }
            const activeBreak = attendance.breaks.find((b) => !b.breakEnd)
            if (activeBreak) {
                return NextResponse.json({ success: false, error: 'すでに休憩中です。' }, { status: 400 })
            }

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
            if (!attendance || attendance.status !== 'breaking') {
                return NextResponse.json({ success: false, error: '休憩中ではありません。' }, { status: 400 })
            }
            const activeBreak = attendance.breaks.find((b) => !b.breakEnd)
            if (!activeBreak) {
                return NextResponse.json({ success: false, error: '進行中の休憩が見つかりません。' }, { status: 400 })
            }

            const diffMs = now.getTime() - new Date(activeBreak.breakStart).getTime()
            const diffMinutes = Math.floor(diffMs / (1000 * 60))

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