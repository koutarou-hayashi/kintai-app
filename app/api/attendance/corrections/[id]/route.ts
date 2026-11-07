// app/api/attendance/corrections/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }

        const role = (session.user as any).role
        if (role !== 'admin' && role !== 'manager') {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const currentUserId = (session.user as any).id
        const resolvedParams = await params
        const id = resolvedParams.id

        const body = await request.json()
        const { status } = body // 'approved' または 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ success: false, error: '無効なステータスです。' }, { status: 400 })
        }

        // 該当の修正申請を取得（申請者のユーザー情報も一緒に取得してスコープ確認）
        const correctionRequest = await prisma.attendanceCorrectionRequest.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        managerId: true,
                    },
                },
            },
        })

        if (!correctionRequest) {
            return NextResponse.json({ success: false, error: '修正申請が見つかりません。' }, { status: 404 })
        }

        // マネージャーの場合のスコープチェック（自分の部下、または自分自身の申請でなければ弾く）
        if (role === 'manager') {
            const isSelf = correctionRequest.userId === currentUserId
            const isSubordinate = correctionRequest.user.managerId === currentUserId

            if (!isSelf && !isSubordinate) {
                return NextResponse.json({ success: false, error: '自チームのメンバー以外の申請は承認・否認できません。' }, { status: 403 })
            }
        }

        // すでに処理済みの場合は再処理しない
        if (correctionRequest.status !== 'pending') {
            return NextResponse.json({ success: false, error: 'この申請はすでに処理されています。' }, { status: 400 })
        }

        // トランザクション処理（申請ステータス更新 ＆ 勤怠データの反映）
        const result = await prisma.$transaction(async (tx) => {
            // 1. 修正申請のステータスと承認者を更新
            const updatedRequest = await tx.attendanceCorrectionRequest.update({
                where: { id },
                data: {
                    status,
                    approverId: currentUserId,
                },
            })

            // 2. 「承認（approved）」の場合のみ、実際の勤怠データを反映・上書きする
            if (status === 'approved') {
                const { userId, targetDate, newClockInTime, newClockOutTime, newBreakMinutes } = correctionRequest

                // 勤務時間（分）の再計算が必要な場合の簡易ロジック
                let workMinutes = 0
                if (newClockInTime && newClockOutTime) {
                    const diffMs = new Date(newClockOutTime).getTime() - new Date(newClockInTime).getTime()
                    const totalMinutes = Math.floor(diffMs / (1000 * 60))
                    const breakMins = newBreakMinutes ?? 0
                    workMinutes = Math.max(0, totalMinutes - breakMins)
                }

                // 既存の勤怠データがあるか確認
                const existingAttendance = await tx.attendance.findUnique({
                    where: {
                        userId_workDate: {
                            userId,
                            workDate: targetDate,
                        },
                    },
                })

                if (existingAttendance) {
                    // 既存データがある場合は上書き更新
                    await tx.attendance.update({
                        where: { id: existingAttendance.id },
                        data: {
                            ...(newClockInTime !== null && { clockInTime: newClockInTime }),
                            ...(newClockOutTime !== null && { clockOutTime: newClockOutTime }),
                            ...(newBreakMinutes !== null && { breakMinutes: newBreakMinutes }),
                            ...(newClockOutTime !== null && { workMinutes, status: 'out' }),
                        },
                    })
                } else {
                    // 該当日の勤怠データがまだ無い場合は新規作成
                    await tx.attendance.create({
                        data: {
                            userId,
                            workDate: targetDate,
                            clockInTime: newClockInTime,
                            clockOutTime: newClockOutTime,
                            breakMinutes: newBreakMinutes ?? 0,
                            workMinutes,
                            status: newClockOutTime ? 'out' : 'working',
                        },
                    })
                }
            }

            return updatedRequest
        })

        return NextResponse.json({ success: true, updated: result })
    } catch (error: any) {
        console.error('修正申請ステータス更新エラー:', error)
        return NextResponse.json({ success: false, error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}