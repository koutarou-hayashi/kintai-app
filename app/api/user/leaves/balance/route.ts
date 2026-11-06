// app/api/user/leaves/balance/route.ts
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
        console.log('API取得時のセッションuser:', session.user)
        console.log('抽出されたuserId:', userId)

        const now = new Date()

        // 有効期限内の有給付与データを取得
        const grants = await prisma.paidLeaveGrant.findMany({
            where: {
                userId,
                expiredDate: { gte: now }, // まだ失効していないもの
            },
        })

        // 合計付与日数と消化日数を計算
        let totalGranted = 0
        let totalUsed = 0

        for (const grant of grants) {
            totalGranted += grant.daysGranted
            totalUsed += grant.daysUsed
        }

        const remainingDays = totalGranted - totalUsed

        // 承認済みの有給申請件数なども必要に応じて取得
        const approvedLeaves = await prisma.leaveRequest.count({
            where: {
                userId,
                leaveType: 'paid',
                status: 'approved',
            },
        })

        return NextResponse.json({
            success: true,
            balance: {
                totalGranted,
                totalUsed,
                remainingDays,
                approvedCount: approvedLeaves,
            },
        })
    } catch (error) {
        console.error('有給残高取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}