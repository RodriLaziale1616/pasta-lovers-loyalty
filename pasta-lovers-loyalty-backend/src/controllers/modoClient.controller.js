const { randomUUID } = require('crypto')
const prisma = require('../lib/prisma')
const {
  normalizePhone,
  normalizeEmail,
  cleanName,
  isValidParaguayPhone,
} = require('../utils/clientIdentity')

async function registerStaffClient(req, res) {
  try {
    const name = cleanName(req.body.name)
    const phone = normalizePhone(req.body.phone)
    const email = normalizeEmail(req.body.email)

    if (name.length < 2 || !isValidParaguayPhone(phone)) {
      return res.status(400).json({
        ok: false,
        message: 'Ingresá un nombre y un teléfono paraguayo válidos',
      })
    }

    const existingByPhone = await prisma.client.findUnique({ where: { phone } })
    if (existingByPhone) {
      return res.status(409).json({
        ok: false,
        message: 'Ese teléfono ya pertenece a un cliente registrado',
        client: existingByPhone,
      })
    }

    if (email) {
      const existingByEmail = await prisma.client.findUnique({ where: { email } })
      if (existingByEmail) {
        return res.status(409).json({
          ok: false,
          message: 'Ese email ya pertenece a un cliente registrado',
        })
      }
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email,
        uniqueToken: randomUUID(),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    })

    return res.status(201).json({
      ok: true,
      message: 'Cliente creado correctamente',
      client,
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'El teléfono o email ya está registrado' })
    }

    return res.status(500).json({
      ok: false,
      message: 'No se pudo crear el cliente',
      error: error.message,
    })
  }
}

async function listClientPasses(req, res) {
  try {
    const clientId = Number(req.params.id)
    if (!Number.isInteger(clientId)) {
      return res.status(400).json({ ok: false, message: 'Cliente inválido' })
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, isActive: true },
      select: { id: true, name: true, phone: true },
    })

    if (!client) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' })

    const passes = await prisma.pass.findMany({
      where: { clientId },
      include: { product: true },
      orderBy: { purchasedAt: 'desc' },
    })

    return res.json({ ok: true, client, passes })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los pases del cliente',
      error: error.message,
    })
  }
}

module.exports = { registerStaffClient, listClientPasses }
