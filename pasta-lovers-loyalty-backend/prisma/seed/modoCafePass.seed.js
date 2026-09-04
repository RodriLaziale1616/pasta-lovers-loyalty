const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function upsertProduct(product) {
  const existing = await prisma.passProduct.findFirst({ where: { name: product.name } })

  if (existing) {
    await prisma.passProduct.update({
      where: { id: existing.id },
      data: product,
    })
    return
  }

  await prisma.passProduct.create({ data: product })
}

async function main() {
  const products = [
    {
      name: 'Coffee Pass 10',
      description: '10 cafés prepagados para usar en Modo Café',
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
      name: 'Breakfast Pass 10',
      description: '10 desayunos prepagados para usar en Modo Café',
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
      name: 'Gift Pass 150.000',
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
  ]

  for (const product of products) {
    await upsertProduct(product)
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
