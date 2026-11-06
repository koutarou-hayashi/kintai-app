// app/api/admin/attendances/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        // 1. 認証チェック & 権限チェック（admin または manager）
        if (!session || !session.user) {
            return NextResponse.json({ success: false, error: 'ログインしていません。' }, { status: 401 })
        }

        const userId = (session.user as any).id
        const role = (session.user as any).role
        if (role !== 'admin' && role !== 'manager') {
            return NextResponse.json({ success: false, error: '権限がありません。' }, { status: 403 })
        }

        // 本日の日付（00:00:00）を算出
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // ★ 2. ロールに応じたユーザー取得の絞り込み条件（where）を構築
        let userWhereCondition = {}

        if (role === 'manager') {
            // マネージャーの場合：「自分自身」＋「部下たち（managerIdが自分のIDのユーザー）」を取得対象にする
            const subordinates = await prisma.user.findMany({
                where: { managerId: userId },
                select: { id: true },
            })
            const targetUserIds = [userId, ...subordinates.map((s) => s.id)]
            userWhereCondition = { id: { in: targetUserIds } }
        }
        // admin の場合は {} のまま（全ユーザー対象）

        // 3. 対象ユーザーと本日の打刻データ（および現場情報）を紐づけて取得
        const usersWithAttendance = await prisma.user.findMany({
            where: userWhereCondition, // ★ ここでスコープを適用
            include: {
                attendances: {
                    where: {
                        workDate: today,
                    },
                    include: {
                        site: true, // 現場情報
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        // フロントエンドで扱いやすい形に整形
        const formatMinutes = (minutes: number) => {
            if (!minutes || minutes === 0) return '-'
            const h = Math.floor(minutes / 60)
            const m = minutes % 60
            return h > 0 ? `${h}時間${m}分` : `${m}分`
        }

        const list = usersWithAttendance.map((user) => {
            const att = user.attendances[0] || null
            const breakMins = att?.breakMinutes || 0
            const workMins = att?.workMinutes || 0

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                siteName: att?.site?.name || '未選択',
                status: att ? att.status : 'not_clocked',
                clockInTime: att?.clockInTime ? new Date(att.clockInTime).toLocaleTimeString('ja-JP') : '-',
                clockOutTime: att?.clockOutTime ? new Date(att.clockOutTime).toLocaleTimeString('ja-JP') : '-',
                clockInLat: att?.clockInLat !== null && att?.clockInLat !== undefined ? Number(att.clockInLat) : null,
                clockInLng: att?.clockInLng !== null && att?.clockInLng !== undefined ? Number(att.clockInLng) : null,
                clockOutLat: att?.clockOutLat !== null && att?.clockOutLat !== undefined ? Number(att.clockOutLat) : null,
                clockOutLng: att?.clockOutLng !== null && att?.clockOutLng !== undefined ? Number(att.clockOutLng) : null,
                breakMinutes: breakMins,
                workMinutes: workMins,
                breakFormatted: formatMinutes(breakMins),
                workFormatted: formatMinutes(workMins),
            }
        })

        return NextResponse.json({ success: true, list })
    } catch (error) {
        console.error('管理者データ取得エラー:', error)
        return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました。' }, { status: 500 })
    }
}