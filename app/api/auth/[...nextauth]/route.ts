// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import { prisma } from "@/lib/prisma"

export const authOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
        }),
    ],
    callbacks: {
        // 1. サインイン時にデータベースへユーザーを自動登録・同期する
        async signIn({ user }: { user: any }) {
            if (!user.email) return false

            try {
                await prisma.user.upsert({
                    where: { email: user.email },
                    update: { name: user.name || '社内ユーザー' },
                    create: {
                        email: user.email,
                        name: user.name || '社内ユーザー',
                        role: 'employee', // デフォルトは一般社員
                    },
                })
                return true
            } catch (error) {
                console.error("ユーザー認証・同期エラー:", error)
                return false
            }
        },
        // 2. ログイン中のメールアドレスからDBのユーザーIDを引いてJWTトークンに格納する
        async jwt({ token }: { token: any }) {
            if (token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email },
                })
                if (dbUser) {
                    token.id = dbUser.id
                    token.role = dbUser.role
                }
            }
            return token
        },
        // 3. クライアント側のセッションで id と role が使えるようにする
        async session({ session, token }: { session: any; token: any }) {
            if (session.user) {
                session.user.id = token.id
                session.user.role = token.role
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }