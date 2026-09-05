function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '')

  if (digits.startsWith('595')) {
    digits = `0${digits.slice(3)}`
  }

  return digits
}

function toParaguayE164(value) {
  const phone = normalizePhone(value)
  if (!/^09\d{8}$/.test(phone)) return null
  return `595${phone.slice(1)}`
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  return email || null
}

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function isValidParaguayPhone(value) {
  const phone = normalizePhone(value)
  return /^09\d{8}$/.test(phone)
}

module.exports = {
  normalizePhone,
  toParaguayE164,
  normalizeEmail,
  cleanName,
  isValidParaguayPhone,
}
