const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { signToken } = require('../utils/jwt');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Email y contraseña son requeridos',
      });
    }

    const user = await prisma.staffUser.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas',
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al iniciar sesión',
      error: error.message,
    });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.staffUser.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado',
      });
    }

    return res.json({
      ok: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener usuario',
      error: error.message,
    });
  }
}

module.exports = {
  login,
  me,
};