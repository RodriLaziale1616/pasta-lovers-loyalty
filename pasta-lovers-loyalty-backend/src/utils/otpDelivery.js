const { toParaguayE164 } = require('./clientIdentity')

async function sendMetaWhatsAppOtp({ phone, code }) {
  const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim()
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const templateName = String(process.env.WHATSAPP_OTP_TEMPLATE || '').trim()
  const languageCode = String(process.env.WHATSAPP_OTP_LANGUAGE || 'es').trim()
  const graphVersion = String(process.env.WHATSAPP_GRAPH_VERSION || 'v23.0').trim()
  const recipient = toParaguayE164(phone)

  if (!accessToken || !phoneNumberId || !templateName || !recipient) {
    throw Object.assign(new Error('El canal OTP de WhatsApp todavía no está configurado'), { status: 503 })
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      }),
    },
  )

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    console.error('Error enviando OTP por WhatsApp:', response.status, details)
    throw Object.assign(new Error('No pudimos enviar el código por WhatsApp'), { status: 502 })
  }

  return { channel: 'whatsapp' }
}

async function deliverOtp({ phone, code }) {
  const mode = String(process.env.OTP_DELIVERY_MODE || 'disabled').trim().toLowerCase()

  if (mode === 'whatsapp-meta') {
    return sendMetaWhatsAppOtp({ phone, code })
  }

  // Solo para el entorno aislado de pruebas. El código jamás se devuelve al navegador.
  if (mode === 'log' && String(process.env.OTP_ALLOW_INSECURE_LOG || '') === 'true') {
    console.log(`[MODO CAFE OTP TEST] ${phone}: ${code}`)
    return { channel: 'log' }
  }

  throw Object.assign(
    new Error('El envío OTP todavía no está configurado. Configurá WhatsApp o el modo de prueba.'),
    { status: 503 },
  )
}

module.exports = { deliverOtp }
