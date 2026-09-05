const {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
  randomUUID,
} = require('crypto')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { normalizePhone, isValidParaguayPhone } = require('../utils/clientIdentity')
const { deliverOtp } = require('../utils/otpDelivery')

const OTP_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const QR_TTL_SECONDS = 60

function otpSecret() {
  return String(process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || '')
}

function hashOtp(phone, code) {
  return createHmac('sha256', otpSecret()).update(`${phone}:${code}`).digest('hex')
}

function hashSessionToken(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function safeEqualHex(a, b) {
  try {
    const left = Buffer.from(String(a), 'hex')
    const right = Buffer.from(String(b), 'hex')
    return left.length === right.length && timingSafeEqual(left, right)
  } catch {
    return false
  }
}

function qrSecret() {
  return String(process.env.CLIENT_QR_SECRET || process.env.JWT_SECRET || '')
}

async function requestOtp(req, res) {
  const phone = normalizePhone(req.body.phone)

  if (!isValidParaguayPhone(phone)) {
    return res.status(400).json({ ok: false, message: 'Ingresá un número paraguayo válido' })
  }

  if (!otpSecret()) {
    return res.status(503).json({ ok: false, message: 'El acceso por código todavía no está configurado' })
  }

  try {
    const client = await prisma.client.findUnique({ where: { phone } })

    // Respuesta deliberadamente genérica para no exponer qué teléfonos están registrados.
    if (!client || !client.isActive) {
      return res.json({
        ok: true,
        message: 'Si el número está registrado, vas a recibir un código en unos instantes.',
      })
    }

    const recent = await prisma.clientOtpChallenge.findFirst({
      where: {
        phone,
        consumedAt: null,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recent) {
      return res.status(429).json({
        ok: false,
        message: 'Esperá un minuto antes de pedir otro código.',
      })
    }

    const code = String(randomInt(100000, 1000000))
    const challenge = await prisma.clientOtpChallenge.create({
      data: {
        phone,
        codeHash: hashOtp(phone, code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    })

    try {
      await deliverOtp({ phone, code })
    } catch (error) {
      await prisma.clientOtpChallenge.delete({ where: { id: challenge.id } }).catch(() => {})
      throw error
    }

    return res.json({
      ok: true,
      message: 'Te enviamos un código de 6 dígitos.',
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    })
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || 'No pudimos enviar el código',
    })
  }
}

async function verifyOtp(req, res) {
  const phone = normalizePhone(req.body.phone)
  const code = String(req.body.code || '').replace(/\D/g, '')

  if (!isValidParaguayPhone(phone) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ ok: false, message: 'Número o código inválido' })
  }

  try {
    const challenge = await prisma.clientOtpChallenge.findFirst({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!challenge) {
      return res.status(401).json({ ok: false, message: 'El código venció. Pedí uno nuevo.' })
    }

    if (challenge.attempts >= 5) {
      return res.status(429).json({ ok: false, message: 'Demasiados intentos. Pedí un código nuevo.' })
    }

    const expected = hashOtp(phone, code)
    if (!safeEqualHex(expected, challenge.codeHash)) {
      await prisma.clientOtpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      })
      return res.status(401).json({ ok: false, message: 'Código incorrecto' })
    }

    const client = await prisma.client.findUnique({ where: { phone } })
    if (!client || !client.isActive) {
      return res.status(401).json({ ok: false, message: 'No pudimos habilitar el acceso' })
    }

    const rawToken = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

    const session = await prisma.$transaction(async (tx) => {
      await tx.clientOtpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      })

      const activeSessions = await tx.clientSession.findMany({
        where: { clientId: client.id, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })

      if (activeSessions.length >= 5) {
        const toRevoke = activeSessions.slice(4).map((item) => item.id)
        if (toRevoke.length) {
          await tx.clientSession.updateMany({
            where: { id: { in: toRevoke } },
            data: { revokedAt: new Date() },
          })
        }
      }

      return tx.clientSession.create({
        data: {
          clientId: client.id,
          tokenHash: hashSessionToken(rawToken),
          userAgent: String(req.headers['user-agent'] || '').slice(0, 500) || null,
          ipAddress: String(req.ip || '').slice(0, 120) || null,
          expiresAt,
        },
      })
    })

    return res.json({
      ok: true,
      token: rawToken,
      expiresAt,
      sessionId: session.id,
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'No pudimos validar el código' })
  }
}

async function me(req, res) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        passes: {
          where: { status: { in: ['ACTIVE', 'EXHAUSTED', 'EXPIRED'] } },
          orderBy: { purchasedAt: 'desc' },
          include: {
            product: true,
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                id: true,
                type: true,
                unitsDelta: true,
                amountDelta: true,
                balanceUnitsAfter: true,
                balanceAmountAfter: true,
                createdAt: true,
              },
            },
          },
        },
      },
    })

    return res.json({ ok: true, client })
  } catch {
    return res.status(500).json({ ok: false, message: 'No pudimos cargar tus pases' })
  }
}

async function logout(req, res) {
  await prisma.clientSession.update({
    where: { id: req.clientSession.id },
    data: { revokedAt: new Date() },
  })

  return res.json({ ok: true, message: 'Sesión cerrada' })
}

async function createDynamicQr(req, res) {
  try {
    if (!qrSecret()) {
      return res.status(503).json({ ok: false, message: 'QR dinámico todavía no configurado' })
    }

    const publicId = String(req.body.publicId || '').trim()
    const pass = await prisma.pass.findFirst({
      where: {
        publicId,
        clientId: req.client.id,
        status: 'ACTIVE',
      },
      include: { product: true },
    })

    if (!pass) {
      return res.status(404).json({ ok: false, message: 'Pase activo no encontrado' })
    }

    const token = jwt.sign(
      {
        type: 'MODO_PASS_QR',
        clientId: req.client.id,
        passId: pass.id,
        publicId: pass.publicId,
        sessionId: req.clientSession.id,
        jti: randomUUID(),
      },
      qrSecret(),
      { expiresIn: QR_TTL_SECONDS, audience: 'modo-cafe-staff', issuer: 'modo-cafe-pass' },
    )

    return res.json({
      ok: true,
      qrValue: `modo-pass-dynamic:${token}`,
      expiresInSeconds: QR_TTL_SECONDS,
      expiresAt: new Date(Date.now() + QR_TTL_SECONDS * 1000),
    })
  } catch {
    return res.status(500).json({ ok: false, message: 'No pudimos generar el QR' })
  }
}

module.exports = {
  requestOtp,
  verifyOtp,
  me,
  logout,
  createDynamicQr,
}
