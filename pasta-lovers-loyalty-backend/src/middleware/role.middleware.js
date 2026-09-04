function requireRole(...allowedRoles) {
  const normalized = new Set(allowedRoles.map((role) => String(role).toUpperCase()))

  return function roleMiddleware(req, res, next) {
    const role = String(req.user?.role || '').toUpperCase()

    if (!normalized.has(role)) {
      return res.status(403).json({
        ok: false,
        message: 'No tenés permisos para realizar esta acción',
      })
    }

    next()
  }
}

module.exports = requireRole
