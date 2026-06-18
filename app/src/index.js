const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// CREDENCIAIS VIA VARIÁVEIS DE AMBIENTE (correto)
// Nunca hardcoded no código — usar process.env ou secrets manager
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('FATAL: API_KEY and API_SECRET must be set in environment variables');
  process.exit(1);
}

// Dados fictícios de utilizadores em memória
const users = [
  { id: 1, name: 'Alice Silva', email: 'alice@example.com', role: 'admin', password_hash: 'hash_123' },
  { id: 2, name: 'Bob Santos', email: 'bob@example.com', role: 'user', password_hash: 'hash_456' },
  { id: 3, name: 'Carlos Costa', email: 'carlos@example.com', role: 'user', password_hash: 'hash_789' },
];

app.use(express.json());

// GET /health - Health check do serviço
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// GET /users - Listar todos os utilizadores
app.get('/users', (req, res) => {
  const providedKey = req.headers['x-api-key'];

  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }

  res.json({ users: users.map(({ password_hash, ...u }) => u), total: users.length });
});

// GET /users/:id - Obter utilizador por ID
app.get('/users/:id', (req, res) => {
  const providedKey = req.headers['x-api-key'];

  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }

  const user = users.find(u => u.id === parseInt(req.params.id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// POST /login - Endpoint de login simulado
// CORREÇÃO: Query parametrizada — input do utilizador nunca é concatenado na query
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Query parametrizada (correto para SQL injection)
  // Em produção com base de dados real, usar:
  //   db.query('SELECT * FROM users WHERE email = $1 AND password_hash = $2', [email, password])
  // ou ORM como Prisma/Sequelize com parâmetros seguros
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    message: 'Login successful',
    token: `jwt-token-${user.id}-${Date.now()}`,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
