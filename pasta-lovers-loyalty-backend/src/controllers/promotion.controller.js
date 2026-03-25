const prisma = require('../lib/prisma')

async function getActivePromotions(req, res) {
  try {
    const now = new Date()

    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [{ startAt: null }, { startAt: { lte: now } }],
          },
          {
            OR: [{ endAt: null }, { endAt: { gte: now } }],
          },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return res.json({
      ok: true,
      promotions,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener promociones activas',
      error: error.message,
    })
  }
}

async function createPromotion(req, res) {
  try {
    const {
      title,
      description,
      imageUrl,
      buttonText,
      buttonLink,
      startAt,
      endAt,
      priority,
      isActive,
    } = req.body

    if (!title) {
      return res.status(400).json({
        ok: false,
        message: 'El título es obligatorio',
      })
    }

    const promotion = await prisma.promotion.create({
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        buttonText: buttonText || null,
        buttonLink: buttonLink || null,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        priority: Number(priority || 0),
        isActive: isActive ?? true,
        createdByUserId: req.user?.id || null,
      },
    })

    return res.status(201).json({
      ok: true,
      message: 'Promoción creada correctamente',
      promotion,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al crear promoción',
      error: error.message,
    })
  }
}

module.exports = {
  getActivePromotions,
  createPromotion,
}