import api from './client'

export async function listPassProducts() {
  const { data } = await api.get('/passes/products')
  return data
}

export async function createPassProduct(payload) {
  const { data } = await api.post('/passes/products', payload)
  return data
}

export async function issuePass(payload) {
  const { data } = await api.post('/passes/issue', payload)
  return data
}

export async function getPass(publicId) {
  const { data } = await api.get(`/passes/${publicId}`)
  return data
}

export async function redeemPass(publicId, payload = {}) {
  const idempotencyKey = payload.idempotencyKey || crypto.randomUUID()
  const { data } = await api.post(
    `/passes/${publicId}/redeem`,
    { ...payload, idempotencyKey },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return data
}
