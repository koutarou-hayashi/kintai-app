// app/api/admin/sites/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || (session.user as any).role !== 'admin') {
        return false
    }
    return true
}

// 現場の更新（表示・非表示の切り替え含む）
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!(await checkAdmin())) {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const resolvedParams = await params
        const id = resolvedParams.id
        const body = await request.json()

        const updatedSite = await prisma.site.update({
            where: { id },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.address !== undefined && { address: body.address }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
            },
        })

        return NextResponse.json({ success: true, site: updatedSite })
    } catch (error) {
        console.error('現場更新エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}