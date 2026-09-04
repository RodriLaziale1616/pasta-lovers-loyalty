import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/authApi'
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
  if (pass.unitType === 'MONEY') return formatMoney(pass.remainingAmount, pass.product?.currency || 'PYG')
  return `${pass.remainingUnits ?? 0} consumos`
}

export default function StaffDashboardPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [staffUser, setStaffUser] = useState(null)
  const [products, setProducts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [issuedPass, setIssuedPass] = useState(null)
  const [passPublicId, setPassPublicId] = useState('')
  const [activePass, setActivePass] = useState(null)
  const [redeemValue, setRedeemValue] = useState('1')
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

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)),
    [products, selectedProductId],
  )

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
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo buscar clientes.')
    } finally {
      setLoading(false)
    }
  }

  async function handleIssuePass() {
    if (!selectedClient || !selectedProductId) {
      setError('Seleccioná un cliente y un tipo de pase.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')
      const data = await issuePass(
        { clientId: selectedClient.id, productId: Number(selectedProductId) },
        token,
      )
      setIssuedPass(data.pass)
      setPassPublicId(data.pass.publicId)
      setActivePass(data.pass)
      setMessage(`Pase emitido correctamente para ${selectedClient.name}.`)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo emitir el pase.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLookupPass() {
    const publicId = passPublicId.trim()
    if (!publicId) {
      setError('Ingresá el código del pase.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')
      const data = await getPass(publicId, token)
      setActivePass(data.pass)
      setRedeemValue(data.pass.unitType === 'MONEY' ? '' : '1')
    } catch (err) {
      setActivePass(null)
      setError(err?.response?.data?.message || 'No se encontró el pase.')
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
      setMessage('')
      const payload = activePass.unitType === 'MONEY'
        ? { amount: value, notes: 'Canje desde mostrador Modo Café' }
        : { quantity: value, notes: 'Canje desde mostrador Modo Café' }
      const data = await redeemPass(activePass.publicId, payload, token)
      setMessage(data.duplicate ? 'Este canje ya había sido procesado.' : 'Canje realizado correctamente.')
      const refreshed = await getPass(activePass.publicId, token)
      setActivePass(refreshed.pass)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo realizar el canje.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    removeStaffToken()
    navigate('/staff/login')
  }

  return (
    <div className="min-h-screen bg-[var(--modo-cream)] text-[var(--modo-ink)]">
      <header className="border-b border-black/8 bg-[var(--modo-ink)] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--modo-orange)] text-xl font-black">M</div>
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

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Productos activos</p>
            <p className="mt-2 text-3xl font-bold">{products.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Cliente seleccionado</p>
            <p className="mt-2 truncate text-lg font-bold">{selectedClient?.name || 'Ninguno'}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs uppercase tracking-[0.16em] text-black/45">Pase en pantalla</p>
            <p className="mt-2 text-lg font-bold">{activePass ? balanceLabel(activePass) : '—'}</p>
          </div>
        </div>

        {(message || error) && (
          <div className={`mb-5 rounded-2xl px-4 py-3 text-sm font-medium ${error ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-green-50 text-green-800 ring-1 ring-green-200'}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--modo-green)]">01 · Venta</p>
                <h2 className="mt-1 text-2xl font-bold">Vender un pase</h2>
              </div>
              <span className="rounded-full bg-[var(--modo-orange-soft)] px-3 py-1 text-xs font-bold text-[var(--modo-ink)]">Prepago</span>
            </div>

            <label className="text-sm font-semibold">Buscar cliente</label>
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
              <div className="mt-3 max-h-48 space-y-2 overflow-auto rounded-2xl border border-black/8 p-2">
                {searchResults.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client)
                      setSearchResults([])
                      setError('')
                    }}
                    className="w-full rounded-xl px-3 py-3 text-left hover:bg-[var(--modo-cream)]"
                  >
                    <p className="font-bold">{client.name}</p>
                    <p className="text-sm text-black/50">{client.phone}{client.email ? ` · ${client.email}` : ''}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedClient && (
              <div className="mt-4 rounded-2xl bg-[var(--modo-cream)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-black/45">Cliente</p>
                <p className="mt-1 font-bold">{selectedClient.name}</p>
                <p className="text-sm text-black/55">{selectedClient.phone}</p>
              </div>
            )}

            <label className="mt-5 block text-sm font-semibold">Tipo de pase</label>
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
                <p className="font-bold">{selectedProduct.name}</p>
                <p className="mt-1 text-black/55">{selectedProduct.description}</p>
                <p className="mt-2 font-semibold">
                  Saldo inicial: {selectedProduct.unitType === 'MONEY' ? formatMoney(selectedProduct.initialAmount, selectedProduct.currency) : `${selectedProduct.initialUnits} consumos`}
                </p>
              </div>
            )}

            <button
              onClick={handleIssuePass}
              disabled={loading || !selectedClient || !selectedProductId}
              className="mt-5 w-full rounded-2xl bg-[var(--modo-orange)] px-4 py-4 text-base font-black text-[var(--modo-ink)] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Procesando...' : 'VENDER Y ACTIVAR PASE'}
            </button>

            {issuedPass && (
              <div className="mt-4 rounded-2xl bg-[var(--modo-ink)] p-4 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-white/50">Pase creado</p>
                <p className="mt-1 font-bold">{issuedPass.product?.name || selectedProduct?.name}</p>
                <p className="mt-2 break-all font-mono text-xs text-white/70">{issuedPass.publicId}</p>
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--modo-green)]">02 · Consumo</p>
              <h2 className="mt-1 text-2xl font-bold">Canjear un pase</h2>
              <p className="mt-1 text-sm text-black/50">Por ahora podés pegar el código del pase. El QR entra en la siguiente etapa.</p>
            </div>

            <label className="text-sm font-semibold">Código del pase</label>
            <div className="mt-2 flex gap-2">
              <input
                value={passPublicId}
                onChange={(event) => setPassPublicId(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleLookupPass()}
                placeholder="UUID / código del pase"
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--modo-green)]"
              />
              <button onClick={handleLookupPass} disabled={loading} className="rounded-xl bg-[var(--modo-green)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Consultar</button>
            </div>

            {!activePass ? (
              <div className="mt-5 grid min-h-60 place-items-center rounded-3xl border border-dashed border-black/15 bg-[var(--modo-cream)]/50 p-8 text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl shadow-sm">☕</div>
                  <p className="mt-4 font-bold">Esperando un pase</p>
                  <p className="mt-1 text-sm text-black/45">Consultá un código para ver cliente, producto y saldo disponible.</p>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <div className="overflow-hidden rounded-3xl bg-[var(--modo-ink)] text-white">
                  <div className="border-b border-white/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Modo Café Pass</p>
                        <h3 className="mt-1 text-xl font-bold">{activePass.product?.name}</h3>
                        <p className="mt-1 text-sm text-white/60">{activePass.client?.name}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${activePass.status === 'ACTIVE' ? 'bg-green-400/15 text-green-200' : 'bg-white/10 text-white/70'}`}>
                        {activePass.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-white/55">Saldo disponible</p>
                    <p className="mt-1 text-4xl font-black">{balanceLabel(activePass)}</p>
                    {activePass.expiresAt && (
                      <p className="mt-3 text-xs text-white/45">Vence: {new Date(activePass.expiresAt).toLocaleDateString('es-PY')}</p>
                    )}
                  </div>
                </div>

                {activePass.status === 'ACTIVE' && (
                  <div className="mt-4 rounded-2xl border border-black/8 p-4">
                    <label className="text-sm font-semibold">
                      {activePass.unitType === 'MONEY' ? 'Importe a descontar (Gs.)' : 'Cantidad a descontar'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={redeemValue}
                      onChange={(event) => setRedeemValue(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--modo-cream)] px-4 py-3 text-lg font-bold outline-none focus:border-[var(--modo-green)]"
                    />
                    <button
                      onClick={handleRedeem}
                      disabled={loading}
                      className="mt-3 w-full rounded-2xl bg-[var(--modo-green)] px-4 py-4 text-base font-black text-white transition hover:-translate-y-0.5 disabled:opacity-40"
                    >
                      {loading ? 'Procesando...' : activePass.unitType === 'MONEY' ? 'DESCONTAR SALDO' : `CANJEAR ${redeemValue || 1}`}
                    </button>
                  </div>
                )}

                {activePass.transactions?.length > 0 && (
                  <div className="mt-5">
                    <h3 className="font-bold">Últimos movimientos</h3>
                    <div className="mt-2 space-y-2">
                      {activePass.transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between rounded-xl bg-[var(--modo-cream)] px-3 py-3 text-sm">
                          <div>
                            <p className="font-semibold">{transaction.type}</p>
                            <p className="text-xs text-black/45">{new Date(transaction.createdAt).toLocaleString('es-PY')}</p>
                          </div>
                          <p className="font-bold">
                            {transaction.unitsDelta != null ? `${transaction.unitsDelta > 0 ? '+' : ''}${transaction.unitsDelta}` : transaction.amountDelta != null ? formatMoney(transaction.amountDelta, activePass.product?.currency || 'PYG') : '—'}
                          </p>
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
