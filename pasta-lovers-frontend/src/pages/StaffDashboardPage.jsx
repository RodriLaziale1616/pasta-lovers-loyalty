import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/authApi'
import {
  checkinClient,
  getClientByTokenForStaff,
  redeemClient,
} from '../api/staffClientApi'
import { searchClients, getClientHistory } from '../api/staffSearchApi'
import { getStaffToken, removeStaffToken } from '../utils/staffAuth'

export default function StaffDashboardPage() {
  const navigate = useNavigate()

  const [authToken, setAuthToken] = useState('')
  const [staffUser, setStaffUser] = useState(null)
  const [manualToken, setManualToken] = useState('')
  const [client, setClient] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingClient, setLoadingClient] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [history, setHistory] = useState([])

  useEffect(() => {
    const token = getStaffToken()

    if (!token) {
      navigate('/staff/login')
      return
    }

    setAuthToken(token)

    async function validateSession() {
      try {
        const data = await getMe(token)
        setStaffUser(data.user)
      } catch {
        removeStaffToken()
        navigate('/staff/login')
      }
    }

    validateSession()
  }, [navigate])

  useEffect(() => {
    let scanner

    if (staffUser) {
      scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        false
      )

      scanner.render(
        async (decodedText) => {
          try {
            let parsed = null

            try {
              parsed = JSON.parse(decodedText)
            } catch {
              parsed = null
            }

            if (!parsed?.token) {
              setError('El QR leído no corresponde a una tarjeta válida')
              return
            }

            setManualToken(parsed.token)
            await handleSearchClient(parsed.token)
          } catch (err) {
            setError(err?.message || 'No se pudo leer el QR')
          }
        },
        () => {}
      )
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {})
      }
    }
  }, [staffUser])

  async function loadHistory(clientId) {
    try {
      const data = await getClientHistory(clientId, authToken)
      setHistory(data.history || [])
    } catch {
      setHistory([])
    }
  }

  async function handleSearchClient(tokenParam) {
    const tokenToSearch = (tokenParam || manualToken || '').trim()

    if (!tokenToSearch) {
      setError('Ingresá o escaneá un token')
      return
    }

    try {
      setLoadingClient(true)
      setError('')
      setMessage('')
      const data = await getClientByTokenForStaff(tokenToSearch, authToken)
      setClient(data.client)
      await loadHistory(data.client.id)
    } catch (err) {
      setClient(null)
      setHistory([])
      setError(err?.response?.data?.message || 'No se pudo encontrar el cliente')
    } finally {
      setLoadingClient(false)
    }
  }

  async function handleSearchByText() {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setError('Ingresá al menos 2 caracteres para buscar')
      return
    }

    try {
      setError('')
      setMessage('')
      const data = await searchClients(searchQuery.trim(), authToken)
      setSearchResults(data.clients || [])
    } catch {
      setSearchResults([])
      setError('Error al buscar clientes')
    }
  }

  async function handleSelectClient(selectedClient) {
    setClient(selectedClient)
    setManualToken(selectedClient.uniqueToken)
    setSearchResults([])
    setMessage('')
    setError('')
    await loadHistory(selectedClient.id)
  }

  async function handleCheckin() {
    if (!client) return

    try {
      setActionLoading(true)
      setError('')
      setMessage('')
      const data = await checkinClient(client.id, authToken)
      setMessage(data.message)
      await handleSearchClient(client.uniqueToken)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo registrar el check')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRedeem() {
    if (!client) return

    try {
      setActionLoading(true)
      setError('')
      setMessage('')
      const data = await redeemClient(client.id, authToken)
      setMessage(data.message)
      await handleSearchClient(client.uniqueToken)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo canjear el premio')
    } finally {
      setActionLoading(false)
    }
  }

  function handleLogout() {
    removeStaffToken()
    navigate('/staff/login')
  }

  const checks = client?.loyaltyStatus?.currentChecks || 0
  const rewardAvailable = client?.loyaltyStatus?.rewardAvailable || false

  return (
    <div className="min-h-screen bg-[var(--pl-cream)] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--pl-muted)]">
              Pasta Lovers Staff
            </p>
            <h1 className="font-brand text-2xl text-[var(--pl-text)]">
              Panel de fidelidad
            </h1>
            {staffUser && (
              <p className="mt-1 text-sm text-[var(--pl-muted)]">
                Sesión activa: {staffUser.name}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/staff/promotions')}
              className="rounded-2xl bg-[var(--pl-red)] px-4 py-2 text-sm font-semibold text-white"
            >
              Crear promoción
            </button>

            <button
              onClick={handleLogout}
              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--pl-text)]"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <h2 className="font-brand text-2xl text-[var(--pl-text)]">
              Escanear tarjeta
            </h2>
            <p className="mt-2 text-sm text-[var(--pl-muted)]">
              Escaneá el QR del cliente o pegá manualmente el token.
            </p>

            <div className="mt-5">
              <label className="text-sm font-semibold text-[var(--pl-text)]">
                Buscar por nombre, teléfono o mail
              </label>

              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ej: Rodrigo o 0981..."
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3 outline-none focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              />

              <button
                onClick={handleSearchByText}
                className="mt-3 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white"
              >
                Buscar por texto
              </button>

              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="cursor-pointer rounded-2xl border border-black/10 bg-white p-3"
                    >
                      <p className="font-semibold text-[var(--pl-text)]">{c.name}</p>
                      <p className="text-sm text-[var(--pl-muted)]">{c.phone}</p>
                      <p className="text-xs text-[var(--pl-muted)]">
                        {c.loyaltyStatus?.currentChecks || 0}/5 checks
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-black/8">
              <div id="reader" className="bg-white" />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-semibold text-[var(--pl-text)]">
                Token manual
              </label>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Pegá aquí el token del cliente"
                className="w-full rounded-2xl border border-black/10 bg-[var(--pl-cream)]/45 px-4 py-3.5 outline-none focus:border-[var(--pl-green)] focus:ring-2 focus:ring-[var(--pl-green)]/15"
              />
            </div>

            <button
              onClick={() => handleSearchClient()}
              disabled={loadingClient}
              className="mt-4 w-full rounded-2xl bg-[var(--pl-green)] px-4 py-3.5 font-semibold text-white transition hover:bg-[var(--pl-green-dark)] disabled:opacity-60"
            >
              {loadingClient ? 'Buscando...' : 'Buscar cliente'}
            </button>

            {message && (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <h2 className="font-brand text-2xl text-[var(--pl-text)]">
              Cliente
            </h2>

            {!client ? (
              <p className="mt-4 text-sm text-[var(--pl-muted)]">
                Escaneá una tarjeta o buscá un cliente para ver su ficha.
              </p>
            ) : (
              <>
                <div className="mt-4 rounded-[24px] bg-[var(--pl-cream)] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--pl-muted)]">
                    Nombre
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[var(--pl-text)]">
                    {client.name}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--pl-muted)]">Teléfono</p>
                      <p className="font-medium text-[var(--pl-text)]">{client.phone}</p>
                    </div>
                    <div>
                      <p className="text-[var(--pl-muted)]">Mail</p>
                      <p className="font-medium text-[var(--pl-text)]">
                        {client.email || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--pl-muted)]">Checks actuales</p>
                      <p className="font-medium text-[var(--pl-text)]">{checks}/5</p>
                    </div>
                    <div>
                      <p className="text-[var(--pl-muted)]">Premio</p>
                      <p className="font-medium text-[var(--pl-text)]">
                        {rewardAvailable ? 'Disponible' : 'No disponible'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={handleCheckin}
                    disabled={actionLoading}
                    className="rounded-2xl bg-[var(--pl-green)] px-4 py-3.5 font-semibold text-white transition hover:bg-[var(--pl-green-dark)] disabled:opacity-60"
                  >
                    {actionLoading ? 'Procesando...' : 'Sumar check'}
                  </button>

                  <button
                    onClick={handleRedeem}
                    disabled={actionLoading}
                    className="rounded-2xl bg-[var(--pl-red)] px-4 py-3.5 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                  >
                    {actionLoading ? 'Procesando...' : 'Canjear premio'}
                  </button>
                </div>

                {history.length > 0 && (
                  <div className="mt-5">
                    <h3 className="font-semibold text-[var(--pl-text)]">Historial</h3>

                    <div className="mt-3 space-y-2">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="rounded-2xl border border-black/10 p-3 text-sm"
                        >
                          <p className="font-medium text-[var(--pl-text)]">
                            {h.type === 'checkin' ? '✔️ Check registrado' : '🎁 Premio canjeado'}
                          </p>
                          {h.notes && (
                            <p className="mt-1 text-xs text-[var(--pl-muted)]">{h.notes}</p>
                          )}
                          <p className="mt-1 text-xs text-[var(--pl-muted)]">
                            {new Date(h.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}