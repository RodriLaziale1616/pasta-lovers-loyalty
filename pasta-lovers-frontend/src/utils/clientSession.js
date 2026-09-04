const KEY = 'modo_cafe_client_session'

export function getClientSessionToken() {
  return localStorage.getItem(KEY) || ''
}

export function saveClientSessionToken(token) {
  localStorage.setItem(KEY, token)
}

export function removeClientSessionToken() {
  localStorage.removeItem(KEY)
}
