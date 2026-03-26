import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export async function searchClients(query, token) {
  const { data } = await api.get(`/clients/search?q=${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data
}

export async function getClientHistory(clientId, token) {
  const { data } = await api.get(`/clients/${clientId}/history`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data
}