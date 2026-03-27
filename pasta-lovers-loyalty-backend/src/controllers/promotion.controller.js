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

async function getAllPromotions(req, res) {
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    })

    return res.json({
      ok: true,
      promotions,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener promociones',
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

async function updatePromotion(req, res) {
  try {
    const { id } = req.params
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

    const promotion = await prisma.promotion.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        imageUrl,
        buttonText,
        buttonLink,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        priority: Number(priority || 0),
        isActive: typeof isActive === 'boolean' ? isActive : Boolean(isActive),
      },
    })

    return res.json({
      ok: true,
      message: 'Promoción actualizada correctamente',
      promotion,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al actualizar promoción',
      error: error.message,
    })
  }
}

async function togglePromotion(req, res) {
  try {
    const { id } = req.params

    const existing = await prisma.promotion.findUnique({
      where: { id: Number(id) },
    })

    if (!existing) {
      return res.status(404).json({
        ok: false,
        message: 'Promoción no encontrada',
      })
    }

    const promotion = await prisma.promotion.update({
      where: { id: Number(id) },
      data: {
        isActive: !existing.isActive,
      },
    })

    return res.json({
      ok: true,
      message: promotion.isActive ? 'Promoción activada' : 'Promoción desactivada',
      promotion,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al cambiar estado de la promoción',
      error: error.message,
    })
  }
}

async function deletePromotion(req, res) {
  try {
    const { id } = req.params

    await prisma.promotion.delete({
      where: { id: Number(id) },
    })

    return res.json({
      ok: true,
      message: 'Promoción eliminada correctamente',
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al eliminar promoción',
      error: error.message,
    })
  }
}

module.exports = {
  getActivePromotions,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  togglePromotion,
  deletePromotion,
}