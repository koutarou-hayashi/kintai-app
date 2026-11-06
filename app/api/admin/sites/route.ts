// app/api/admin/sites/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// 管理者権限チェック用のヘルパー
// マネージャー以上（admin または manager）をチェックする関数
async function checkManagerOrAdmin() {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
        return false
    }
    const role = (session.user as any).role
    return role === 'admin' || role === 'manager'
}

export async function GET(request: Request) {
    try {
        if (!(await checkManagerOrAdmin())) {
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

// 現場新規作成（国土地理院APIで住所から自動緯度経度取得）
export async function POST(request: Request) {
    try {
        if (!(await checkManagerOrAdmin())) {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const body = await request.json()
        let { name, address, latitude, longitude, radiusMeter } = body

        if (!name) {
            return NextResponse.json({ success: false, error: '現場名は必須です。' }, { status: 400 })
        }

        let lat = latitude ? parseFloat(latitude) : null
        let lng = longitude ? parseFloat(longitude) : null

        // 緯度経度が未入力で、住所がある場合は「国土地理院API」で自動取得
        if ((lat === null || lng === null) && address) {
            try {
                // ビル名などが含まれているとヒットしにくい場合があるため、スペース等で調整するかそのまま投げる
                const encodeAddr = encodeURIComponent(address)
                const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeAddr}`)
                const data = await res.json()

                if (data && data.length > 0) {
                    // 国土地理院APIは [経度(lng), 緯度(lat)] の順番で返ってくるので注意
                    const coordinates = data[0].geometry.coordinates
                    lng = coordinates[0]
                    lat = coordinates[1]
                }
            } catch (geoErr) {
                console.error('国土地理院ジオコーディングエラー:', geoErr)
            }
        }

        const newSite = await prisma.site.create({
            data: {
                name,
                address: address || null,
                latitude: lat,
                longitude: lng,
                radiusMeter: radiusMeter ? parseInt(radiusMeter, 10) : 100,
                isActive: true,
            },
        })

        return NextResponse.json({ success: true, site: newSite })
    } catch (error) {
        console.error('現場作成エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}