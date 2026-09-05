const prisma = require('../lib/prisma')

function cleanText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function positiveInt(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function nullablePositiveInt(value) {
  if (value === '' || value == null) return null
  return positiveInt(value)
}

function productData(body, current = null) {
  const unitType = body.unitType || current?.unitType || 'ITEM'
  const name = body.name != null ? cleanText(body.name) : current?.name
  const description = body.description != null ? cleanText(body.description) || null : current?.description
  const salePrice = body.salePrice != null ? positiveInt(body.salePrice) : current?.salePrice
  const currency = body.currency != null ? cleanText(body.currency).toUpperCase() : current?.currency || 'PYG'
  const validityDays = body.validityDays !== undefined
    ? nullablePositiveInt(body.validityDays)
    : current?.validityDays
  const isGift = body.isGift !== undefined ? Boolean(body.isGift) : Boolean(current?.isGift)
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : current?.isActive ?? true

  const initialUnits = unitType === 'ITEM'
    ? (body.initialUnits != null ? positiveInt(body.initialUnits) : current?.initialUnits)
    : null
  const initialAmount = unitType === 'MONEY'
    ? (body.initialAmount != null ? positiveInt(body.initialAmount) : current?.initialAmount)
    : null

  if (!name || !salePrice || !['ITEM', 'MONEY'].includes(unitType)) {
    throw Object.assign(new Error('Completá nombre, precio y tipo de pase.'), { status: 400 })
  }
  if (unitType === 'ITEM' && !initialUnits) {
    throw Object.assign(new Error('Ingresá la cantidad de consumos del pase.'), { status: 400 })
  }
  if (unitType === 'MONEY' && !initialAmount) {
    throw Object.assign(new Error('Ingresá el saldo inicial del pase.'), { status: 400 })
  }
  if (currency.length !== 3) {
    throw Object.assign(new Error('La moneda debe tener 3 letras, por ejemplo PYG.'), { status: 400 })
  }

  return {
    name,
    description,
    unitType,
    initialUnits,
    initialAmount,
    salePrice,
    currency,
    validityDays,
    isGift,
    isActive,
  }
}

async function listActiveProducts(req, res) {
  try {
    const products = await prisma.passProduct.findMany({
      where: { isActive: true },
      orderBy: [{ isGift: 'asc' }, { createdAt: 'desc' }],
    })
    return res.json({ ok: true, products })
  } catch {
    return res.status(500).json({ ok: false, message: 'No pudimos cargar los productos.' })
  }
}

async function listManagedProducts(req, res) {
  try {
    const products = await prisma.passProduct.findMany({
      include: { _count: { select: { passes: true } } },
      orderBy: [{ isActive: 'desc' }, { isGift: 'asc' }, { createdAt: 'desc' }],
    })
    return res.json({ ok: true, products })
  } catch {
    return res.status(500).json({ ok: false, message: 'No pudimos cargar los productos.' })
  }
}

async function createProduct(req, res) {
  try {
    const data = productData(req.body)
    const product = await prisma.passProduct.create({ data })
    return res.status(201).json({ ok: true, product })
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || 'No pudimos crear el producto.',
    })
  }
}

async function updateProduct(req, res) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, message: 'Producto inválido.' })
    }

    const current = await prisma.passProduct.findUnique({
      where: { id },
      include: { _count: { select: { passes: true } } },
    })
    if (!current) return res.status(404).json({ ok: false, message: 'Producto no encontrado.' })

    if (req.body.unitType && req.body.unitType !== current.unitType && current._count.passes > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Este producto ya tiene pases emitidos. No se puede cambiar entre unidades y dinero; creá un producto nuevo.',
      })
    }

    const data = productData(req.body, current)
    const product = await prisma.passProduct.update({ where: { id }, data })
    return res.json({ ok: true, product })
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || 'No pudimos guardar los cambios.',
    })
  }
}

async function setProductActive(req, res) {
  try {
    const id = Number(req.params.id)
    const isActive = Boolean(req.body.isActive)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, message: 'Producto inválido.' })
    }
    const product = await prisma.passProduct.update({ where: { id }, data: { isActive } })
    return res.json({
      ok: true,
      product,
      message: isActive ? 'Producto activado.' : 'Producto pausado. Ya no aparecerá para nuevas ventas.',
    })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ ok: false, message: 'Producto no encontrado.' })
    return res.status(500).json({ ok: false, message: 'No pudimos cambiar el estado del producto.' })
  }
}

module.exports = {
  listActiveProducts,
  listManagedProducts,
  createProduct,
  updateProduct,
  setProductActive,
}
