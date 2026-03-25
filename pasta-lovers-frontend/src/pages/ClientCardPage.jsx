import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getClientCard } from '../api/clientApi'

function ProgressCircles({ currentChecks }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {[1, 2, 3, 4, 5].map((item) => {
        const checked = item <= currentChecks

        return (
          <div
            key={item}
            className={`h-11 w-11 rounded-full border-2 shadow-sm transition ${
              checked
                ? 'border-[var(--pl-red)] bg-[var(--pl-red)]'
                : 'border-white bg-white'
            }`}
          />
        )
      })}

      <div className="flex h-11 min-w-[66px] items-center justify-center rounded-full bg-white px-3 text-sm font-bold text-[var(--pl-red)] shadow-sm">
        Gratis
      </div>
    </div>
  )
}

function StatusMessage({ checks, rewardAvailable }) {
  const remaining = Math.max(5 - checks, 0)

  if (rewardAvailable) {
    return (
      <div className="rounded-[22px] border border-green-200 bg-green-50 px-4 py-4 text-center">
        <p className="font-brand text-xl text-green-700">
          ¡Ya tenés tu ejecutivo gratis!
        </p>
        <p className="mt-1 text-sm leading-6 text-green-700/90">
          Mostrá tu código en el local para canjear tu beneficio.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[22px] border border-[var(--pl-green)]/15 bg-[var(--pl-cream)] px-4 py-4 text-center">
      <p className="font-brand text-xl text-[var(--pl-green)]">
        Llevás {checks} de 5 almuerzos
      </p>
      <p className="mt-1 text-sm leading-6 text-[var(--pl-muted)]">
        Te faltan <span className="font-semibold">{remaining}</span>{' '}
        {remaining === 1 ? 'visita' : 'visitas'} para obtener tu menú ejecutivo
        gratis.
      </p>
    </div>
  )
}

export default function ClientCardPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [client, setClient] = useState(null)

  useEffect(() => {
    async function loadClientCard() {
      try {
        setLoading(true)
        setError('')
        const data = await getClientCard(token)
        setClient(data.client)
      } catch (err) {
        setError(err?.response?.data?.message || 'No se pudo cargar la tarjeta')
      } finally {
        setLoading(false)
      }
    }

    loadClientCard()
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--pl-cream)] px-4">
        <div className="rounded-[28px] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <p className="text-sm text-[var(--pl-muted)]">Cargando tarjeta...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--pl-cream)] px-4">
        <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--pl-muted)]">
            Pasta Lovers
          </p>
          <h1 className="font-brand mt-2 text-2xl text-[var(--pl-text)]">
            Tarjeta no disponible
          </h1>
          <p className="mt-3 text-sm leading-6 text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  const checks = client?.loyaltyStatus?.currentChecks || 0
  const rewardAvailable = client?.loyaltyStatus?.rewardAvailable || false

  const qrValue = JSON.stringify({
    type: 'pasta-lovers-client-card',
    token: client.uniqueToken,
  })

  return (
    <div className="min-h-screen bg-[var(--pl-cream)] px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-[30px] shadow-[0_12px_36px_rgba(0,0,0,0.1)]">
          <div className="bg-[var(--pl-green)] px-6 py-7 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/75">
              Pasta Lovers Club
            </p>
            <h1 className="font-brand mt-2 text-3xl leading-tight">
              Cartón de fidelidad
            </h1>
            <p className="mt-2 text-sm text-white/85">{client.name}</p>

            <div className="mt-6">
              <ProgressCircles currentChecks={checks} />
            </div>
          </div>

          <div className="bg-white px-5 py-5">
            <StatusMessage checks={checks} rewardAvailable={rewardAvailable} />

            <div className="mt-5 rounded-[24px] border border-black/8 bg-[var(--pl-kraft)]/20 p-5">
              <p className="text-center text-sm font-semibold text-[var(--pl-text)]">
                Mostrá este código en caja
              </p>

              <div className="mt-4 flex justify-center">
                <div className="rounded-[24px] bg-white p-4 shadow-sm">
                  <QRCodeSVG
                    value={qrValue}
                    size={190}
                    bgColor="#ffffff"
                    fgColor="#2e2a26"
                    includeMargin={true}
                  />
                </div>
              </div>

              <p className="mt-4 text-center text-xs leading-5 text-[var(--pl-muted)]">
                Este QR identifica tu tarjeta digital para sumar checks en Pasta Lovers.
              </p>

              <div className="mt-4 rounded-[20px] bg-white p-4 text-center shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pl-muted)]">
                  Código único
                </p>
                <p className="mt-2 break-all text-xs leading-5 text-[var(--pl-muted)]">
                  {client.uniqueToken}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[var(--pl-red)]/10 bg-[var(--pl-red)]/5 p-5">
              <p className="font-brand text-xl text-[var(--pl-red)]">
                Promo de la semana
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--pl-text)]">
                Muy pronto esta sección va a mostrar flyers, promociones activas
                y llamados a la acción de Pasta Lovers.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <a
                  href="https://www.instagram.com/pastaloverspy"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl bg-[var(--pl-green)] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--pl-green-dark)]"
                >
                  Ver Instagram
                </a>

                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-[var(--pl-green)]/20 bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--pl-green)] transition hover:bg-[var(--pl-cream)]"
                >
                  Pedir por WhatsApp
                </a>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[var(--pl-cream)] p-4 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--pl-muted)]">
                Regla del beneficio
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--pl-text)]">
                Completá 5 almuerzos y llevate 1 menú ejecutivo gratis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}