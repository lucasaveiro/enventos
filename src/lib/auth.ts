import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import { AUTH_COOKIE_NAME, verifySessionCookie } from './session'

/**
 * Camada de autorização do lado do servidor (runtime Node).
 *
 * O middleware já barra cookie forjado ou expirado no Edge, mas ele sozinho não
 * basta: não enxerga revogação (logout / sessão apagada no banco) e não deve ser
 * a única linha de defesa das server actions. Aqui a sessão é conferida contra
 * a tabela AdminSession, incluindo o expiresAt persistido.
 *
 * `cache()` memoiza por request, então várias actions no mesmo request fazem
 * uma única consulta.
 */
const loadSession = cache(async (): Promise<{ token: string } | null> => {
  const cookieStore = await cookies()

  // 1) Assinatura + expiração embutida no cookie (barato, sem banco).
  const signed = await verifySessionCookie(cookieStore.get(AUTH_COOKIE_NAME)?.value)
  if (!signed) return null

  // 2) A sessão ainda existe no banco e ainda não venceu?
  const session = await prisma.adminSession.findUnique({
    where: { token: signed.token },
    select: { token: true, expiresAt: true },
  })

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null
  }

  return { token: session.token }
})

export async function validateSession(): Promise<boolean> {
  return (await loadSession()) !== null
}

/**
 * Usar no início de toda server action e de todo componente de servidor que
 * acesse dados. Sem sessão válida, redireciona para /login.
 */
export async function requireAuth(): Promise<void> {
  const valid = await validateSession()
  if (!valid) redirect('/login')
}
