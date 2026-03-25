const STORAGE_KEY = 'pl_staff_token'

export function saveStaffToken(token) {
  localStorage.setItem(STORAGE_KEY, token)
}

export function getStaffToken() {
  return localStorage.getItem(STORAGE_KEY)
}

export function removeStaffToken() {
  localStorage.removeItem(STORAGE_KEY)
}
