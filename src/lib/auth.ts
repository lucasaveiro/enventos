import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_session')?.value
  if (!token) return false

  const session = await prisma.adminSession.findUnique({
    where: { token },
  })

  if (!session || session.expiresAt < new Date()) {
    return false
  }

  return true
}

export async function requireAuth(): Promise<void> {
  const valid = await validateSession()
  if (!valid) redirect('/login')
}
