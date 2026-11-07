// app/api/attendance/corrections/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// 申請一覧の取得（自分の申請、またはマネージャーなら部下の申請）
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }

        const userId = (session.user as any).id
        const role = (session.user as any).role

        let whereCondition = {}

        if (role === 'manager') {
            // マネージャーの場合：自分＋部下の申請
            const subordinates = await prisma.user.findMany({
                where: { managerId: userId },
                select: { id: true },
            })
            const targetUserIds = [userId, ...subordinates.map((s) => s.id)]
            whereCondition = { userId: { in: targetUserIds } }
        } else if (role === 'employee') {
            // 一般社員：自分の申請のみ
            whereCondition = { userId }
        }
        // admin は全件

        const requests = await prisma.attendanceCorrectionRequest.findMany({
            where: whereCondition,
            include: {
                user: { select: { name: true, email: true } },
                attendance: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, requests })
    } catch (error) {
        console.error('修正申請取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}

// 修正申請の作成（従業員用）
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }

        const userId = (session.user as any).id
        const body = await request.json()
        const { attendanceId, targetDate, newClockInTime, newClockOutTime, newBreakMinutes, reason } = body

        if (!targetDate || !reason) {
            return NextResponse.json({ success: false, error: '対象日と修正理由は必須です。' }, { status: 400 })
        }

        const targetDateObj = new Date(targetDate)
        targetDateObj.setHours(0, 0, 0, 0)

        // ★ attendanceId があればそれを優先し、無ければ日付とユーザーIDで最新のものを検索する
        let targetAttendanceId = attendanceId || null

        if (!targetAttendanceId) {
            const existingAttendance = await prisma.attendance.findFirst({
                where: {
                    userId,
                    workDate: targetDateObj,
                },
                orderBy: { createdAt: 'desc' },
            })
            targetAttendanceId = existingAttendance ? existingAttendance.id : null
        }

        const correctionRequest = await prisma.attendanceCorrectionRequest.create({
            data: {
                userId,
                attendanceId: targetAttendanceId,
                targetDate: targetDateObj,
                newClockInTime: newClockInTime ? new Date(newClockInTime) : null,
                newClockOutTime: newClockOutTime ? new Date(newClockOutTime) : null,
                newBreakMinutes: newBreakMinutes !== undefined ? Number(newBreakMinutes) : null,
                reason,
                status: 'pending',
            },
        })

        return NextResponse.json({ success: true, correctionRequest })
    } catch (error) {
        console.error('修正申請作成エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}