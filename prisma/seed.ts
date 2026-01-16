import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  // Create Spaces
  const spaces = [
    { name: 'Salão de Festas', active: true },
    { name: 'Chácara', active: true },
  ]

  const countSpaces = await prisma.space.count()
  if (countSpaces === 0) {
      await prisma.space.createMany({
          data: spaces
      })
      console.log('Spaces created')
  }

  // Service Types
  const serviceTypes = [
    { name: 'Limpeza', description: 'Limpeza geral do espaço' },
    { name: 'Jardinagem', description: 'Manutenção do jardim' },
    { name: 'Piscina', description: 'Limpeza e tratamento da piscina' },
    { name: 'Manutenção Geral', description: 'Reparos e manutenção' },
  ]

  const countServices = await prisma.serviceType.count()
  if (countServices === 0) {
      await prisma.serviceType.createMany({
          data: serviceTypes
      })
      console.log('ServiceTypes created')
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
