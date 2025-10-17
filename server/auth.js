const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usersFile = path.join(__dirname, 'users.json');

// Load users safely
function loadUsers() {
  if (!fs.existsSync(usersFile)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(usersFile));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// Save users to file
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Create a new user
async function createUser(username, password, role='player') {
  const users = loadUsers();
  if (users.find(u => u.username === username)) throw new Error('User exists');
  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash, role });
  saveUsers(users);
}

// Verify login credentials
async function verifyUser(username, password) {
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password);
  return match ? user : null;
}

// Sign JWT token
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
}

// Create default admin if not exists
(async () => {
  const users = loadUsers();
  if (!users.find(u => u.username === 'admin')) {
    await createUser('admin', 'node%%%%', 'admin');
    console.log('Default admin created: admin / node%%%%');
  }
})();

module.exports = { createUser, verifyUser, loadUsers, signToken };
