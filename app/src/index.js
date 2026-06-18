const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// VULNERABILIDADE INTENCIONAL: API key hardcoded no código
// O SAST (SonarCloud) deve detetar isto como "hardcoded credentials"
const API_KEY = "sk-test-12345abcdef";
const API_SECRET = "supersecretkey123";

// Dados fictícios de utilizadores em memória
const users = [
  { id: 1, name: 'Alice Silva', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob Santos', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Carlos Costa', email: 'carlos@example.com', role: 'user' },
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
// Requer header X-API-Key para autenticação (mas a chave está hardcoded acima)
app.get('/users', (req, res) => {
  const providedKey = req.headers['x-api-key'];

  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }

  res.json({ users, total: users.length });
});

// GET /users/:id - Obter utilizador por ID
app.get('/users/:id', (req, res) => {
  const providedKey = req.headers['x-api-key'];

  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }

  const user = users.find(u => u.id === parseInt(req.params.id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// POST /login - Endpoint de login simulado
// VULNERABILIDADE INTENCIONAL: Query SQL concatenada por string em vez de parametrizada
// O SonarCloud deve detetar isto como code smell (SQL injection vulnerability)
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Simulação de query SQL com concatenação de strings (VULNERÁVEL a SQL Injection)
  // Em produção, NUNCA fazer isto — usar sempre queries parametrizadas
  const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;

  console.log(`Executing query: ${query}`);

  // Simulação: procura o utilizador pelo email nos dados em memória
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials', simulated_query: query });
  }

  // Simula que a password está correta (não validamos realmente)
  res.json({
    message: 'Login successful',
    token: `jwt-token-${user.id}-${Date.now()}`,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key configured: ${API_KEY}`);
});

module.exports = app;
