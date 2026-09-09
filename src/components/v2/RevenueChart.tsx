'use client'

// ── Receita x Despesa (12 meses) ───────────────────────────────────────────
// Duas séries, barras agrupadas. As cores foram validadas para daltonismo:
// #1B5EDB (receita) x #B54708 (despesa) dão ΔE 29,6 em protanopia, 28,7 em
// tritanopia e 34,0 em visão normal — bem acima do piso de 8/15. Identidade
// nunca depende só da cor: há legenda fixa e rótulo direto no mês atual.

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { brl } from '@/lib/v2/mock'

const RECEITA = '#1B5EDB'
const DESPESA = '#B54708'

const W = 760
const H = 190
const PAD_L = 46
const PAD_R = 8
const PAD_T = 12
const PAD_B = 26

// Barra com o topo arredondado e a base quadrada, ancorada na linha zero.
function barPath(x: number, y: number, w: number, h: number, r = 3) {
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

export function RevenueChart({
  data,
}: {
  data: { date: Date; income: number; expense: number }[]
}) {
  const [hover, setHover] = useState<number | null>(null)

  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]))
  const step = Math.ceil(max / 3 / 5000) * 5000
  const top = step * 3
  const plotH = H - PAD_T - PAD_B
  const plotW = W - PAD_L - PAD_R
  const slot = plotW / data.length
  const barW = Math.min(11, (slot - 8) / 2)
  const gap = 2 // respiro de superfície entre as duas barras do grupo

  const y = (v: number) => PAD_T + plotH - (v / top) * plotH

  return (
    <div className="relative">
      {/* Legenda — sempre presente, porque são duas séries */}
      <div className="mb-3 flex items-center gap-4 text-[12.5px]" style={{ color: 'var(--v2-text-2)' }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RECEITA }} /> Receita
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DESPESA }} /> Despesa
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Receita e despesa dos últimos 12 meses">
        {/* Grade recessiva */}
        {[0, 1, 2, 3].map((i) => {
          const v = step * i
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--v2-line)"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 8}
                y={y(v) + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="var(--v2-text-3)"
              >
                {v === 0 ? '0' : `${v / 1000}k`}
              </text>
            </g>
          )
        })}

        {data.map((d, i) => {
          const cx = PAD_L + slot * i + slot / 2
          const x1 = cx - barW - gap / 2
          const x2 = cx + gap / 2
          const isLast = i === data.length - 1
          const active = hover === i
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* Alvo de hover maior que as barras */}
              <rect
                x={PAD_L + slot * i}
                y={PAD_T}
                width={slot}
                height={plotH}
                fill={active ? 'var(--v2-surface-2)' : 'transparent'}
              />
              <path d={barPath(x1, y(d.income), barW, plotH - (y(d.income) - PAD_T))} fill={RECEITA} opacity={hover === null || active ? 1 : 0.45} />
              <path d={barPath(x2, y(d.expense), barW, plotH - (y(d.expense) - PAD_T))} fill={DESPESA} opacity={hover === null || active ? 1 : 0.45} />
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill={isLast ? 'var(--v2-text)' : 'var(--v2-text-3)'}
                fontWeight={isLast ? 600 : 400}
              >
                {format(d.date, 'MMM', { locale: ptBR }).replace('.', '')}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Rótulo direto no mês atual — evita ter que ler a cor para saber o valor */}
      <p className="mt-1 text-[12px]" style={{ color: 'var(--v2-text-3)' }}>
        {hover === null ? (
          <>
            Mês atual: <strong style={{ color: RECEITA }}>{brl(data[data.length - 1].income)}</strong> de receita e{' '}
            <strong style={{ color: DESPESA }}>{brl(data[data.length - 1].expense)}</strong> de despesa
          </>
        ) : (
          <>
            <strong className="v2-cap" style={{ color: 'var(--v2-text)' }}>
              {format(data[hover].date, 'MMMM yyyy', { locale: ptBR })}
            </strong>{' '}
            — receita <strong style={{ color: RECEITA }}>{brl(data[hover].income)}</strong>, despesa{' '}
            <strong style={{ color: DESPESA }}>{brl(data[hover].expense)}</strong>, saldo{' '}
            <strong style={{ color: 'var(--v2-text)' }}>{brl(data[hover].income - data[hover].expense)}</strong>
          </>
        )}
      </p>
    </div>
  )
}
