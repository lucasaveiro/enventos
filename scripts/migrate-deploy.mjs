// Roda `prisma migrate deploy` pela conexão DIRETA do Neon, não pelo pooler.
//
// O Prisma Migrate protege a migração com um lock de sessão no Postgres
// (pg_advisory_lock). Pelo PgBouncer em modo transação, a sessão do servidor
// volta ao pool com o lock ainda preso quando o cliente desconecta — e todo
// build seguinte espera 10s e falha com P1002 até aquela sessão ser reciclada.
// Foi o que derrubou dois deploys em 16/09/2026.
//
// O Neon expõe o host direto sem o sufixo "-pooler". As migrações usam ele;
// a aplicação continua no pooler (DATABASE_URL intacta). Sem "-pooler" no host
// (outro provedor, banco local), roda como está.
import { spawnSync } from 'node:child_process'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('migrate-deploy: DATABASE_URL não definida')
  process.exit(1)
}

const direct = new URL(url)
if (direct.hostname.includes('-pooler')) {
  direct.hostname = direct.hostname.replace('-pooler', '')
  console.log(`migrate-deploy: usando a conexão direta (${direct.hostname})`)
}

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: direct.toString() },
})
process.exit(result.status ?? 1)
