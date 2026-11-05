// app/api/attendance/route.ts の該当部分（抜粋・統合版）
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
        const { type, lat, lng } = body

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (type === 'in') {
            // 出勤処理
            const attendance = await prisma.attendance.upsert({
                where: { userId_workDate: { userId, workDate: today } },
                update: {
                    clockInTime: new Date(),
                    clockInLat: lat,
                    clockInLng: lng,
                    status: 'working',
                },
                create: {
                    userId,
                    workDate: today,
                    clockInTime: new Date(),
                    clockInLat: lat,
                    clockInLng: lng,
                    status: 'working',
                },
            })
            return NextResponse.json({ success: true, attendance })

        } else if (type === 'out') {
            // 1. 今日の出勤レコードを検索
            const existingAttendance = await prisma.attendance.findUnique({
                where: { userId_workDate: { userId, workDate: today } },
            })

            if (!existingAttendance || !existingAttendance.clockInTime) {
                return NextResponse.json({ success: false, error: '出勤記録が見つかりません。' }, { status: 400 })
            }

            const clockInTime = new Date(existingAttendance.clockInTime)
            const clockOutTime = new Date()

            // 2. 総経過時間（分）を計算
            const diffMs = clockOutTime.getTime() - clockInTime.getTime()
            const grossMinutes = Math.floor(diffMs / (1000 * 60))

            if (grossMinutes < 0) {
                return NextResponse.json({ success: false, error: '退勤時刻が出勤時刻より前になっています。' }, { status: 400 })
            }

            // 3. 労働基準法に基づく休憩時間の自動控除ルール判定
            // 6時間（360分）超〜8時間（480分）以下：45分控除
            // 8時間（480分）超：60分控除
            let breakMinutes = 0
            if (grossMinutes > 480) {
                breakMinutes = 60
            } else if (grossMinutes > 360) {
                breakMinutes = 45
            }

            // 4. 実労働時間（分）の算出
            const workMinutes = Math.max(0, grossMinutes - breakMinutes)

            // 5. データベースを更新
            const attendance = await prisma.attendance.update({
                where: { userId_workDate: { userId, workDate: today } },
                data: {
                    clockOutTime,
                    clockOutLat: lat,
                    clockOutLng: lng,
                    breakMinutes,
                    workMinutes,
                    status: 'finished',
                },
            })

            return NextResponse.json({
                success: true,
                attendance,
                summary: {
                    grossHours: (grossMinutes / 60).toFixed(2),
                    breakMinutes,
                    netWorkHours: (workMinutes / 60).toFixed(2),
                }
            })
        }

        return NextResponse.json({ success: false, error: '無効な打刻タイプです。' }, { status: 400 })
    } catch (error) {
        console.error('打刻エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}