import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const eventIdStr = formData.get('eventId') as string | null
    const notes = formData.get('notes') as string | null

    if (!file || !eventIdStr) {
      return NextResponse.json(
        { success: false, error: 'Arquivo e evento sao obrigatorios' },
        { status: 400 }
      )
    }

    const eventId = Number(eventIdStr)
    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: 'ID do evento invalido' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Apenas arquivos PDF sao permitidos' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'O arquivo deve ter no maximo 5MB' },
        { status: 400 }
      )
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Evento nao encontrado' },
        { status: 404 }
      )
    }

    // Upload to Vercel Blob
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blob = await put(`contracts/manual/${eventId}/${timestamp}-${safeName}`, file, {
      access: 'public',
    })

    // Create database record
    const manualContract = await prisma.manualContract.create({
      data: {
        fileName: file.name,
        fileUrl: blob.url,
        fileSize: file.size,
        notes: notes || null,
        eventId,
      },
    })

    // Update event contract status if not already signed via Clicksign
    await prisma.event.updateMany({
      where: {
        id: eventId,
        contractStatus: { in: ['not_sent'] },
      },
      data: { contractStatus: 'signed' },
    })

    revalidatePath('/')
    revalidatePath('/events')
    revalidatePath(`/events/${eventId}`)

    return NextResponse.json({
      success: true,
      data: {
        id: manualContract.id,
        fileName: manualContract.fileName,
        fileUrl: manualContract.fileUrl,
      },
    })
  } catch (error) {
    console.error('Error uploading manual contract:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar contrato' },
      { status: 500 }
    )
  }
}
