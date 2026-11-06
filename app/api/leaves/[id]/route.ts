// app/api/leaves/[id]/route.ts
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
        if (!session || !session.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        const adminId = (session.user as any).id
        const resolvedParams = await params
        const id = resolvedParams.id

        const body = await request.json()
        const { status } = body // 'approved' または 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ success: false, error: '無効なステータスです。' }, { status: 400 })
        }

        // 該当する申請データを取得
        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id },
        })

        if (!leaveRequest) {
            return NextResponse.json({ success: false, error: '申請データが見つかりません。' }, { status: 404 })
        }

        // すでに承認済み、または否認済みの場合は再処理しない
        if (leaveRequest.status !== 'pending') {
            return NextResponse.json({ success: false, error: 'この申請はすでに処理されています。' }, { status: 400 })
        }

        // トランザクション処理（ステータス更新と有給消化の減算を安全に同期）
        const result = await prisma.$transaction(async (tx) => {
            // 1. 申請ステータスを更新
            const updated = await tx.leaveRequest.update({
                where: { id },
                data: {
                    status,
                    approverId: adminId,
                },
            })

            // 2. 「承認」かつ「有休関連（paid, half_am, half_pm）」の場合のみ残高を減算
            if (status === 'approved' && ['paid', 'half_am', 'half_pm'].includes(leaveRequest.leaveType)) {
                // 消費日数を計算（全日は1.0日、半休は0.5日）
                let daysToDeduct = leaveRequest.leaveType === 'paid' ? 1.0 : 0.5

                // 日数が複数日にわたる場合（例: startDate 〜 endDate が 2日間）はその日数分を掛ける
                const start = new Date(leaveRequest.startDate)
                const end = new Date(leaveRequest.endDate)
                const diffTime = Math.abs(end.getTime() - start.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                daysToDeduct = daysToDeduct * diffDays

                // 従業員の有効な有給付与データを「有効期限が近い順（古い順）」に取得
                const grants = await tx.paidLeaveGrant.findMany({
                    where: {
                        userId: leaveRequest.userId,
                        expiredDate: { gte: new Date() },
                    },
                    orderBy: { expiredDate: 'asc' },
                })

                // 各付与データの残り（daysGranted - daysUsed）を確認しながら順に消化していく
                for (const grant of grants) {
                    if (daysToDeduct <= 0) break

                    const availableInThisGrant = grant.daysGranted - grant.daysUsed
                    if (availableInThisGrant <= 0) continue

                    const deductFromThis = Math.min(availableInThisGrant, daysToDeduct)

                    await tx.paidLeaveGrant.update({
                        where: { id: grant.id },
                        data: {
                            daysUsed: grant.daysUsed + deductFromThis,
                        },
                    })

                    daysToDeduct -= deductFromThis
                }

                // もし保有残高の合計が足りない場合のエラーハンドリングが必要ならここで弾くことも可能
                if (daysToDeduct > 0) {
                    throw new Error('有給休暇の保有残高が不足しています。')
                }
            }

            return updated
        })

        return NextResponse.json({ success: true, updated: result })
    } catch (error: any) {
        console.error('休暇ステータス更新エラー:', error)
        return NextResponse.json({ success: false, error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}