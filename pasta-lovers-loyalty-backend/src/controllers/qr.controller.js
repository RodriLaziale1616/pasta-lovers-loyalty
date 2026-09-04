const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

function qrSecret() {
  return String(process.env.CLIENT_QR_SECRET || process.env.JWT_SECRET || '')
}

async function resolveDynamicQr(req, res) {
  try {
    const raw = String(req.body.qrValue || req.body.token || '').trim()
    const token = raw.startsWith('modo-pass-dynamic:')
      ? raw.slice('modo-pass-dynamic:'.length)
      : raw

    if (!token || !qrSecret()) {
      return res.status(400).json({ ok: false, message: 'QR inválido' })
    }

    let payload
    try {
      payload = jwt.verify(token, qrSecret(), {
        audience: 'modo-cafe-staff',
        issuer: 'modo-cafe-pass',
      })
    } catch {
      return res.status(410).json({
        ok: false,
        message: 'Este QR venció. Pedile al cliente que muestre uno nuevo.',
      })
    }

    if (
      payload.type !== 'MODO_PASS_QR' ||
      !payload.passId ||
      !payload.clientId ||
      !payload.sessionId
    ) {
      return res.status(400).json({ ok: false, message: 'QR inválido' })
    }

    const session = await prisma.clientSession.findFirst({
      where: {
        id: String(payload.sessionId),
        clientId: Number(payload.clientId),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    })

    if (!session) {
      return res.status(410).json({
        ok: false,
        message: 'La sesión que generó este QR ya no está activa.',
      })
    }

    const pass = await prisma.pass.findFirst({
      where: {
        id: Number(payload.passId),
        publicId: String(payload.publicId || ''),
        clientId: Number(payload.clientId),
      },
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

    if (!pass) {
      return res.status(404).json({ ok: false, message: 'Pase no encontrado' })
    }

    return res.json({ ok: true, pass, dynamic: true })
  } catch {
    return res.status(500).json({ ok: false, message: 'No pudimos validar el QR' })
  }
}

module.exports = { resolveDynamicQr }
