const socket = io(); // connect to server

let username = '';
let gameCanvas = document.getElementById('gameCanvas');
let ctx = gameCanvas.getContext('2d');

const loginScreen = document.getElementById('loginScreen');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

loginBtn.onclick = async () => {
  username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    loginError.innerText = 'Enter username & password';
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) { loginError.innerText = data.error; return; }

    // Login success
    loginScreen.style.display = 'none';
    gameCanvas.style.display = 'block';
    initGame();
  } catch(err) {
    loginError.innerText = 'Server error';
  }
};

let players = {}; // {id: {x, y, username}}

function initGame() {
  // send player join info to server
  socket.emit('join', { username });

  // Listen for player updates from server
  socket.on('players', (serverPlayers) => {
    players = serverPlayers;
    drawGame();
  });

  // Example movement keys
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') socket.emit('move', { direction:'up' });
    if (e.key === 'ArrowDown') socket.emit('move', { direction:'down' });
    if (e.key === 'ArrowLeft') socket.emit('move', { direction:'left' });
    if (e.key === 'ArrowRight') socket.emit('move', { direction:'right' });
  });
}

function drawGame() {
  ctx.clearRect(0,0, gameCanvas.width, gameCanvas.height);
  for (const id in players) {
    const p = players[id];
    // Draw tank
    ctx.fillStyle = 'green';
    ctx.fillRect(p.x, p.y, 30, 30);
    // Draw username
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText(p.username, p.x, p.y-5);
  }
}
