require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { createUser, verifyUser, signToken, loadUsers } = require('./auth');
const { setupSocket } = require('./game');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({ error: 'username & password required' });
    await createUser(username, password);
    res.json({ ok: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await verifyUser(username, password);
    if(!user) return res.status(401).json({ error: 'invalid credentials' });
    const token = signToken({ username: user.username, role: user.role });
    res.json({ token, username: user.username, role: user.role });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', (req, res) => { res.json(loadUsers()); });

const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });
setupSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server running on port', PORT));