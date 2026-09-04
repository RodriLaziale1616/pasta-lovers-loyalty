import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

function authConfig(token, extraHeaders = {}) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  }
}

export async function listPassProducts(token) {
  const { data } = await api.get('/passes/products', authConfig(token))
  return data
}

export async function createPassProduct(payload, token) {
  const { data } = await api.post('/passes/products', payload, authConfig(token))
  return data
}

export async function issuePass(payload, token) {
  const { data } = await api.post('/passes/issue', payload, authConfig(token))
  return data
}

export async function getPass(publicId, token) {
  const { data } = await api.get(`/passes/${publicId}`, authConfig(token))
  return data
}

export async function redeemPass(publicId, payload = {}, token) {
  const idempotencyKey = payload.idempotencyKey || crypto.randomUUID()
  const { data } = await api.post(
    `/passes/${publicId}/redeem`,
    { ...payload, idempotencyKey },
    authConfig(token, { 'Idempotency-Key': idempotencyKey }),
  )
  return data
}

export async function previewGift(token) {
  const { data } = await api.get(`/passes/gifts/claim/${encodeURIComponent(token)}`)
  return data
}

export async function claimGift(token, payload) {
  const { data } = await api.post(
    `/passes/gifts/claim/${encodeURIComponent(token)}`,
    payload,
  )
  return data
}
