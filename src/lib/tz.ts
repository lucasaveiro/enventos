// ── Fuso do processo no servidor ───────────────────────────────────────────
// O servidor da Vercel roda em UTC, mas todo o sistema assume o fuso do
// negócio: datas são gravadas como meia-noite local (parseLocalDate) e as
// telas formatam horários com o fuso do processo. Sem isto, o HTML gerado no
// servidor traz "11:00" onde o navegador em Brasília renderiza "08:00", e o
// React descarta a árvore inteira na hidratação (erro #418).
//
// Fica em módulo, e não em instrumentation.ts: na Vercel o hook register() não
// chegou a rodar antes das requisições (medido nos logs em 16/09/2026). Este
// módulo é importado pelo layout raiz e por lib/auth, então é avaliado antes
// de qualquer render ou action no runtime Node. O Edge (middleware) não formata
// datas e ignora TZ. O Node aplica a mudança de process.env.TZ na hora.
const TZ = 'America/Sao_Paulo'

if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'nodejs' && process.env.TZ !== TZ) {
  process.env.TZ = TZ
}

export {}
