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

// 現場情報の更新 (PATCH)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // ★ paramsをPromiseに変更
) {
    try {
        if (!(await checkAdmin())) {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const resolvedParams = await params // ★ awaitでアンラップ
        const siteId = resolvedParams.id

        const body = await request.json()
        const { name, address, radiusMeter, isActive } = body

        // 既存の現場情報を取得
        const existingSite = await prisma.site.findUnique({
            where: { id: siteId },
        })

        if (!existingSite) {
            return NextResponse.json({ success: false, error: '対象の現場が見つかりません。' }, { status: 404 })
        }

        let lat = existingSite.latitude
        let lng = existingSite.longitude

        // 住所が変更された場合は、国土地理院APIで緯度経度を再取得
        if (address !== undefined && address !== existingSite.address) {
            if (address) {
                try {
                    const encodeAddr = encodeURIComponent(address)
                    const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeAddr}`)
                    const data = await res.json()

                    if (data && data.length > 0) {
                        const coordinates = data[0].geometry.coordinates
                        lng = coordinates[0]
                        lat = coordinates[1]
                    } else {
                        lat = null
                        lng = null
                    }
                } catch (geoErr) {
                    console.error('国土地理院ジオコーディングエラー:', geoErr)
                }
            } else {
                lat = null
                lng = null
            }
        }

        const updatedSite = await prisma.site.update({
            where: { id: siteId },
            data: {
                name: name !== undefined ? name : existingSite.name,
                address: address !== undefined ? address : existingSite.address,
                latitude: lat,
                longitude: lng,
                radiusMeter: radiusMeter !== undefined ? parseInt(radiusMeter, 10) : existingSite.radiusMeter,
                isActive: isActive !== undefined ? isActive : existingSite.isActive,
            },
        })

        return NextResponse.json({ success: true, site: updatedSite })
    } catch (error) {
        console.error('現場更新エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}