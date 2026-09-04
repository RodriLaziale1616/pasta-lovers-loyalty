import { useEffect, useMemo, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/authApi'
import { registerModoClient, listClientPasses } from '../api/modoClientApi'
import { searchClients } from '../api/staffSearchApi'
import { getPass, issuePass, listPassProducts, redeemPass } from '../api/passApi'
import { getStaffToken, removeStaffToken } from '../utils/staffAuth'

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
  if (pass.unitType === 'MONEY') {
    return formatMoney(pass.remainingAmount, pass.product?.currency || 'PYG')
  }
  return `${pass.remainingUnits ?? 0} consumos`
}

function extractPassId(decodedText) {
  const raw = String(decodedText || '').trim()
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

    async function bootstrap() {
      try {
        const [meData, productsData] = await Promise.all([
          getMe(authToken),
          listPassProducts(authToken),
        ])
        setStaffUser(meData.user)
        setProducts(productsData.products || [])
      } catch {
        removeStaffToken()
        navigate('/staff/login')
      }
    }

    bootstrap()
  }, [navigate])

  useEffect(() => {
    if (!scannerOpen || !token) return undefined

    const scanner = new Html5QrcodeScanner(
      'modo-pass-reader',
      {
        fps: 10,
        qrbox: { width: 230, height: 230 },
        rememberLastUsedCamera: true,
      },
      false,
    )

    scanner.render(
      async (decodedText) => {
        const id = extractPassId(decodedText)
        if (!id) return
        setPassPublicId(id)
        setScannerOpen(false)
        try {
          await scanner.clear()
        } catch {
          // Camera may already be closing.
        }
        await loadPassById(id)
      },
      () => {},
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [scannerOpen, token])

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)),
    [products, selectedProductId],
  )

  useEffect(() => {
    if (!selectedProduct?.isGift) setGiftUnassigned(false)
  }, [selectedProduct])

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
      setError('Ingresá al menos 2 caracteres para buscar un cliente.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')
      const data = await searchClients(searchQuery.trim(), token)
      setSearchResults(data.clients || [])
      if ((data.clients || []).length === 0) setShowCreateClient(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo buscar clientes.')
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
      setMessage(`Cliente ${data.client.name} creado correctamente.`)
      await selectClient(data.client)
    } catch (err) {
      const existing = err?.response?.data?.client
      if (existing) {
        await selectClient(existing)
        setMessage('Ese teléfono ya estaba registrado. Seleccionamos el cliente existente.')
      } else {
        setError(err?.response?.data?.message || 'No se pudo crear el cliente.')
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
      setError('Seleccioná o creá un cliente para este pase.')
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
          ? 'Gift Pass vendido. Compartí el QR o enlace de activación con quien lo recibirá.'
          : `Pase emitido correctamente para ${selectedClient.name}.`,
      )

      if (!giftUnassigned && selectedClient) await loadClientPasses(selectedClient)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo emitir el pase.')
    } finally {
      setLoading(false)
    }
  }

  async function loadPassById(publicId) {
    const id = String(publicId || '').trim()
    if (!id) {
      setError('Ingresá o escaneá el código del pase.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')
      const data = await getPass(id, token)
      setActivePass(data.pass)
      setRedeemValue(data.pass.unitType === 'MONEY' ? '' : '1')
    } catch (err) {
      setActivePass(null)
      setError(err?.response?.data?.message || 'No se encontró el pase.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLookupPass() {
    await loadPassById(passPublicId)
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
      setMessage('')
      const payload = activePass.unitType === 'MONEY'
        ? { amount: value, notes: 'Canje desde mostrador Modo Café' }
        : { quantity: value, notes: 'Canje desde mostrador Modo Café' }
      const data = await redeemPass(activePass.publicId, payload, token)
      setMessage(data.duplicate ? 'Este canje ya había sido procesado.' : 'Canje realizado correctamente.')
      await loadPassById(activePass.publicId)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo realizar el canje.')
    } finally {
      setLoading(false)
    }
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage('Enlace copiado al portapapeles.')
    } catch {
      setError('No se pudo copiar automáticamente. Seleccioná el enlace manualmente.')
    }
  }

  function handleLogout() {
    removeStaffToken()
    navigate('/staff/login')
  }

  return (
    <div className="min-h-screen bg-[var(--modo-cream)] text-[var(--modo-ink)]">
      <header className="border-b border-black/8 bg-[var(--modo-ink)] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--modo-orange)] text-xl font-black text-[var(--modo-ink)]">M</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Modo Café</p>
              <h1 className="text-xl font-bold">Pass · Mostrador</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/65 sm:block">{staffUser?.name}</span>
            <button onClick={handleLogout} className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10">Salir</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Productos activos</p>
            <p className="mt-2 text-3xl font-black">{products.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Cliente</p>
            <p className="mt-2 truncate text-lg font-black">{selectedClient?.name || 'Sin seleccionar'}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Pases del cliente</p>
            <p className="mt-2 text-3xl font-black">{clientPasses.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Pase consultado</p>
            <p className="mt-2 text-lg font-black">{activePass ? balanceLabel(activePass) : '—'}</p>
          </div>
        </div>

        {(message || error) && (
          <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-medium ${error ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-green-50 text-green-800 ring-1 ring-green-200'}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--modo-green)]">01 · Venta</p>
                <h2 className="mt-1 text-2xl font-black">Vender un pase</h2>
              </div>
              <button
                onClick={() => setShowCreateClient((value) => !value)}
                className="rounded-xl bg-[var(--modo-green)] px-3 py-2 text-sm font-bold text-white"
              >
                + Cliente
              </button>
            </div>

            <label className="text-sm font-bold">Buscar cliente</label>
            <div className="mt-2 flex gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleClientSearch()}
                placeholder="Nombre, teléfono o email"
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 outline-none focus:border-[var(--modo-green)]"
              />
              <button onClick={handleClientSearch} disabled={loading} className="rounded-xl bg-[var(--modo-ink)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Buscar</button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 max-h-44 space-y-2 overflow-auto rounded-2xl border border-black/8 p-2">
                {searchResults.map((client) => (
                  <button key={client.id} onClick={() => selectClient(client)} className="w-full rounded-xl px-3 py-3 text-left hover:bg-[var(--modo-cream)]">
                    <p className="font-bold">{client.name}</p>
                    <p className="text-sm text-black/50">{client.phone}{client.email ? ` · ${client.email}` : ''}</p>
                  </button>
                ))}
              </div>
            )}

            {showCreateClient && (
              <form onSubmit={handleCreateClient} className="mt-4 rounded-2xl bg-[var(--modo-orange-soft)] p-4">
                <p className="font-black">Alta rápida de cliente</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input required value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Nombre y apellido" className="rounded-xl border border-black/10 bg-white px-3 py-3 outline-none" />
                  <input required value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} placeholder="0981 123 456" inputMode="tel" className="rounded-xl border border-black/10 bg-white px-3 py-3 outline-none" />
                </div>
                <input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="Email (opcional)" className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-3 outline-none" />
                <button disabled={loading} className="mt-3 w-full rounded-xl bg-[var(--modo-ink)] px-4 py-3 font-bold text-white disabled:opacity-50">CREAR Y SELECCIONAR</button>
              </form>
            )}

            {selectedClient && (
              <div className="mt-4 rounded-2xl bg-[var(--modo-cream)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-black/45">Cliente seleccionado</p>
                    <p className="mt-1 font-black">{selectedClient.name}</p>
                    <p className="text-sm text-black/55">{selectedClient.phone}</p>
                  </div>
                  <button onClick={() => { setSelectedClient(null); setClientPasses([]) }} className="text-xs font-bold text-black/40">Cambiar</button>
                </div>
                {clientPasses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {clientPasses.slice(0, 4).map((pass) => (
                      <button key={pass.id} onClick={() => { setPassPublicId(pass.publicId); loadPassById(pass.publicId) }} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-black/8">
                        {pass.product.name} · {pass.status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="mt-5 block text-sm font-bold">Tipo de pase</label>
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 outline-none focus:border-[var(--modo-green)]"
            >
              <option value="">Seleccionar...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {formatMoney(product.salePrice, product.currency)}
                </option>
              ))}
            </select>

            {selectedProduct && (
              <div className="mt-3 rounded-2xl border border-[var(--modo-green)]/20 bg-[var(--modo-green)]/5 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{selectedProduct.name}</p>
                    <p className="mt-1 text-black/55">{selectedProduct.description}</p>
                  </div>
                  {selectedProduct.isGift && <span className="rounded-full bg-[var(--modo-orange)] px-2 py-1 text-xs font-black">GIFT</span>}
                </div>
                <p className="mt-2 font-semibold">
                  Saldo inicial: {selectedProduct.unitType === 'MONEY' ? formatMoney(selectedProduct.initialAmount, selectedProduct.currency) : `${selectedProduct.initialUnits} consumos`}
                </p>
              </div>
            )}

            {selectedProduct?.isGift && (
              <div className="mt-4 rounded-2xl border border-[var(--modo-orange)]/35 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={giftUnassigned} onChange={(e) => setGiftUnassigned(e.target.checked)} className="mt-1 h-4 w-4" />
                  <span>
                    <strong>Regalo sin destinatario</strong>
                    <span className="mt-1 block text-sm text-black/50">El comprador se lleva un QR/link y el amigo se registra cuando lo recibe.</span>
                  </span>
                </label>
                {giftUnassigned && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <input value={purchaser.name} onChange={(e) => setPurchaser({ ...purchaser, name: e.target.value })} placeholder="Nombre del comprador (opcional)" className="rounded-xl bg-[var(--modo-cream)] px-3 py-3 outline-none" />
                    <input value={purchaser.phone} onChange={(e) => setPurchaser({ ...purchaser, phone: e.target.value })} placeholder="Teléfono comprador (opcional)" className="rounded-xl bg-[var(--modo-cream)] px-3 py-3 outline-none" />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleIssuePass}
              disabled={loading || !selectedProductId || (!giftUnassigned && !selectedClient)}
              className="mt-5 w-full rounded-2xl bg-[var(--modo-orange)] px-4 py-4 text-base font-black text-[var(--modo-ink)] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'PROCESANDO…' : giftUnassigned ? 'VENDER GIFT Y GENERAR QR' : 'VENDER Y ACTIVAR PASE'}
            </button>

            {issuedResult && (
              <div className="mt-5 rounded-3xl bg-[var(--modo-ink)] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">Venta completada</p>
                <h3 className="mt-1 text-xl font-black">{issuedResult.pass.product?.name || selectedProduct?.name}</h3>

                {issuedResult.claimUrl ? (
                  <div className="mt-5 grid gap-5 sm:grid-cols-[190px_1fr] sm:items-center">
                    <div className="w-fit rounded-2xl bg-white p-3">
                      <QRCodeSVG value={issuedResult.claimUrl} size={165} />
                    </div>
                    <div>
                      <p className="font-bold">QR de activación del regalo</p>
                      <p className="mt-1 text-sm text-white/55">Podés mostrarlo, imprimirlo o enviar el enlace por WhatsApp.</p>
                      <button onClick={() => copyText(issuedResult.claimUrl)} className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-black text-[var(--modo-ink)]">COPIAR ENLACE</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col items-center rounded-2xl bg-white/5 p-4 text-center">
                    <div className="rounded-2xl bg-white p-3">
                      <QRCodeSVG value={`modo-pass:${issuedResult.pass.publicId}`} size={165} />
                    </div>
                    <p className="mt-3 text-sm text-white/60">QR identificador del pase para caja.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--modo-green)]">02 · Consumo</p>
                <h2 className="mt-1 text-2xl font-black">Escanear y canjear</h2>
                <p className="mt-1 text-sm text-black/50">Leé el QR del cliente o ingresá el código manualmente.</p>
              </div>
              <button onClick={() => setScannerOpen((value) => !value)} className="rounded-xl bg-[var(--modo-green)] px-3 py-2 text-sm font-bold text-white">
                {scannerOpen ? 'Cerrar cámara' : 'ESCANEAR QR'}
              </button>
            </div>

            {scannerOpen && (
              <div className="mb-5 overflow-hidden rounded-3xl border border-black/10 bg-white p-2">
                <div id="modo-pass-reader" />
              </div>
            )}

            <label className="text-sm font-bold">Código del pase</label>
            <div className="mt-2 flex gap-2">
              <input
                value={passPublicId}
                onChange={(event) => setPassPublicId(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleLookupPass()}
                placeholder="UUID / modo-pass:..."
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--modo-green)]"
              />
              <button onClick={handleLookupPass} disabled={loading} className="rounded-xl bg-[var(--modo-ink)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Consultar</button>
            </div>

            {!activePass ? (
              <div className="mt-5 grid min-h-72 place-items-center rounded-3xl border border-dashed border-black/15 bg-[var(--modo-cream)]/50 p-8 text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl shadow-sm">▦</div>
                  <p className="mt-4 font-black">Esperando un pase</p>
                  <p className="mt-1 text-sm text-black/45">Escaneá el QR para ver titular, producto y saldo.</p>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <div className="overflow-hidden rounded-3xl bg-[var(--modo-ink)] text-white">
                  <div className="border-b border-white/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Modo Café Pass</p>
                        <h3 className="mt-1 text-xl font-black">{activePass.product?.name}</h3>
                        <p className="mt-1 text-sm text-white/60">{activePass.client?.name || 'Sin destinatario'}</p>
                        {activePass.client?.phone && <p className="text-xs text-white/45">{activePass.client.phone}</p>}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${activePass.status === 'ACTIVE' ? 'bg-green-400/20 text-green-200' : 'bg-white/10 text-white/60'}`}>{activePass.status}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Saldo disponible</p>
                    <p className="mt-2 text-4xl font-black">{balanceLabel(activePass)}</p>
                  </div>
                </div>

                {activePass.status === 'ACTIVE' && (
                  <div className="mt-5 rounded-2xl bg-[var(--modo-cream)] p-4">
                    <label className="text-sm font-bold">{activePass.unitType === 'MONEY' ? 'Importe a descontar (Gs.)' : 'Cantidad a canjear'}</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={redeemValue}
                      onChange={(event) => setRedeemValue(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-lg font-black outline-none focus:border-[var(--modo-green)]"
                      placeholder={activePass.unitType === 'MONEY' ? 'Ej: 33000' : '1'}
                    />
                    <button onClick={handleRedeem} disabled={loading} className="mt-3 w-full rounded-2xl bg-[var(--modo-green)] px-4 py-4 font-black text-white disabled:opacity-50">
                      {loading ? 'PROCESANDO…' : activePass.unitType === 'MONEY' ? `DESCONTAR ${redeemValue ? formatMoney(Number(redeemValue)) : ''}` : `CANJEAR ${redeemValue || 1}`}
                    </button>
                  </div>
                )}

                {activePass.transactions?.length > 0 && (
                  <div className="mt-5">
                    <h4 className="font-black">Últimos movimientos</h4>
                    <div className="mt-2 space-y-2">
                      {activePass.transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/8 px-3 py-3 text-sm">
                          <div>
                            <p className="font-bold">{transaction.type}</p>
                            <p className="text-xs text-black/45">{new Date(transaction.createdAt).toLocaleString('es-PY')}</p>
                          </div>
                          <span className="font-black">
                            {transaction.amountDelta != null
                              ? formatMoney(transaction.amountDelta, activePass.product?.currency)
                              : transaction.unitsDelta != null
                                ? `${transaction.unitsDelta > 0 ? '+' : ''}${transaction.unitsDelta}`
                                : '—'}
                          </span>
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
