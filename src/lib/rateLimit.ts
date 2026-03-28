import { prisma } from './prisma'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

export async function checkLoginRateLimit(
  ip: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS)

  const count = await prisma.loginAttempt.count({
    where: { ip, createdAt: { gte: windowStart } },
  })

  if (count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil(WINDOW_MS / 1000) }
  }

  return { allowed: true }
}

export async function recordLoginAttempt(ip: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { ip } })

  // Cleanup old attempts (older than 24h)
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })
}

export async function clearLoginAttempts(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } })
}
