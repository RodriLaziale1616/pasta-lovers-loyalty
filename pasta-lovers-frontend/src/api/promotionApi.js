import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export async function getActivePromotions() {
  const { data } = await api.get('/promotions/active')
  return data
}

export async function createPromotion(payload, authToken) {
  const { data } = await api.post('/promotions', payload, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
  return data
}