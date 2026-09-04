const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function upsertProduct(product, aliases = []) {
  const names = [product.name, ...aliases]
  const existing = await prisma.passProduct.findFirst({
    where: { name: { in: names } },
  })

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
      product: {
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
      aliases: ['Coffee Pass 10'],
    },
    {
      product: {
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
      aliases: ['Breakfast Pass 10'],
    },
    {
      product: {
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
      aliases: ['Gift Pass 150.000'],
    },
  ]

  for (const item of products) {
    await upsertProduct(item.product, item.aliases)
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
