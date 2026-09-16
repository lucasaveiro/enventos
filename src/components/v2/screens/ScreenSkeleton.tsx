import { Skeleton } from '@/components/v2/ui'

// Esqueleto genérico das telas da v2, usado pelos loading.tsx de cada rota.
// Com os dados vindo do Server Component, ele só aparece enquanto o servidor
// monta a página — não há mais um segundo estado de carregamento depois que a
// tela já está na frente do usuário.
export function ScreenSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="v2-fade">
      <Skeleton className="mb-2 h-7 w-48" />
      <Skeleton className="mb-6 h-4 w-64" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[88px] w-full" />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}
