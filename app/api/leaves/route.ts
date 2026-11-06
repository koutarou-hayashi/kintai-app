// app/api/leaves/route.ts
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

        // ★ ロールに応じた絞り込み条件（where）の構築
        let whereCondition = {}

        if (role === 'manager') {
            // マネージャーの場合：「自分自身」＋「部下たち（managerIdが自分のID）」の申請に絞る
            const subordinates = await prisma.user.findMany({
                where: { managerId: userId },
                select: { id: true },
            })
            const targetUserIds = [userId, ...subordinates.map((s) => s.id)]
            whereCondition = { userId: { in: targetUserIds } }
        } else if (role === 'employee') {
            // 一般社員は自分の分のみ
            whereCondition = { userId }
        }
        // admin の場合は {} のまま（全件取得）

        const requests = await prisma.leaveRequest.findMany({
            where: whereCondition,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, requests })
    } catch (error) {
        console.error('休暇申請取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }
        const userId = (session.user as any).id
        const body = await request.json()

        const { startDate, endDate, leaveType, reason } = body

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: '開始日と終了日は必須です。' }, { status: 400 })
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                leaveType: leaveType || 'paid',
                reason: reason || '',
                status: 'pending',
            },
        })

        return NextResponse.json({ success: true, leaveRequest })
    } catch (error) {
        console.error('休暇申請作成エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}