const { createHash, randomBytes } = require('crypto')
const prisma = require('../lib/prisma')

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function hashSessionToken(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

async function createClientSession(client, req) {
  const rawToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  const session = await prisma.$transaction(async (tx) => {
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

  return { rawToken, expiresAt, session }
}

module.exports = {
  SESSION_TTL_MS,
  hashSessionToken,
  createClientSession,
}
