import { useEffect, useMemo, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/authApi'
import { registerModoClient, listClientPasses } from '../api/modoClientApi'
import { searchClients } from '../api/staffSearchApi'
import {
  getPass,
  issuePass,
  listPassProducts,
  redeemPass,
  resolveDynamicQr,
} from '../api/passApi'
import { getStaffToken, removeStaffToken } from '../utils/staffAuth'

const STATUS_LABEL = {
  UNCLAIMED: 'Pendiente de activación',
  ACTIVE: 'Activo',
  EXHAUSTED: 'Agotado',
  EXPIRED: 'Vencido',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
}

const MOVEMENT_LABEL = {
  PURCHASE: 'Compra',
  CLAIM: 'Activación',
  REDEEM: 'Canje',
  REFUND: 'Reembolso',
  ADJUSTMENT: 'Ajuste',
  REVERSAL: 'Reversión',
}

function formatMoney(value, currency = 'PYG') {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function balanceLabel(pass) {
  if (!pass) return '—'
  return pass.unitType === 'MONEY'
    ? formatMoney(pass.remainingAmount, pass.product?.currency || 'PYG')
    : `${pass.remainingUnits ?? 0} consumos`
}

function movementDelta(item, pass) {
  if (pass.unitType === 'MONEY') {
    if (item.amountDelta == null) return ''
    return `${item.amountDelta > 0 ? '+' : ''}${formatMoney(item.amountDelta, pass.product?.currency || 'PYG')}`
  }
  if (item.unitsDelta == null) return ''
  return `${item.unitsDelta > 0 ? '+' : ''}${item.unitsDelta}`
}

function staticPassId(rawValue) {
  const raw = String(rawValue || '').trim()
  if (raw.startsWith('modo-pass:')) return raw.slice('modo-pass:'.length)
  try {
    const parsed = JSON.parse(raw)
    return parsed.publicId || parsed.passId || parsed.id || ''
  } catch {
    return raw
  }
}

export default function StaffDashboardPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [staffUser, setStaffUser] = useState(null)
  const [products, setProducts] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientPasses, setClientPasses] = useState([])
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' })

  const [selectedProductId, setSelectedProductId] = useState('')
  const [giftUnassigned, setGiftUnassigned] = useState(false)
  const [purchaser, setPurchaser] = useState({ name: '', phone: '' })
  const [issuedResult, setIssuedResult] = useState(null)

  const [passPublicId, setPassPublicId] = useState('')
  const [activePass, setActivePass] = useState(null)
  const [redeemValue, setRedeemValue] = useState('1')
  const [scannerOpen, setScannerOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const authToken = getStaffToken()
    if (!authToken) {
      navigate('/staff/login')
      return
    }

    setToken(authToken)

    Promise.all([getMe(authToken), listPassProducts(authToken)])
      .then(([meData, productsData]) => {
        setStaffUser(meData.user)
        setProducts(productsData.products || [])
      })
      .catch(() => {
        removeStaffToken()
        navigate('/staff/login')
      })
  }, [navigate])

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)),
    [products, selectedProductId],
  )

  useEffect(() => {
    if (!selectedProduct?.isGift) setGiftUnassigned(false)
  }, [selectedProduct])

  useEffect(() => {
    if (!scannerOpen || !token) return undefined

    const scanner = new Html5QrcodeScanner(
      'modo-pass-reader',
      { fps: 10, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: true },
      false,
    )

    scanner.render(
      async (decodedText) => {
        try {
          setError('')
          setMessage('')
          if (String(decodedText).startsWith('modo-pass-dynamic:')) {
            const data = await resolveDynamicQr(decodedText, token)
            setActivePass(data.pass)
            setPassPublicId(data.pass.publicId)
            setRedeemValue(data.pass.unitType === 'MONEY' ? '' : '1')
          } else {
            const id = staticPassId(decodedText)
            if (id) await loadPassById(id)
          }
          setScannerOpen(false)
          await scanner.clear().catch(() => {})
        } catch (err) {
          setError(err?.response?.data?.message || 'No pudimos leer este QR.')
        }
      },
      () => {},
    )

    return () => scanner.clear().catch(() => {})
  }, [scannerOpen, token])

  async function loadClientPasses(client) {
    if (!client?.id) return
    try {
      const data = await listClientPasses(client.id, token)
      setClientPasses(data.passes || [])
    } catch {
      setClientPasses([])
    }
  }

  async function selectClient(client) {
    setSelectedClient(client)
    setSearchResults([])
    setShowCreateClient(false)
    setIssuedResult(null)
    setError('')
    await loadClientPasses(client)
  }

  async function handleClientSearch() {
    if (searchQuery.trim().length < 2) {
      setError('Ingresá al menos 2 caracteres para buscar.')
      return
    }
    try {
      setLoading(true)
      setError('')
      const data = await searchClients(searchQuery.trim(), token)
      setSearchResults(data.clients || [])
      if ((data.clients || []).length === 0) setShowCreateClient(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos buscar clientes.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClient(event) {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      const data = await registerModoClient(newClient, token)
      setNewClient({ name: '', phone: '', email: '' })
      setSearchQuery(data.client.phone)
      await selectClient(data.client)
      setMessage(`Cliente ${data.client.name} creado correctamente.`)
    } catch (err) {
      const existing = err?.response?.data?.client
      if (existing) {
        await selectClient(existing)
        setMessage('Ese teléfono ya estaba registrado. Seleccionamos el cliente existente.')
      } else {
        setError(err?.response?.data?.message || 'No pudimos crear el cliente.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleIssuePass() {
    if (!selectedProductId) {
      setError('Seleccioná un tipo de pase.')
      return
    }
    if (!giftUnassigned && !selectedClient) {
      setError('Seleccioná o creá un cliente.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')
      setIssuedResult(null)

      const payload = {
        productId: Number(selectedProductId),
        unassignedGift: giftUnassigned,
      }
      if (giftUnassigned) {
        payload.purchaserName = purchaser.name
        payload.purchaserPhone = purchaser.phone
      } else {
        payload.clientId = selectedClient.id
      }

      const data = await issuePass(payload, token)
      setIssuedResult(data)
      setPassPublicId(data.pass.publicId)
      setMessage(
        giftUnassigned
          ? 'Gift vendido. Compartí el enlace de activación con quien lo va a recibir.'
          : `Pase activado para ${selectedClient.name}.`,
      )
      if (!giftUnassigned && selectedClient) await loadClientPasses(selectedClient)
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos vender el pase.')
    } finally {
      setLoading(false)
    }
  }

  async function loadPassById(publicId) {
    const id = String(publicId || '').trim()
    if (!id) {
      setError('Ingresá o escaneá un código de pase.')
      return
    }
    try {
      setLoading(true)
      setError('')
      const data = await getPass(id, token)
      setActivePass(data.pass)
      setPassPublicId(data.pass.publicId)
      setRedeemValue(data.pass.unitType === 'MONEY' ? '' : '1')
    } catch (err) {
      setActivePass(null)
      setError(err?.response?.data?.message || 'No encontramos ese pase.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem() {
    if (!activePass) return
    const value = Number(redeemValue)
    if (!Number.isInteger(value) || value <= 0) {
      setError(activePass.unitType === 'MONEY' ? 'Ingresá un importe válido.' : 'Ingresá una cantidad válida.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const payload = activePass.unitType === 'MONEY'
        ? { amount: value, notes: 'Canje desde mostrador Modo Café' }
        : { quantity: value, notes: 'Canje desde mostrador Modo Café' }
      const data = await redeemPass(activePass.publicId, payload, token)
      setMessage(data.duplicate ? 'Este canje ya había sido procesado.' : 'Canje realizado correctamente.')
      await loadPassById(activePass.publicId)
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos realizar el canje.')
    } finally {
      setLoading(false)
    }
  }

  async function copyText(value, success = 'Copiado al portapapeles.') {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(success)
    } catch {
      setError('No pudimos copiar automáticamente.')
    }
  }

  function shareGift() {
    if (!issuedResult?.claimUrl) return
    const text = `🎁 Tenés un regalo de Modo Café. Descubrilo acá:\n${issuedResult.claimUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  function handleLogout() {
    removeStaffToken()
    navigate('/staff/login')
  }

  const clientAccessUrl = issuedResult && !issuedResult.claimUrl && selectedClient
    ? `${window.location.origin}/acceso?phone=${encodeURIComponent(selectedClient.phone)}`
    : ''

  return (
    <div className="min-h-screen bg-[var(--modo-cream)] text-[var(--modo-ink)]">
      <header className="sticky top-0 z-20 bg-[var(--modo-card)] text-white shadow-lg">
        <div className="modo-shell flex min-h-[76px] items-center justify-between gap-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/modo-cafe-logo.jpg" alt="Modo Café" className="h-12 w-[84px] shrink-0 rounded-lg bg-white object-contain px-1.5" />
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-white/45">Mostrador</p>
              <h1 className="truncate text-base font-black sm:text-lg">Modo Café Pass</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-[170px] truncate text-xs text-white/45 md:block">{staffUser?.name}</span>
            <button onClick={handleLogout} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-black">SALIR</button>
          </div>
        </div>
      </header>

      <main className="modo-shell py-4 sm:py-6">
        <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[
            ['Productos', products.length],
            ['Cliente', selectedClient?.name || '—'],
            ['Sus pases', clientPasses.length],
            ['Pase abierto', activePass ? balanceLabel(activePass) : '—'],
          ].map(([label, value]) => (
            <div key={label} className="modo-card min-w-0 p-3 sm:p-4">
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-black/35">{label}</p>
              <p className="mt-1 truncate text-base font-black sm:text-lg">{value}</p>
            </div>
          ))}
        </div>

        {(message || error) && (
          <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-white text-[var(--modo-brown)] ring-1 ring-black/5'}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="modo-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--modo-red)]">01 · Venta</p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">Vender un pase</h2>
              </div>
              <button onClick={() => setShowCreateClient((v) => !v)} className="modo-btn-secondary px-3 py-2 text-xs">+ CLIENTE</button>
            </div>

            <div className="mt-4 flex gap-2">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleClientSearch()} placeholder="Nombre, teléfono o email" className="modo-input min-w-0 flex-1" />
              <button onClick={handleClientSearch} disabled={loading} className="rounded-[15px] bg-[var(--modo-brown)] px-3.5 text-xs font-black text-white disabled:opacity-50">BUSCAR</button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-44 space-y-1 overflow-auto rounded-2xl border border-black/8 bg-white p-1.5">
                {searchResults.map((client) => (
                  <button key={client.id} onClick={() => selectClient(client)} className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[var(--modo-cream)]">
                    <p className="font-black">{client.name}</p>
                    <p className="text-xs text-black/45">{client.phone}{client.email ? ` · ${client.email}` : ''}</p>
                  </button>
                ))}
              </div>
            )}

            {showCreateClient && (
              <form onSubmit={handleCreateClient} className="mt-3 rounded-2xl bg-[var(--modo-cream-2)] p-3.5">
                <p className="text-sm font-black">Alta rápida</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input required value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Nombre y apellido" className="modo-input bg-white" />
                  <input required value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} placeholder="0981 123 456" inputMode="tel" className="modo-input bg-white" />
                </div>
                <input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="Email (opcional)" className="modo-input mt-2 bg-white" />
                <button disabled={loading} className="modo-btn-primary mt-2.5 w-full px-4 py-3 disabled:opacity-50">CREAR Y SELECCIONAR</button>
              </form>
            )}

            {selectedClient && (
              <div className="mt-3 rounded-2xl bg-[var(--modo-cream)] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[.15em] text-black/35">Cliente seleccionado</p>
                    <p className="mt-0.5 truncate font-black">{selectedClient.name}</p>
                    <p className="text-xs text-black/45">{selectedClient.phone}</p>
                  </div>
                  <button onClick={() => { setSelectedClient(null); setClientPasses([]) }} className="text-[10px] font-black text-[var(--modo-red)]">CAMBIAR</button>
                </div>
                {clientPasses.length > 0 && (
                  <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                    {clientPasses.map((pass) => (
                      <button key={pass.id} onClick={() => loadPassById(pass.publicId)} className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[10px] font-black ring-1 ring-black/6">
                        {pass.product.name} · {STATUS_LABEL[pass.status] || pass.status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="mt-4 block text-sm font-black">Tipo de pase</label>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="modo-input mt-1.5">
              <option value="">Seleccionar…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} · {formatMoney(product.salePrice, product.currency)}</option>
              ))}
            </select>

            {selectedProduct && (
              <div className="mt-2 rounded-2xl border border-[var(--modo-red)]/10 bg-red-50/30 p-3.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black">{selectedProduct.name}</p>
                    <p className="mt-1 text-xs leading-5 text-black/45">{selectedProduct.description}</p>
                  </div>
                  {selectedProduct.isGift && <span className="rounded-full bg-[var(--modo-red)] px-2 py-1 text-[9px] font-black text-white">GIFT</span>}
                </div>
                <p className="mt-2 text-xs font-bold text-[var(--modo-brown)]">Saldo inicial: {selectedProduct.unitType === 'MONEY' ? formatMoney(selectedProduct.initialAmount, selectedProduct.currency) : `${selectedProduct.initialUnits} consumos`}</p>
              </div>
            )}

            {selectedProduct?.isGift && (
              <div className="mt-3 rounded-2xl border border-black/8 p-3.5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={giftUnassigned} onChange={(e) => setGiftUnassigned(e.target.checked)} className="mt-1" />
                  <span><strong className="text-sm">Regalo sin destinatario</strong><span className="mt-0.5 block text-xs leading-5 text-black/45">Genera un link para que el amigo lo active después.</span></span>
                </label>
                {giftUnassigned && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input value={purchaser.name} onChange={(e) => setPurchaser({ ...purchaser, name: e.target.value })} placeholder="Comprador (opcional)" className="modo-input" />
                    <input value={purchaser.phone} onChange={(e) => setPurchaser({ ...purchaser, phone: e.target.value })} placeholder="Teléfono (opcional)" className="modo-input" />
                  </div>
                )}
              </div>
            )}

            <button onClick={handleIssuePass} disabled={loading || !selectedProductId || (!giftUnassigned && !selectedClient)} className="modo-btn-primary mt-4 w-full px-4 py-3.5 disabled:opacity-40">
              {loading ? 'PROCESANDO…' : giftUnassigned ? 'VENDER GIFT Y GENERAR ENLACE' : 'VENDER Y ACTIVAR PASE'}
            </button>

            {issuedResult && (
              <div className="modo-premium-card mt-4 p-4">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/40">Venta completada</p>
                <h3 className="mt-1 text-lg font-black">{issuedResult.pass.product?.name || selectedProduct?.name}</h3>

                {issuedResult.claimUrl ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
                    <div className="mx-auto w-fit rounded-2xl bg-white p-2.5 sm:mx-0"><QRCodeSVG value={issuedResult.claimUrl} size={130} /></div>
                    <div>
                      <p className="text-sm font-black">Enlace de regalo</p>
                      <p className="mt-1 text-xs leading-5 text-white/45">“🎁 Tenés un regalo de Modo Café. Descubrilo acá:”</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={shareGift} className="modo-btn-primary px-3 py-2 text-xs">WHATSAPP</button>
                        <button onClick={() => copyText(`🎁 Tenés un regalo de Modo Café. Descubrilo acá:\n${issuedResult.claimUrl}`, 'Mensaje de regalo copiado.')} className="modo-btn-secondary px-3 py-2 text-xs">COPIAR MENSAJE</button>
                      </div>
                    </div>
                  </div>
                ) : clientAccessUrl ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
                    <div className="mx-auto w-fit rounded-2xl bg-white p-2.5 sm:mx-0"><QRCodeSVG value={clientAccessUrl} size={130} /></div>
                    <div>
                      <p className="text-sm font-black">QR de acceso a Mi Pase</p>
                      <p className="mt-1 text-xs leading-5 text-white/45">El cliente lo escanea y entra con su teléfono + código OTP. No expone el saldo.</p>
                      <button onClick={() => copyText(clientAccessUrl, 'Enlace de acceso copiado.')} className="modo-btn-secondary mt-3 px-3 py-2 text-xs">COPIAR ACCESO</button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className="modo-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--modo-red)]">02 · Consumo</p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">Escanear y canjear</h2>
                <p className="mt-1 text-xs leading-5 text-black/45">Acepta el QR dinámico del cliente o el código manual.</p>
              </div>
              <button onClick={() => setScannerOpen((v) => !v)} className="modo-btn-secondary shrink-0 px-3 py-2 text-xs">{scannerOpen ? 'CERRAR' : 'ESCANEAR QR'}</button>
            </div>

            {scannerOpen && <div className="mt-4 overflow-hidden rounded-2xl border border-black/8 bg-white p-1.5"><div id="modo-pass-reader" /></div>}

            <div className="mt-4 flex gap-2">
              <input value={passPublicId} onChange={(e) => setPassPublicId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadPassById(passPublicId)} placeholder="Código del pase" className="modo-input min-w-0 flex-1 font-mono text-xs" />
              <button onClick={() => loadPassById(passPublicId)} disabled={loading} className="rounded-[15px] bg-[var(--modo-brown)] px-3.5 text-xs font-black text-white disabled:opacity-50">CONSULTAR</button>
            </div>

            {!activePass ? (
              <div className="mt-4 grid min-h-[230px] place-items-center rounded-[22px] border border-dashed border-black/12 bg-[var(--modo-cream)]/60 p-6 text-center">
                <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl shadow-sm">☕</div><p className="mt-3 font-black">Esperando un pase</p><p className="mt-1 text-xs leading-5 text-black/40">Escaneá el QR para ver saldo y confirmar el canje.</p></div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="modo-premium-card overflow-hidden">
                  <div className="border-b border-white/10 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/40">Modo Café Pass</p>
                        <h3 className="mt-1 truncate text-lg font-black">{activePass.product?.name}</h3>
                        <p className="mt-1 text-xs text-white/50">{activePass.client?.name || 'Sin destinatario'}{activePass.client?.phone ? ` · ${activePass.client.phone}` : ''}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--modo-red)] px-2.5 py-1 text-[9px] font-black text-white">{STATUS_LABEL[activePass.status] || activePass.status}</span>
                    </div>
                    <p className="mt-4 text-[9px] font-black uppercase tracking-[.18em] text-white/35">Saldo disponible</p>
                    <p className="mt-1 text-3xl font-black">{balanceLabel(activePass)}</p>
                  </div>
                </div>

                {activePass.status === 'ACTIVE' && (
                  <div className="mt-3 rounded-2xl bg-[var(--modo-cream)] p-3.5">
                    <label className="text-sm font-black">{activePass.unitType === 'MONEY' ? 'Importe a descontar' : 'Cantidad a canjear'}</label>
                    <input value={redeemValue} onChange={(e) => setRedeemValue(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={activePass.unitType === 'MONEY' ? 'Ej. 25000' : '1'} className="modo-input mt-2 bg-white text-lg font-black" />
                    <button onClick={handleRedeem} disabled={loading} className="modo-btn-primary mt-2.5 w-full px-4 py-3.5 disabled:opacity-50">{loading ? 'PROCESANDO…' : activePass.unitType === 'MONEY' ? 'DESCONTAR SALDO' : `CANJEAR ${redeemValue || '1'}`}</button>
                  </div>
                )}

                {activePass.transactions?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-black">Últimos movimientos</h3>
                    <div className="mt-2 space-y-1.5">
                      {activePass.transactions.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/7 bg-white px-3 py-2.5">
                          <div><p className="text-sm font-black">{MOVEMENT_LABEL[item.type] || item.type}</p><p className="text-[10px] text-black/35">{new Date(item.createdAt).toLocaleString('es-PY')}</p></div>
                          <span className="text-sm font-black">{movementDelta(item, activePass)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
