import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../api/authApi'
import {
  createPassProduct,
  listManagedPassProducts,
  setPassProductActive,
  updatePassProduct,
} from '../api/passApi'
import { getStaffToken, removeStaffToken } from '../utils/staffAuth'

const EMPTY_FORM = {
  name: '',
  description: '',
  unitType: 'ITEM',
  initialUnits: '10',
  initialAmount: '',
  salePrice: '',
  currency: 'PYG',
  validityDays: '90',
  isGift: false,
  isActive: true,
}

function money(value, currency = 'PYG') {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function balanceLabel(product) {
  return product.unitType === 'MONEY'
    ? `${money(product.initialAmount, product.currency)} de saldo`
    : `${product.initialUnits || 0} consumos`
}

export default function StaffProductsPage() {
  const navigate = useNavigate()
  const token = getStaffToken()
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const editingProduct = useMemo(
    () => products.find((item) => item.id === editingId) || null,
    [products, editingId],
  )

  useEffect(() => {
    if (!token) {
      navigate('/staff/login', { replace: true })
      return
    }

    async function load() {
      try {
        const [meData, productsData] = await Promise.all([
          getMe(token),
          listManagedPassProducts(token),
        ])
        if (!['OWNER', 'MANAGER'].includes(meData.user?.role)) {
          setError('Tu usuario no tiene permiso para administrar productos.')
          setUser(meData.user)
          return
        }
        setUser(meData.user)
        setProducts(productsData.products || [])
      } catch (err) {
        if (err?.response?.status === 401) {
          removeStaffToken()
          navigate('/staff/login', { replace: true })
          return
        }
        setError(err?.response?.data?.message || 'No pudimos cargar los productos.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [navigate, token])

  async function refresh() {
    const data = await listManagedPassProducts(token)
    setProducts(data.products || [])
  }

  function startNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setMessage('')
  }

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name || '',
      description: product.description || '',
      unitType: product.unitType || 'ITEM',
      initialUnits: product.initialUnits ?? '',
      initialAmount: product.initialAmount ?? '',
      salePrice: product.salePrice ?? '',
      currency: product.currency || 'PYG',
      validityDays: product.validityDays ?? '',
      isGift: Boolean(product.isGift),
      isActive: Boolean(product.isActive),
    })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      setMessage('')

      const payload = {
        ...form,
        initialUnits: form.unitType === 'ITEM' ? Number(form.initialUnits) : null,
        initialAmount: form.unitType === 'MONEY' ? Number(form.initialAmount) : null,
        salePrice: Number(form.salePrice),
        validityDays: form.validityDays === '' ? null : Number(form.validityDays),
      }

      if (editingId) {
        await updatePassProduct(editingId, payload, token)
        setMessage('Producto actualizado. Los cambios aplican a nuevas ventas.')
      } else {
        await createPassProduct(payload, token)
        setMessage('Producto creado y disponible para vender.')
      }

      await refresh()
      if (!editingId) setForm(EMPTY_FORM)
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleProduct(product) {
    try {
      setError('')
      setMessage('')
      const data = await setPassProductActive(product.id, !product.isActive, token)
      setMessage(data.message)
      await refresh()
      if (editingId === product.id) {
        setForm((current) => ({ ...current, isActive: !product.isActive }))
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'No pudimos cambiar el estado.')
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[var(--modo-cream)] font-black">Cargando productos…</div>
  }

  const canManage = ['OWNER', 'MANAGER'].includes(user?.role)

  return (
    <div className="min-h-screen pb-10">
      <header className="border-b border-[var(--modo-red)]/10 bg-[var(--modo-cream)]">
        <div className="modo-shell flex min-h-[76px] items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/modo-cafe-logo.jpg" alt="Modo Café" className="h-14 w-24 shrink-0 object-contain mix-blend-multiply" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--modo-red)]">Administración</p>
              <h1 className="truncate text-lg font-black text-[var(--modo-brown)]">Productos y pases</h1>
            </div>
          </div>
          <button onClick={() => navigate('/staff')} className="rounded-xl border border-[var(--modo-brown)]/15 bg-white/70 px-3 py-2 text-xs font-black text-[var(--modo-brown)]">MOSTRADOR</button>
        </div>
      </header>

      <main className="modo-shell pt-4 sm:pt-6">
        {(error || message) && (
          <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-white text-[var(--modo-brown)] ring-1 ring-[var(--modo-red)]/15'}`}>
            {error || message}
          </div>
        )}

        {!canManage ? (
          <section className="modo-card p-6 text-center">
            <h2 className="text-xl font-black">Acceso restringido</h2>
            <p className="mt-2 text-sm text-black/55">Solo propietario y gerencia pueden crear o modificar productos.</p>
          </section>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[.95fr_1.05fr]">
            <section className="modo-card order-2 p-4 sm:p-5 xl:order-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--modo-red)]">Catálogo</p>
                  <h2 className="mt-1 text-xl font-black">Productos creados</h2>
                </div>
                <button onClick={startNew} className="modo-btn-primary px-3 py-2 text-sm">+ NUEVO</button>
              </div>

              <div className="mt-4 space-y-2.5">
                {products.map((product) => (
                  <article key={product.id} className={`rounded-2xl border p-3.5 ${product.isActive ? 'border-black/8 bg-white' : 'border-black/5 bg-black/[.025] opacity-75'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black">{product.name}</h3>
                          {product.isGift && <span className="rounded-full bg-[var(--modo-red)] px-2 py-0.5 text-[9px] font-black uppercase text-white">Regalo</span>}
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${product.isActive ? 'bg-green-50 text-green-700' : 'bg-black/5 text-black/45'}`}>{product.isActive ? 'Activo' : 'Pausado'}</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-[var(--modo-brown)]">{balanceLabel(product)}</p>
                        <p className="mt-1 text-xs text-black/45">Venta: {money(product.salePrice, product.currency)} · Vigencia: {product.validityDays ? `${product.validityDays} días` : 'sin vencimiento'} · {product._count?.passes || 0} emitidos</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => startEdit(product)} className="rounded-xl bg-[var(--modo-cream)] px-3 py-2 text-xs font-black text-[var(--modo-brown)]">EDITAR</button>
                      <button onClick={() => toggleProduct(product)} className="rounded-xl border border-black/10 px-3 py-2 text-xs font-black">{product.isActive ? 'PAUSAR' : 'ACTIVAR'}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="modo-card order-1 p-4 sm:p-5 xl:order-2">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--modo-red)]">{editingId ? 'Editar producto' : 'Nuevo producto'}</p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{editingProduct?.name || 'Crear tipo de pase'}</h2>
                  <p className="mt-1 text-sm text-black/50">Definí el saldo, precio y vigencia que se usarán en las próximas ventas.</p>
                </div>
                {editingId && <button onClick={startNew} className="text-xs font-black text-[var(--modo-red)]">CANCELAR</button>}
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-black">Nombre</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="modo-input mt-1.5" placeholder="Ej.: Gift Pass · Gs. 200.000" />
                </div>

                <div>
                  <label className="text-sm font-black">Descripción</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="modo-input mt-1.5 min-h-20 resize-y" placeholder="Qué incluye y cómo se usa" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-black">Tipo de saldo</label>
                    <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })} className="modo-input mt-1.5" disabled={Boolean(editingProduct?._count?.passes)}>
                      <option value="ITEM">Por consumos</option>
                      <option value="MONEY">Por dinero</option>
                    </select>
                    {Boolean(editingProduct?._count?.passes) && <p className="mt-1 text-[11px] text-black/40">No se cambia porque ya hay pases emitidos.</p>}
                  </div>
                  <div>
                    <label className="text-sm font-black">{form.unitType === 'MONEY' ? 'Saldo inicial (Gs.)' : 'Cantidad de consumos'}</label>
                    <input required type="number" min="1" value={form.unitType === 'MONEY' ? form.initialAmount : form.initialUnits} onChange={(e) => form.unitType === 'MONEY' ? setForm({ ...form, initialAmount: e.target.value }) : setForm({ ...form, initialUnits: e.target.value })} className="modo-input mt-1.5" placeholder={form.unitType === 'MONEY' ? '150000' : '10'} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-black">Precio de venta (Gs.)</label>
                    <input required type="number" min="1" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="modo-input mt-1.5" placeholder="150000" />
                  </div>
                  <div>
                    <label className="text-sm font-black">Vigencia</label>
                    <input type="number" min="1" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} className="modo-input mt-1.5" placeholder="90 días" />
                  </div>
                </div>

                <div className="rounded-2xl bg-[var(--modo-cream)] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={form.isGift} onChange={(e) => setForm({ ...form, isGift: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--modo-red)]" />
                    <span>
                      <strong className="text-sm">Es un producto para regalar</strong>
                      <span className="mt-0.5 block text-xs text-black/50">Permite venderlo sin conocer todavía los datos del destinatario.</span>
                    </span>
                  </label>
                </div>

                <button disabled={saving} className="modo-btn-primary w-full px-4 py-3.5 disabled:opacity-50">
                  {saving ? 'GUARDANDO…' : editingId ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
