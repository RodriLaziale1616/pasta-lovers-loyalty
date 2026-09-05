const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const existingCount = await prisma.passProduct.count()

  // El catálogo inicial se crea una sola vez. Después, el panel Productos pasa a
  // ser la fuente de configuración para que un deploy nunca pise precios,
  // vigencias, nombres o estados definidos desde el negocio.
  if (existingCount > 0) {
    console.log(`Modo Café Pass: catálogo existente (${existingCount} productos), seed omitido.`)
    return
  }

  await prisma.passProduct.createMany({
    data: [
      {
        name: 'Pase de 10 cafés',
        description: '10 cafés prepagados para disfrutar en Modo Café',
        unitType: 'ITEM',
        initialUnits: 10,
        initialAmount: null,
        salePrice: 120000,
        currency: 'PYG',
        validityDays: 90,
        isGift: false,
        isActive: true,
      },
      {
        name: 'Pase de 10 desayunos',
        description: '10 desayunos prepagados para disfrutar en Modo Café',
        unitType: 'ITEM',
        initialUnits: 10,
        initialAmount: null,
        salePrice: 280000,
        currency: 'PYG',
        validityDays: 90,
        isGift: false,
        isActive: true,
      },
      {
        name: 'Gift Pass · Gs. 150.000',
        description: 'Gs. 150.000 de saldo para regalar y activar después',
        unitType: 'MONEY',
        initialUnits: null,
        initialAmount: 150000,
        salePrice: 150000,
        currency: 'PYG',
        validityDays: 180,
        isGift: true,
        isActive: true,
      },
    ],
  })

  console.log('Modo Café Pass: catálogo inicial creado.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
