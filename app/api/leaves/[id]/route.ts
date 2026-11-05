// app/api/leaves/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // ← params を Promise 型に修正
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !session.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const adminId = (session.user as any).id

        // ▼ ここで await を使って params をアンラップする！
        const resolvedParams = await params
        const id = resolvedParams.id

        const body = await request.json()
        const { status } = body // 'approved' または 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ success: false, error: '無効なステータスです。' }, { status: 400 })
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status,
                approverId: adminId,
            },
        })

        return NextResponse.json({ success: true, updated })
    } catch (error) {
        console.error('休暇ステータス更新エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}