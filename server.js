const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;
const DATA_FILE = './data.json';

app.use(cors());
app.use(bodyParser.json());

// Load users from file
function loadUsers() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
}

// Save users to file
function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  if (users.find(user => user.username === username)) {
    return res.status(400).json({ message: 'User already exists' });
  }
  users.push({ username, password });
  saveUsers(users);
  res.json({ message: 'Registration successful' });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(user => user.username === username && user.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ message: 'Login successful', token: 'dummy-token' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});