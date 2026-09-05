const { createHash } = require('crypto')
const prisma = require('../lib/prisma')
const { normalizePhone, isValidParaguayPhone } = require('../utils/clientIdentity')
const { createClientSession } = require('../utils/clientSessionService')

const CHALLENGE_TTL_MS = 5 * 60 * 1000
let simpleWebAuthnPromise

function webauthn() {
  if (!simpleWebAuthnPromise) simpleWebAuthnPromise = import('@simplewebauthn/server')
  return simpleWebAuthnPromise
}

function relyingParty() {
  const configuredOrigin = String(process.env.WEBAUTHN_ORIGIN || '').trim()
  const frontend = String(process.env.FRONTEND_URL || '').trim()
  const origin = configuredOrigin || frontend

  if (!origin) throw Object.assign(new Error('WebAuthn no está configurado'), { status: 503 })

  let parsed
  try {
    parsed = new URL(origin)
  } catch {
    throw Object.assign(new Error('Origen WebAuthn inválido'), { status: 503 })
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw Object.assign(new Error('WebAuthn requiere HTTPS'), { status: 503 })
  }

  return {
    rpName: 'Modo Café',
    rpID: String(process.env.WEBAUTHN_RP_ID || parsed.hostname).trim(),
    origin: parsed.origin,
  }
}

function webAuthnUserId(client) {
  return createHash('sha256').update(`modo-cafe-pass:${client.uniqueToken}`).digest()
}

function passkeySummary(passkey) {
  return {
    id: passkey.id,
    label: passkey.label || 'Acceso seguro',
    deviceType: passkey.deviceType,
    backedUp: passkey.backedUp,
    transports: passkey.transports,
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt,
  }
}

async function storeChallenge(clientId, type, challenge) {
  const now = new Date()
  await prisma.clientWebAuthnChallenge.updateMany({
    where: { clientId, type, consumedAt: null },
    data: { consumedAt: now },
  })

  return prisma.clientWebAuthnChallenge.create({
    data: {
      clientId,
      type,
      challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  })
}

async function currentChallenge(clientId, type) {
  return prisma.clientWebAuthnChallenge.findFirst({
    where: {
      clientId,
      type,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
}

async function listPasskeys(req, res) {
  try {
    const passkeys = await prisma.clientPasskey.findMany({
      where: { clientId: req.client.id },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ ok: true, passkeys: passkeys.map(passkeySummary) })
  } catch {
    return res.status(500).json({ ok: false, message: 'No pudimos cargar tus accesos rápidos' })
  }
}

async function registrationOptions(req, res) {
  try {
    const { generateRegistrationOptions } = await webauthn()
    const rp = relyingParty()
    const passkeys = await prisma.clientPasskey.findMany({ where: { clientId: req.client.id } })

    const options = await generateRegistrationOptions({
      rpName: rp.rpName,
      rpID: rp.rpID,
      userID: webAuthnUserId(req.client),
      userName: req.client.phone,
      userDisplayName: req.client.name,
      attestationType: 'none',
      excludeCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
      timeout: 60_000,
    })

    await storeChallenge(req.client.id, 'REGISTRATION', options.challenge)
    return res.json({ ok: true, options })
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || 'No pudimos iniciar el registro biométrico',
    })
  }
}

async function registrationVerify(req, res) {
  try {
    const { verifyRegistrationResponse } = await webauthn()
    const rp = relyingParty()
    const challenge = await currentChallenge(req.client.id, 'REGISTRATION')
    if (!challenge) {
      return res.status(410).json({ ok: false, message: 'La solicitud venció. Intentá de nuevo.' })
    }

    const response = req.body.response
    if (!response) return res.status(400).json({ ok: false, message: 'Respuesta biométrica requerida' })

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ ok: false, message: 'No pudimos verificar este dispositivo' })
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
    const label = String(req.body.label || 'Face ID / huella').trim().slice(0, 80) || 'Face ID / huella'

    const passkey = await prisma.$transaction(async (tx) => {
      const consumed = await tx.clientWebAuthnChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: new Date() },
      })
      if (consumed.count !== 1) throw Object.assign(new Error('La solicitud ya fue utilizada'), { status: 409 })

      return tx.clientPasskey.create({
        data: {
          clientId: req.client.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports || [],
          deviceType: credentialDeviceType || null,
          backedUp: Boolean(credentialBackedUp),
          label,
        },
      })
    })

    return res.status(201).json({
      ok: true,
      message: 'Acceso con biometría activado',
      passkey: passkeySummary(passkey),
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ ok: false, message: 'Este acceso ya está registrado' })
    }
    return res.status(error.status || 400).json({
      ok: false,
      message: error.message || 'No pudimos activar el acceso biométrico',
    })
  }
}

async function authenticationOptions(req, res) {
  const phone = normalizePhone(req.body.phone)
  if (!isValidParaguayPhone(phone)) {
    return res.status(400).json({ ok: false, message: 'Ingresá un número paraguayo válido' })
  }

  try {
    const client = await prisma.client.findUnique({
      where: { phone },
      include: { passkeys: true },
    })

    if (!client || !client.isActive || !client.passkeys.length) {
      return res.status(404).json({
        ok: false,
        message: 'Este número todavía no tiene acceso biométrico activado. Ingresá con código.',
      })
    }

    const { generateAuthenticationOptions } = await webauthn()
    const rp = relyingParty()
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      allowCredentials: client.passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports,
      })),
      userVerification: 'required',
      timeout: 60_000,
    })

    await storeChallenge(client.id, 'AUTHENTICATION', options.challenge)
    return res.json({ ok: true, options })
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      message: error.message || 'No pudimos iniciar el acceso biométrico',
    })
  }
}

async function authenticationVerify(req, res) {
  const phone = normalizePhone(req.body.phone)
  if (!isValidParaguayPhone(phone)) {
    return res.status(400).json({ ok: false, message: 'Número inválido' })
  }

  try {
    const client = await prisma.client.findUnique({ where: { phone } })
    if (!client || !client.isActive) {
      return res.status(401).json({ ok: false, message: 'No pudimos habilitar el acceso' })
    }

    const challenge = await currentChallenge(client.id, 'AUTHENTICATION')
    if (!challenge) {
      return res.status(410).json({ ok: false, message: 'La solicitud venció. Intentá de nuevo.' })
    }

    const response = req.body.response
    const credentialId = String(response?.id || '')
    const passkey = await prisma.clientPasskey.findFirst({
      where: { clientId: client.id, credentialId },
    })

    if (!passkey) {
      return res.status(401).json({ ok: false, message: 'Este acceso no pertenece a tu cuenta' })
    }

    const { verifyAuthenticationResponse } = await webauthn()
    const rp = relyingParty()
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    })

    if (!verification.verified) {
      return res.status(401).json({ ok: false, message: 'No pudimos verificar tu identidad' })
    }

    const consumed = await prisma.clientWebAuthnChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    })
    if (consumed.count !== 1) {
      return res.status(409).json({ ok: false, message: 'La solicitud ya fue utilizada' })
    }

    await prisma.clientPasskey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    })

    const { rawToken, expiresAt, session } = await createClientSession(client, req)
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
    return res.status(error.status || 400).json({
      ok: false,
      message: error.message || 'No pudimos validar el acceso biométrico',
    })
  }
}

async function deletePasskey(req, res) {
  try {
    const result = await prisma.clientPasskey.deleteMany({
      where: { id: String(req.params.id), clientId: req.client.id },
    })
    if (!result.count) return res.status(404).json({ ok: false, message: 'Acceso no encontrado' })
    return res.json({ ok: true, message: 'Acceso eliminado' })
  } catch {
    return res.status(500).json({ ok: false, message: 'No pudimos eliminar el acceso' })
  }
}

module.exports = {
  listPasskeys,
  registrationOptions,
  registrationVerify,
  authenticationOptions,
  authenticationVerify,
  deletePasskey,
}
