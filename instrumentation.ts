// Roda uma vez quando o servidor Next sobe (build, dev e cada instância na
// Vercel), antes de qualquer requisição.
//
// O servidor da Vercel roda em UTC, mas todo o sistema assume o fuso do negócio:
// datas são gravadas como meia-noite local (parseLocalDate) e as telas formatam
// horários com o fuso do processo. Sem isto, o HTML renderizado no servidor traz
// "11:00" onde o navegador em Brasília renderiza "08:00", o React descarta a
// árvore inteira na hidratação (erro #418) e refaz tudo no cliente.
//
// Só no runtime Node: o Edge (middleware) não formata datas e ignora TZ. O Node
// aplica a mudança de process.env.TZ imediatamente às operações de Date.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.env.TZ = 'America/Sao_Paulo'
  }
}
