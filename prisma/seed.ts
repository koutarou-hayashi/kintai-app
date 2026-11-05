// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // テスト用の一般社員ユーザーを作成（すでにある場合は上書きせずそのままにする）
    const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            name: 'テスト 太郎',
            role: 'employee', // 一般社員
        },
    })

    // 管理者ユーザーも作っておくと便利です
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            name: '管理者 花子',
            role: 'admin', // 管理者
        },
    })

    console.log('シードデータの登録が完了しました:', { testUser, adminUser })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })