const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const email = String(process.env.MODO_ADMIN_EMAIL || '').trim().toLowerCase()
  const plainPassword = String(process.env.MODO_ADMIN_PASSWORD || '')
  const name = String(process.env.MODO_ADMIN_NAME || 'Administrador Modo Café').trim()

  if (!email || !plainPassword) {
    console.log('Modo Café admin seed omitido: faltan MODO_ADMIN_EMAIL/MODO_ADMIN_PASSWORD')
    return
  }

  if (plainPassword.length < 12) {
    throw new Error('MODO_ADMIN_PASSWORD debe tener al menos 12 caracteres')
  }

  const existingUser = await prisma.staffUser.findUnique({ where: { email } })
  if (existingUser) {
    console.log('Modo Café admin ya existe:', email)
    return
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12)
  await prisma.staffUser.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'OWNER',
      isActive: true,
    },
  })

  console.log('Modo Café admin creado:', email)
}

main()
  .catch((error) => {
    console.error('Error creando admin Modo Café:', error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
