// app/api/admin/sites/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// 管理者権限チェック用のヘルパー
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || (session.user as any).role !== 'admin') {
        return false
    }
    return true
}

// 現場一覧取得（管理者は非表示も含めて全て取得可能にする場合）
export async function GET(request: Request) {
    try {
        if (!(await checkAdmin())) {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const onlyActive = searchParams.get('active') === 'true'

        const where = onlyActive ? { isActive: true } : {}

        const sites = await prisma.site.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ success: true, sites })
    } catch (error) {
        console.error('現場一覧取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}

// 現場新規作成
export async function POST(request: Request) {
    try {
        if (!(await checkAdmin())) {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const body = await request.json()
        const { name, address, latitude, longitude, radiusMeter } = body

        if (!name) {
            return NextResponse.json({ success: false, error: '現場名は必須です。' }, { status: 400 })
        }

        const newSite = await prisma.site.create({
            data: {
                name,
                address: address || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                radiusMeter: radiusMeter ? parseInt(radiusMeter) : 100,
                isActive: true,
            },
        })

        return NextResponse.json({ success: true, site: newSite })
    } catch (error) {
        console.error('現場作成エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}