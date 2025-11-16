const express = require('express');
const { PrismaClient } = require('@prisma/client');
const LoginController = require('./Controllers/LoginController');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

app.use(express.json());

// Example route: Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example route: Create a user
app.post('/users', async (req, res) => {
  const { email, name } = req.body;
  try {
    const user = await prisma.user.create({
      data: { email, name },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth route: Login and generate JWT via controller
app.post('/login', LoginController.login);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});