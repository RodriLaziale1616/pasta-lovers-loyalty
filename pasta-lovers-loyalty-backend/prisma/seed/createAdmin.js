const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pastalovers.com';
  const plainPassword = 'admin123';

  const existingUser = await prisma.staffUser.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('El usuario admin ya existe');
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.staffUser.create({
    data: {
      name: 'Admin Pasta Lovers',
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Usuario admin creado:', {
    email: user.email,
    password: plainPassword,
  });
}

main()
  .catch((error) => {
    console.error('Error creando admin:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });