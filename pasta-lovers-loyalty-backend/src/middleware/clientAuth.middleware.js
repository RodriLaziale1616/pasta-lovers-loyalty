const { createHash } = require('crypto')
const prisma = require('../lib/prisma')

function hashSessionToken(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

async function clientAuthMiddleware(req, res, next) {
  try {
    const auth = String(req.headers.authorization || '')
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'Iniciá sesión para continuar' })
    }

    const rawToken = auth.slice(7).trim()
    if (rawToken.length < 20) {
      return res.status(401).json({ ok: false, message: 'Sesión inválida' })
    }

    const session = await prisma.clientSession.findUnique({
      where: { tokenHash: hashSessionToken(rawToken) },
      include: { client: true },
    })

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.client?.isActive
    ) {
      return res.status(401).json({ ok: false, message: 'Tu sesión venció. Volvé a ingresar.' })
    }

    req.clientSession = session
    req.client = session.client

    prisma.clientSession
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {})

    return next()
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'No pudimos validar tu sesión' })
  }
}

module.exports = clientAuthMiddleware
