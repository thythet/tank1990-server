const loginScreen = document.getElementById('loginScreen');
const gameCanvas = document.getElementById('gameCanvas');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');

let socket;
let player = { x: 400, y: 300, size: 30, color: 'green', username: '' };
let bullets = [];
let keys = {};

// --- Login Handler ---
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value;
  const password = passwordInput.value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      loginScreen.style.display = 'none';
      gameCanvas.style.display = 'block';
      player.username = data.username;

      startGame();
    } else {
      loginError.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    loginError.textContent = 'Server error';
  }
});

// --- Game Setup ---
function startGame() {
  const ctx = gameCanvas.getContext('2d');
  socket = io(); // connect to server

  // send player join info
  socket.emit('playerJoin', { username: player.username });

  // receive updates from server (other players)
  socket.on('updatePlayers', serverPlayers => {
    drawGame(ctx, serverPlayers);
  });

  // --- Movement ---
  window.addEventListener('keydown', e => keys[e.key] = true);
  window.addEventListener('keyup', e => keys[e.key] = false);

  // --- Shoot ---
  window.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      bullets.push({ x: player.x + player.size/2, y: player.y, size: 5, color: 'yellow', dy: -5 });
      socket.emit('shoot', { x: player.x, y: player.y });
    }
  });

  // --- Game Loop ---
  function gameLoop() {
    updatePlayer();
    updateBullets();
    drawGame(ctx);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

// --- Update Player ---
function updatePlayer() {
  const speed = 4;
  if (keys['ArrowUp']) player.y -= speed;
  if (keys['ArrowDown']) player.y += speed;
  if (keys['ArrowLeft']) player.x -= speed;
  if (keys['ArrowRight']) player.x += speed;

  // boundaries
  player.x = Math.max(0, Math.min(gameCanvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(gameCanvas.height - player.size, player.y));
}

// --- Update Bullets ---
function updateBullets() {
  bullets.forEach((b, i) => {
    b.y += b.dy;
    if (b.y < 0) bullets.splice(i, 1);
  });
}

// --- Draw Game ---
function drawGame(ctx, serverPlayers=[]) {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  // Draw player bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.size, b.size);
  });

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.fillStyle = 'white';
  ctx.fillText(player.username, player.x, player.y - 5);

  // Draw other players from server
  serverPlayers.forEach(p => {
    if (p.username !== player.username) {
      ctx.fillStyle = 'red';
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.fillStyle = 'white';
      ctx.fillText(p.username, p.x, p.y - 5);
    }
  });
}
