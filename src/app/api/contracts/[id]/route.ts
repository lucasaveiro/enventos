import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateSession } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const contractId = Number(id)

    if (isNaN(contractId) || contractId <= 0) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const contract = await prisma.manualContract.findUnique({
      where: { id: contractId },
      select: { fileUrl: true, fileName: true },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contrato nao encontrado' }, { status: 404 })
    }

    // Proxy the blob — sessao ja validada acima (middleware + AdminSession)
    const blobResponse = await fetch(contract.fileUrl)
    if (!blobResponse.ok) {
      return NextResponse.json({ error: 'Arquivo indisponivel' }, { status: 502 })
    }

    return new NextResponse(blobResponse.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${contract.fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error proxying contract:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
