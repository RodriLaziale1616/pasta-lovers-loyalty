import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { createClientQr, getClientMe, logoutClient } from '../api/clientAuthApi'
import { getClientSessionToken, removeClientSessionToken } from '../utils/clientSession'

const STATUS_LABEL = {
  ACTIVE: 'Activo',
  EXHAUSTED: 'Agotado',
  EXPIRED: 'Vencido',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
  UNCLAIMED: 'Pendiente de activación',
}

const TYPE_LABEL = {
  PURCHASE: 'Compra',
  CLAIM: 'Activación',
  REDEEM: 'Canje',
  REFUND: 'Reembolso',
  ADJUSTMENT: 'Ajuste',
  REVERSAL: 'Reversión',
}

function money(value, currency = 'PYG') {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function balance(pass) {
  return pass.unitType === 'MONEY'
    ? money(pass.remainingAmount, pass.product?.currency)
    : `${pass.remainingUnits ?? 0} consumos`
}

function movementDelta(item, pass) {
  if (pass.unitType === 'MONEY') {
    if (item.amountDelta == null) return ''
    return `${item.amountDelta > 0 ? '+' : ''}${money(item.amountDelta, pass.product?.currency)}`
  }
  if (item.unitsDelta == null) return ''
  return `${item.unitsDelta > 0 ? '+' : ''}${item.unitsDelta}`
}

export default function MyPassesPage() {
  const navigate = useNavigate()
  const token = getClientSessionToken()
  const [client, setClient] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [qr, setQr] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refreshTimer = useRef(null)

  useEffect(() => {
    if (!token) {
      navigate('/acceso', { replace: true })
      return
    }

    async function load() {
      try {
        const data = await getClientMe(token)
        setClient(data.client)
        const firstActive = (data.client?.passes || []).find((pass) => pass.status === 'ACTIVE')
        const first = firstActive || data.client?.passes?.[0]
        if (first) setSelectedId(first.publicId)
      } catch {
        removeClientSessionToken()
        navigate('/acceso', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate, token])

  const selectedPass = useMemo(
    () => client?.passes?.find((pass) => pass.publicId === selectedId) || null,
    [client, selectedId],
  )

  useEffect(() => {
    setQr(null)
    setSeconds(0)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [selectedId])

  useEffect(() => {
    if (!qr?.expiresAt) return undefined
    const interval = setInterval(() => {
      setSeconds(Math.max(0, Math.ceil((new Date(qr.expiresAt).getTime() - Date.now()) / 1000)))
    }, 500)
    return () => clearInterval(interval)
  }, [qr])

  async function generateQr() {
    if (!selectedPass || selectedPass.status !== 'ACTIVE') return
    try {
      setError('')
      const data = await createClientQr(selectedPass.publicId, token)
      setQr(data)
      setSeconds(data.expiresInSeconds || 60)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => generateQr(), 48_000)
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos generar el QR.')
    }
  }

  async function handleLogout() {
    try {
      if (token) await logoutClient(token)
    } catch {
      // La sesión se elimina igualmente del dispositivo.
    }
    removeClientSessionToken()
    navigate('/acceso', { replace: true })
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[var(--modo-cream)] font-bold">Cargando tus pases…</div>
  }

  return (
    <div className="min-h-screen pb-8">
      <header className="bg-[var(--modo-card)] text-white">
        <div className="modo-shell flex min-h-[82px] items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/modo-cafe-logo.jpg" alt="Modo Café" className="h-12 w-[84px] shrink-0 rounded-lg bg-white object-contain px-1.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/50">Mi cuenta</p>
              <h1 className="truncate text-lg font-black">Hola, {client?.name?.split(' ')[0]}</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-xs font-black">SALIR</button>
        </div>
      </header>

      <main className="modo-shell pt-4 sm:pt-6">
        {error && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">{error}</div>}

        {!client?.passes?.length ? (
          <section className="modo-card p-6 text-center">
            <p className="text-3xl">☕</p>
            <h2 className="mt-2 text-xl font-black">Todavía no tenés pases</h2>
            <p className="mt-2 text-sm text-black/50">Cuando compres o actives uno, va a aparecer acá.</p>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
            <section className="modo-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--modo-red)]">Tus pases</p>
                  <h2 className="mt-1 text-xl font-black">Elegí cuál mostrar</h2>
                </div>
                <span className="rounded-full bg-[var(--modo-cream)] px-3 py-1 text-xs font-black">{client.passes.length}</span>
              </div>

              <div className="mt-4 space-y-2">
                {client.passes.map((pass) => {
                  const active = pass.publicId === selectedId
                  return (
                    <button
                      key={pass.publicId}
                      onClick={() => setSelectedId(pass.publicId)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${active ? 'border-[var(--modo-red)] bg-red-50/40' : 'border-black/8 bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black">{pass.product?.name}</p>
                          <p className="mt-1 text-sm font-bold text-[var(--modo-brown)]">{balance(pass)}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[var(--modo-cream)] px-2.5 py-1 text-[10px] font-black uppercase">{STATUS_LABEL[pass.status] || pass.status}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {selectedPass && (
              <section className="modo-premium-card overflow-hidden">
                <div className="border-b border-white/10 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/45">Modo Café Pass</p>
                      <h2 className="mt-1 text-xl font-black">{selectedPass.product?.name}</h2>
                    </div>
                    <span className="rounded-full bg-[var(--modo-red)] px-3 py-1 text-[10px] font-black uppercase text-white">{STATUS_LABEL[selectedPass.status] || selectedPass.status}</span>
                  </div>
                  <p className="mt-5 text-xs uppercase tracking-[.18em] text-white/40">Saldo disponible</p>
                  <p className="mt-1 text-4xl font-black">{balance(selectedPass)}</p>
                  {selectedPass.expiresAt && (
                    <p className="mt-2 text-xs text-white/45">Vence el {new Date(selectedPass.expiresAt).toLocaleDateString('es-PY')}</p>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  {selectedPass.status === 'ACTIVE' ? (
                    qr ? (
                      <div className="text-center">
                        <div className="mx-auto w-fit rounded-[22px] bg-white p-3 shadow-lg">
                          <QRCodeSVG value={qr.qrValue} size={210} level="M" />
                        </div>
                        <p className="mt-4 text-sm font-bold">Mostrá este QR en caja</p>
                        <p className="mt-1 text-xs text-white/45">Se renueva automáticamente · vence en {seconds}s</p>
                        <button onClick={generateQr} className="modo-btn-secondary mt-4 px-4 py-2.5 text-sm">RENOVAR QR</button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/8 text-3xl">▦</div>
                        <p className="mt-3 font-black">QR seguro de corta duración</p>
                        <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-white/50">Generalo cuando estés en caja. Una captura vieja deja de funcionar.</p>
                        <button onClick={generateQr} className="modo-btn-primary mt-5 px-5 py-3">MOSTRAR MI QR</button>
                      </div>
                    )
                  ) : (
                    <div className="rounded-2xl bg-white/6 p-4 text-center text-sm text-white/60">Este pase no está disponible para canjes.</div>
                  )}

                  {selectedPass.transactions?.length > 0 && (
                    <div className="mt-6 border-t border-white/10 pt-5">
                      <h3 className="text-sm font-black">Últimos movimientos</h3>
                      <div className="mt-3 space-y-2">
                        {selectedPass.transactions.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                            <div>
                              <p className="text-sm font-bold">{TYPE_LABEL[item.type] || item.type}</p>
                              <p className="text-[11px] text-white/40">{new Date(item.createdAt).toLocaleString('es-PY')}</p>
                            </div>
                            <span className="font-black">{movementDelta(item, selectedPass)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
