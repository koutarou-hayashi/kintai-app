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

        const whereCondition = role === 'admin' ? {} : { userId }

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

        // ▼ ここで body から leaveType をしっかり受け取るように修正！
        const { startDate, endDate, leaveType, reason } = body

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: '開始日と終了日は必須です。' }, { status: 400 })
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                leaveType: leaveType || 'paid', // 取得した leaveType を使用
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