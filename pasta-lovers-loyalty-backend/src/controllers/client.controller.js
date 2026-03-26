const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

async function registerClient(req, res) {
  try {
    const {
      name,
      phone,
      email,
      instagramHandle,
      instagramFollowConfirmed,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre y teléfono son obligatorios',
      });
    }

    const existingByPhone = await prisma.client.findUnique({
      where: { phone },
    });

    if (existingByPhone) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un cliente registrado con ese teléfono',
      });
    }

    if (email) {
      const existingByEmail = await prisma.client.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        return res.status(409).json({
          ok: false,
          message: 'Ya existe un cliente registrado con ese email',
        });
      }
    }

    const uniqueToken = uuidv4();

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email: email || null,
        instagramHandle: instagramHandle || null,
        instagramFollowConfirmed: !!instagramFollowConfirmed,
        uniqueToken,
        loyaltyStatus: {
          create: {
            currentChecks: 0,
            rewardAvailable: false,
            cycleNumber: 1,
          },
        },
      },
      include: {
        loyaltyStatus: true,
      },
    });

    const cardUrl = `${process.env.FRONTEND_URL}/card/${client.uniqueToken}`;

    return res.status(201).json({
      ok: true,
      message: 'Cliente registrado correctamente',
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        instagramHandle: client.instagramHandle,
        instagramFollowConfirmed: client.instagramFollowConfirmed,
        uniqueToken: client.uniqueToken,
        loyaltyStatus: client.loyaltyStatus,
        cardUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar cliente',
      error: error.message,
    });
  }
}

async function getClientCardByToken(req, res) {
  try {
    const { token } = req.params;

    const client = await prisma.client.findUnique({
      where: { uniqueToken: token },
      include: {
        loyaltyStatus: true,
      },
    });

    if (!client || !client.isActive) {
      return res.status(404).json({
        ok: false,
        message: 'Tarjeta no encontrada',
      });
    }

    return res.json({
      ok: true,
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        instagramHandle: client.instagramHandle,
        instagramFollowConfirmed: client.instagramFollowConfirmed,
        uniqueToken: client.uniqueToken,
        loyaltyStatus: client.loyaltyStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener tarjeta del cliente',
      error: error.message,
    });
  }
}

async function getClientByTokenForStaff(req, res) {
  try {
    const { token } = req.params;

    const client = await prisma.client.findUnique({
      where: { uniqueToken: token },
      include: {
        loyaltyStatus: true,
      },
    });

    if (!client || !client.isActive) {
      return res.status(404).json({
        ok: false,
        message: 'Cliente no encontrado',
      });
    }

    return res.json({
      ok: true,
      client,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al buscar cliente',
      error: error.message,
    });
  }
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

async function checkinClient(req, res) {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      include: {
        loyaltyStatus: true,
      },
    });

    if (!client || !client.isActive) {
      return res.status(404).json({
        ok: false,
        message: 'Cliente no encontrado',
      });
    }

    const loyaltyStatus = client.loyaltyStatus;

    if (!loyaltyStatus) {
      return res.status(400).json({
        ok: false,
        message: 'El cliente no tiene estado de fidelidad',
      });
    }

    if (loyaltyStatus.rewardAvailable) {
      return res.status(400).json({
        ok: false,
        message: 'Este cliente ya tiene un premio disponible. Debe canjearlo antes de seguir acumulando.',
      });
    }

    if (loyaltyStatus.lastCheckinAt) {
      const lastCheckinDate = new Date(loyaltyStatus.lastCheckinAt);
      const now = new Date();

      if (isSameDay(lastCheckinDate, now)) {
        return res.status(400).json({
          ok: false,
          message: 'Ya se registró un check para este cliente hoy',
        });
      }
    }

    const nextChecks = loyaltyStatus.currentChecks + 1;
    const rewardAvailable = nextChecks >= 5;

    const updatedStatus = await prisma.loyaltyStatus.update({
      where: { clientId: client.id },
      data: {
        currentChecks: nextChecks,
        rewardAvailable,
        lastCheckinAt: new Date(),
      },
    });

    await prisma.loyaltyTransaction.create({
      data: {
        clientId: client.id,
        type: 'checkin',
        checksDelta: 1,
        createdByUserId: req.user?.id || null,
        notes: rewardAvailable
          ? 'Check registrado y premio habilitado'
          : 'Check registrado',
      },
    });

    return res.json({
      ok: true,
      message: rewardAvailable
        ? 'Check registrado. El cliente alcanzó su premio.'
        : 'Check registrado correctamente',
      loyaltyStatus: updatedStatus,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar check',
      error: error.message,
    });
  }
}

async function redeemClientReward(req, res) {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      include: {
        loyaltyStatus: true,
      },
    });

    if (!client || !client.isActive) {
      return res.status(404).json({
        ok: false,
        message: 'Cliente no encontrado',
      });
    }

    const loyaltyStatus = client.loyaltyStatus;

    if (!loyaltyStatus?.rewardAvailable) {
      return res.status(400).json({
        ok: false,
        message: 'Este cliente todavía no tiene un premio disponible',
      });
    }

    const updatedStatus = await prisma.loyaltyStatus.update({
      where: { clientId: client.id },
      data: {
        currentChecks: 0,
        rewardAvailable: false,
        cycleNumber: loyaltyStatus.cycleNumber + 1,
        lastRedeemedAt: new Date(),
      },
    });

    await prisma.loyaltyTransaction.create({
      data: {
        clientId: client.id,
        type: 'redeem',
        checksDelta: 0,
        createdByUserId: req.user?.id || null,
        notes: 'Premio canjeado y ciclo reiniciado',
      },
    });

    return res.json({
      ok: true,
      message: 'Premio canjeado correctamente',
      loyaltyStatus: updatedStatus,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al canjear premio',
      error: error.message,
    });
  }
}
async function searchClients(req, res) {
  try {
    const { q } = req.query

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        ok: false,
        message: 'Ingresá al menos 2 caracteres para buscar',
      })
    }

    const query = q.trim()

    const clients = await prisma.client.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        loyaltyStatus: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return res.json({
      ok: true,
      clients,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al buscar clientes',
      error: error.message,
    })
  }
}

async function getClientHistory(req, res) {
  try {
    const { id } = req.params

    const history = await prisma.loyaltyTransaction.findMany({
      where: {
        clientId: Number(id),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    })

    return res.json({
      ok: true,
      history,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener historial',
      error: error.message,
    })
  }
}

module.exports = {
  registerClient,
  getClientCardByToken,
  getClientByTokenForStaff,
  checkinClient,
  redeemClientReward,
  searchClients, // 👈 nuevo
  getClientHistory,
}
;
