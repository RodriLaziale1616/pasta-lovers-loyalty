const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function listProducts(req, res) {
  try {
    const products = await prisma.passProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ ok: true, products });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al listar pases', error: error.message });
  }
}

async function createProduct(req, res) {
  try {
    const { name, description, unitType = 'ITEM', initialUnits, initialAmount, salePrice, currency = 'PYG', validityDays } = req.body;
    const price = parsePositiveInt(salePrice);

    if (!name || !price || !['ITEM', 'MONEY'].includes(unitType)) {
      return res.status(400).json({ ok: false, message: 'Nombre, precio y tipo de pase válidos son requeridos' });
    }

    const units = unitType === 'ITEM' ? parsePositiveInt(initialUnits) : null;
    const amount = unitType === 'MONEY' ? parsePositiveInt(initialAmount) : null;
    if ((unitType === 'ITEM' && !units) || (unitType === 'MONEY' && !amount)) {
      return res.status(400).json({ ok: false, message: 'El saldo inicial del pase es inválido' });
    }

    const product = await prisma.passProduct.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        unitType,
        initialUnits: units,
        initialAmount: amount,
        salePrice: price,
        currency,
        validityDays: validityDays ? parsePositiveInt(validityDays) : null,
      },
    });
    return res.status(201).json({ ok: true, product });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al crear el tipo de pase', error: error.message });
  }
}

async function issuePass(req, res) {
  try {
    const clientId = Number(req.body.clientId);
    const productId = Number(req.body.productId);
    if (!Number.isInteger(clientId) || !Number.isInteger(productId)) {
      return res.status(400).json({ ok: false, message: 'Cliente y tipo de pase son requeridos' });
    }

    const [client, product] = await Promise.all([
      prisma.client.findFirst({ where: { id: clientId, isActive: true } }),
      prisma.passProduct.findFirst({ where: { id: productId, isActive: true } }),
    ]);
    if (!client || !product) return res.status(404).json({ ok: false, message: 'Cliente o tipo de pase no encontrado' });

    const expiresAt = product.validityDays
      ? new Date(Date.now() + product.validityDays * 24 * 60 * 60 * 1000)
      : null;
    const publicId = randomUUID();
    const purchaseKey = `purchase:${publicId}`;

    const pass = await prisma.$transaction(async (tx) => {
      const created = await tx.pass.create({
        data: {
          publicId,
          clientId,
          productId,
          unitType: product.unitType,
          initialUnits: product.initialUnits,
          remainingUnits: product.initialUnits,
          initialAmount: product.initialAmount,
          remainingAmount: product.initialAmount,
          expiresAt,
        },
        include: { client: true, product: true },
      });

      await tx.passTransaction.create({
        data: {
          passId: created.id,
          type: 'PURCHASE',
          unitsDelta: product.initialUnits,
          amountDelta: product.initialAmount,
          balanceUnitsAfter: product.initialUnits,
          balanceAmountAfter: product.initialAmount,
          idempotencyKey: purchaseKey,
          notes: 'Emisión inicial del pase',
          createdByUserId: req.user.id,
        },
      });
      return created;
    });

    return res.status(201).json({ ok: true, pass });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al emitir el pase', error: error.message });
  }
}

async function getPassByPublicId(req, res) {
  try {
    const pass = await prisma.pass.findUnique({
      where: { publicId: req.params.publicId },
      include: {
        client: { select: { id: true, name: true } },
        product: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, type: true, unitsDelta: true, amountDelta: true, balanceUnitsAfter: true, balanceAmountAfter: true, notes: true, createdAt: true },
        },
      },
    });
    if (!pass) return res.status(404).json({ ok: false, message: 'Pase no encontrado' });
    return res.json({ ok: true, pass });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Error al consultar el pase', error: error.message });
  }
}

async function redeemPass(req, res) {
  const publicId = req.params.publicId;
  const quantity = parsePositiveInt(req.body.quantity || 1);
  const amount = parsePositiveInt(req.body.amount);
  const idempotencyKey = String(req.headers['idempotency-key'] || req.body.idempotencyKey || '').trim();

  if (!idempotencyKey || idempotencyKey.length < 12) {
    return res.status(400).json({ ok: false, message: 'Idempotency-Key es requerido para evitar dobles canjes' });
  }

  try {
    const existing = await prisma.passTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return res.json({ ok: true, duplicate: true, transaction: existing });

    const result = await prisma.$transaction(async (tx) => {
      const pass = await tx.pass.findUnique({ where: { publicId }, include: { product: true, client: true } });
      if (!pass) throw Object.assign(new Error('Pase no encontrado'), { status: 404 });
      if (pass.status !== 'ACTIVE') throw Object.assign(new Error('El pase no está activo'), { status: 409 });
      if (pass.expiresAt && pass.expiresAt <= new Date()) {
        await tx.pass.update({ where: { id: pass.id }, data: { status: 'EXPIRED' } });
        throw Object.assign(new Error('El pase está vencido'), { status: 409 });
      }

      const isItem = pass.unitType === 'ITEM';
      const debit = isItem ? quantity : amount;
      if (!debit) throw Object.assign(new Error(isItem ? 'Cantidad inválida' : 'Importe inválido'), { status: 400 });

      const update = isItem
        ? await tx.pass.updateMany({
            where: { id: pass.id, status: 'ACTIVE', remainingUnits: { gte: debit } },
            data: { remainingUnits: { decrement: debit } },
          })
        : await tx.pass.updateMany({
            where: { id: pass.id, status: 'ACTIVE', remainingAmount: { gte: debit } },
            data: { remainingAmount: { decrement: debit } },
          });

      if (update.count !== 1) throw Object.assign(new Error('Saldo insuficiente'), { status: 409 });

      const updated = await tx.pass.findUnique({ where: { id: pass.id } });
      const exhausted = isItem ? updated.remainingUnits === 0 : updated.remainingAmount === 0;
      if (exhausted) await tx.pass.update({ where: { id: pass.id }, data: { status: 'EXHAUSTED' } });

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
      });

      return { pass: { ...updated, status: exhausted ? 'EXHAUSTED' : updated.status }, transaction, client: pass.client, product: pass.product };
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.passTransaction.findUnique({ where: { idempotencyKey } });
      return res.json({ ok: true, duplicate: true, transaction: existing });
    }
    return res.status(error.status || 500).json({ ok: false, message: error.message || 'Error al canjear el pase' });
  }
}

module.exports = { listProducts, createProduct, issuePass, getPassByPublicId, redeemPass };
