const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const tokenStore = new Map(); // token -> { userId, expiresAt }

module.exports = {
  login: async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const passwordStr = password.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (passwordStr.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // NOTE: Password verification is not implemented as no hashed password is in schema.
      // Add proper password hashing and verification as needed.

      // Generate opaque bearer token and store in-memory with 1h expiry
      const token = crypto.randomBytes(32).toString('hex');
      const expiresInSeconds = 60 * 60;
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      tokenStore.set(token, { userId: user.id, expiresAt });

      return res.json({
        token_type: 'Bearer',
        access_token: token,
        expires_in: expiresInSeconds,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
};

