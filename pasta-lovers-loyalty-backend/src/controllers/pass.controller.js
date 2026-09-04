const { randomBytes, randomUUID, createHash } = require('crypto')
const prisma = require('../lib/prisma')
const {
  normalizePhone,
  normalizeEmail,
  cleanName,
  isValidParaguayPhone,
} = require('../utils/clientIdentity')

function parsePositiveInt(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function hashToken(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function passExpiry(validityDays) {
  return validityDays
    ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
    : null
}

async function listProducts(req, res) {
  try {
    const products = await prisma.passProduct.findMany({
      where: { isActive: true },
      orderBy: [{ isGift: 'asc' }, { createdAt: 'desc' }],
    })
    return res.json({ ok: true, products })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al listar pases', error: error.message })
  }
}

async function createProduct(req, res) {
  try {
    const {
      name,
      description,
      unitType = 'ITEM',
      initialUnits,
      initialAmount,
      salePrice,
      currency = 'PYG',
      validityDays,
      isGift = false,
    } = req.body
    const price = parsePositiveInt(salePrice)

    if (!name || !price || !['ITEM', 'MONEY'].includes(unitType)) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre, precio y tipo de pase válidos son requeridos',
      })
    }

    const units = unitType === 'ITEM' ? parsePositiveInt(initialUnits) : null
    const amount = unitType === 'MONEY' ? parsePositiveInt(initialAmount) : null
    if ((unitType === 'ITEM' && !units) || (unitType === 'MONEY' && !amount)) {
      return res.status(400).json({ ok: false, message: 'El saldo inicial del pase es inválido' })
    }

    const product = await prisma.passProduct.create({
      data: {
        name: cleanName(name),
        description: description?.trim() || null,
        unitType,
        initialUnits: units,
        initialAmount: amount,
        salePrice: price,
        currency,
        validityDays: validityDays ? parsePositiveInt(validityDays) : null,
        isGift: Boolean(isGift),
      },
    })
    return res.status(201).json({ ok: true, product })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al crear el tipo de pase', error: error.message })
  }
}

async function issuePass(req, res) {
  try {
    const productId = Number(req.body.productId)
    const clientId = req.body.clientId == null ? null : Number(req.body.clientId)
    const unassignedGift = Boolean(req.body.unassignedGift)

    if (!Number.isInteger(productId)) {
      return res.status(400).json({ ok: false, message: 'Tipo de pase requerido' })
    }

    const product = await prisma.passProduct.findFirst({
      where: { id: productId, isActive: true },
    })
    if (!product) return res.status(404).json({ ok: false, message: 'Tipo de pase no encontrado' })

    if (unassignedGift && !product.isGift) {
      return res.status(400).json({
        ok: false,
        message: 'Solo los productos Gift pueden venderse sin destinatario',
      })
    }

    let client = null
    if (!unassignedGift) {
      if (!Number.isInteger(clientId)) {
        return res.status(400).json({ ok: false, message: 'Seleccioná un cliente' })
      }
      client = await prisma.client.findFirst({ where: { id: clientId, isActive: true } })
      if (!client) return res.status(404).json({ ok: false, message: 'Cliente no encontrado' })
    }

    const expiresAt = passExpiry(product.validityDays)
    const publicId = randomUUID()
    const purchaseKey = `purchase:${publicId}`
    const rawClaimToken = unassignedGift ? randomBytes(32).toString('base64url') : null
    const claimTokenHash = rawClaimToken ? hashToken(rawClaimToken) : null

    const pass = await prisma.$transaction(async (tx) => {
      const created = await tx.pass.create({
        data: {
          publicId,
          clientId: client?.id || null,
          productId,
          status: unassignedGift ? 'UNCLAIMED' : 'ACTIVE',
          unitType: product.unitType,
          initialUnits: product.initialUnits,
          remainingUnits: product.initialUnits,
          initialAmount: product.initialAmount,
          remainingAmount: product.initialAmount,
          expiresAt,
          claimTokenHash,
          claimExpiresAt: unassignedGift ? expiresAt : null,
          purchaserName: cleanName(req.body.purchaserName) || null,
          purchaserPhone: req.body.purchaserPhone ? normalizePhone(req.body.purchaserPhone) : null,
        },
        include: { client: true, product: true },
      })

      await tx.passTransaction.create({
        data: {
          passId: created.id,
          type: 'PURCHASE',
          unitsDelta: product.initialUnits,
          amountDelta: product.initialAmount,
          balanceUnitsAfter: product.initialUnits,
          balanceAmountAfter: product.initialAmount,
          idempotencyKey: purchaseKey,
          notes: unassignedGift ? 'Gift Pass vendido, pendiente de activación' : 'Emisión inicial del pase',
          createdByUserId: req.user.id,
        },
      })
      return created
    })

    const claimUrl = rawClaimToken
      ? `${process.env.FRONTEND_URL}/gift/claim/${rawClaimToken}`
      : null

    return res.status(201).json({
      ok: true,
      pass,
      claimUrl,
      claimToken: rawClaimToken,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al emitir el pase', error: error.message })
  }
}

async function previewGift(req, res) {
  try {
    const token = String(req.params.token || '')
    if (token.length < 20) return res.status(404).json({ ok: false, message: 'Gift Pass no encontrado' })

    const pass = await prisma.pass.findUnique({
      where: { claimTokenHash: hashToken(token) },
      include: { product: true },
    })

    if (!pass || pass.status !== 'UNCLAIMED') {
      return res.status(410).json({
        ok: false,
        message: 'Este Gift Pass ya fue activado o ya no está disponible',
      })
    }

    if (pass.claimExpiresAt && pass.claimExpiresAt <= new Date()) {
      await prisma.pass.update({ where: { id: pass.id }, data: { status: 'EXPIRED' } })
      return res.status(410).json({ ok: false, message: 'Este Gift Pass venció antes de ser activado' })
    }

    return res.json({
      ok: true,
      gift: {
        productName: pass.product.name,
        description: pass.product.description,
        unitType: pass.unitType,
        initialUnits: pass.initialUnits,
        initialAmount: pass.initialAmount,
        currency: pass.product.currency,
        purchaserName: pass.purchaserName,
        expiresAt: pass.expiresAt,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'No se pudo consultar el Gift Pass' })
  }
}

async function claimGift(req, res) {
  try {
    const token = String(req.params.token || '')
    const claimTokenHash = hashToken(token)
    const name = cleanName(req.body.name)
    const phone = normalizePhone(req.body.phone)
    const email = normalizeEmail(req.body.email)

    if (name.length < 2 || !isValidParaguayPhone(phone)) {
      return res.status(400).json({
        ok: false,
        message: 'Ingresá tu nombre y un teléfono paraguayo válido',
      })
    }

    const gift = await prisma.pass.findUnique({
      where: { claimTokenHash },
      include: { product: true },
    })

    if (!gift || gift.status !== 'UNCLAIMED') {
      return res.status(410).json({ ok: false, message: 'Este Gift Pass ya no está disponible' })
    }

    if (gift.claimExpiresAt && gift.claimExpiresAt <= new Date()) {
      await prisma.pass.update({ where: { id: gift.id }, data: { status: 'EXPIRED' } })
      return res.status(410).json({ ok: false, message: 'Este Gift Pass está vencido' })
    }

    const result = await prisma.$transaction(async (tx) => {
      let client = await tx.client.findUnique({ where: { phone } })

      if (client && !client.isActive) {
        throw Object.assign(new Error('La cuenta asociada a este teléfono está inactiva'), { status: 403 })
      }

      if (!client) {
        if (email) {
          const emailOwner = await tx.client.findUnique({ where: { email } })
          if (emailOwner) {
            throw Object.assign(new Error('Ese email ya está vinculado a otra cuenta'), { status: 409 })
          }
        }

        client = await tx.client.create({
          data: {
            name,
            phone,
            email,
            uniqueToken: randomUUID(),
          },
        })
      }

      const claimed = await tx.pass.updateMany({
        where: {
          id: gift.id,
          status: 'UNCLAIMED',
          claimTokenHash,
        },
        data: {
          clientId: client.id,
          status: 'ACTIVE',
          claimedAt: new Date(),
          claimTokenHash: null,
          claimExpiresAt: null,
        },
      })

      if (claimed.count !== 1) {
        throw Object.assign(new Error('Este Gift Pass acaba de ser activado desde otro dispositivo'), { status: 409 })
      }

      await tx.passTransaction.create({
        data: {
          passId: gift.id,
          type: 'CLAIM',
          balanceUnitsAfter: gift.remainingUnits,
          balanceAmountAfter: gift.remainingAmount,
          idempotencyKey: `claim:${gift.publicId}`,
          notes: `Gift Pass activado por ${client.name}`,
        },
      })

      const pass = await tx.pass.findUnique({
        where: { id: gift.id },
        include: { client: true, product: true },
      })

      return { client, pass }
    })

    return res.json({
      ok: true,
      message: '¡Tu Gift Pass ya está activo!',
      ...result,
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'El teléfono o email ya está registrado' })
    }
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || 'No se pudo activar el Gift Pass',
    })
  }
}

async function getPassByPublicId(req, res) {
  try {
    const pass = await prisma.pass.findUnique({
      where: { publicId: req.params.publicId },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        product: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            unitsDelta: true,
            amountDelta: true,
            balanceUnitsAfter: true,
            balanceAmountAfter: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    })
    if (!pass) return res.status(404).json({ ok: false, message: 'Pase no encontrado' })
    return res.json({ ok: true, pass })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al consultar el pase', error: error.message })
  }
}

async function redeemPass(req, res) {
  const publicId = req.params.publicId
  const quantity = parsePositiveInt(req.body.quantity || 1)
  const amount = parsePositiveInt(req.body.amount)
  const idempotencyKey = String(req.headers['idempotency-key'] || req.body.idempotencyKey || '').trim()

  if (!idempotencyKey || idempotencyKey.length < 12) {
    return res.status(400).json({ ok: false, message: 'Idempotency-Key es requerido para evitar dobles canjes' })
  }

  try {
    const existing = await prisma.passTransaction.findUnique({ where: { idempotencyKey } })
    if (existing) return res.json({ ok: true, duplicate: true, transaction: existing })

    const result = await prisma.$transaction(async (tx) => {
      const pass = await tx.pass.findUnique({
        where: { publicId },
        include: { product: true, client: true },
      })
      if (!pass) throw Object.assign(new Error('Pase no encontrado'), { status: 404 })
      if (pass.status !== 'ACTIVE') throw Object.assign(new Error('El pase no está activo'), { status: 409 })
      if (!pass.client) throw Object.assign(new Error('El pase todavía no tiene destinatario'), { status: 409 })
      if (pass.expiresAt && pass.expiresAt <= new Date()) {
        await tx.pass.update({ where: { id: pass.id }, data: { status: 'EXPIRED' } })
        throw Object.assign(new Error('El pase está vencido'), { status: 409 })
      }

      const isItem = pass.unitType === 'ITEM'
      const debit = isItem ? quantity : amount
      if (!debit) {
        throw Object.assign(new Error(isItem ? 'Cantidad inválida' : 'Importe inválido'), { status: 400 })
      }

      const update = isItem
        ? await tx.pass.updateMany({
            where: { id: pass.id, status: 'ACTIVE', remainingUnits: { gte: debit } },
            data: { remainingUnits: { decrement: debit } },
          })
        : await tx.pass.updateMany({
            where: { id: pass.id, status: 'ACTIVE', remainingAmount: { gte: debit } },
            data: { remainingAmount: { decrement: debit } },
          })

      if (update.count !== 1) throw Object.assign(new Error('Saldo insuficiente'), { status: 409 })

      const updated = await tx.pass.findUnique({ where: { id: pass.id } })
      const exhausted = isItem ? updated.remainingUnits === 0 : updated.remainingAmount === 0
      if (exhausted) {
        await tx.pass.update({ where: { id: pass.id }, data: { status: 'EXHAUSTED' } })
      }

      const transaction = await tx.passTransaction.create({
        data: {
          passId: pass.id,
          type: 'REDEEM',
          unitsDelta: isItem ? -debit : null,
          amountDelta: isItem ? null : -debit,
          balanceUnitsAfter: updated.remainingUnits,
          balanceAmountAfter: updated.remainingAmount,
          idempotencyKey,
          notes: req.body.notes?.trim() || null,
          createdByUserId: req.user.id,
        },
      })

      return {
        pass: { ...updated, status: exhausted ? 'EXHAUSTED' : updated.status },
        transaction,
        client: pass.client,
        product: pass.product,
      }
    })

    return res.json({ ok: true, ...result })
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.passTransaction.findUnique({ where: { idempotencyKey } })
      return res.json({ ok: true, duplicate: true, transaction: existing })
    }
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || 'Error al canjear el pase',
    })
  }
}

module.exports = {
  listProducts,
  createProduct,
  issuePass,
  previewGift,
  claimGift,
  getPassByPublicId,
  redeemPass,
}
