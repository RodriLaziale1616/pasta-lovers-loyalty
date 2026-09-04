const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const products = [
    {
      name: 'Coffee Pass 10',
      description: '10 cafes prepagados para usar en Modo Cafe',
      unitType: 'ITEM',
      initialUnits: 10,
      salePrice: 120000,
      currency: 'PYG',
      validityDays: 90,
    },
    {
      name: 'Breakfast Pass 10',
      description: '10 desayunos prepagados para usar en Modo Cafe',
      unitType: 'ITEM',
      initialUnits: 10,
      salePrice: 280000,
      currency: 'PYG',
      validityDays: 90,
    },
    {
      name: 'Gift Pass 150.000',
      description: 'Saldo prepago para consumos libres en Modo Cafe',
      unitType: 'MONEY',
      initialAmount: 150000,
      salePrice: 150000,
      currency: 'PYG',
      validityDays: 180,
    },
  ]

  for (const product of products) {
    const existing = await prisma.passProduct.findFirst({ where: { name: product.name } })
    if (!existing) await prisma.passProduct.create({ data: product })
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
