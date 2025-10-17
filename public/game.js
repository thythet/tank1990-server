const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const UI = {score:document.getElementById('uiScore'), lives:document.getElementById('uiLives'), level:document.getElementById('uiLevel')};
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const networkBtn = document.getElementById('networkBtn');
const loggedAs = document.getElementById('loggedAs');

let W=canvas.width,H=canvas.height,TILE=32;
let COLS=Math.floor(W/TILE),ROWS=Math.floor(H/TILE);

let bullets=[],enemies=[],explosions=[],tiles=[];
let player=null,score=0,lives=3,level=1,paused=true;
let socket=null; // for online multiplayer
let otherPlayers={}; // data from server

// --- Map and AI ---
function makeMap(){ tiles = new Array(ROWS).fill(0).map(()=>new Array(COLS).fill(null)); }
function placeWalls(){
  for(let r=0;r<ROWS;r++){ tiles[r][0]={type:'steel',hp:999}; tiles[r][COLS-1]={type:'steel',hp:999}; }
  for(let c=0;c<COLS;c++){ tiles[0][c]={type:'steel',hp:999}; tiles[ROWS-1][c]={type:'steel',hp:999}; }
  const mid = Math.floor(COLS/2);
  tiles[ROWS-2][mid-1]={type:'brick',hp:3}; tiles[ROWS-2][mid]={type:'brick',hp:3}; tiles[ROWS-2][mid+1]={type:'brick',hp:3};
}

// --- Tank & Bullet ---
class Tank{
  constructor(x,y,dir='up',isEnemy=false,username='Player'){ this.reset(x,y,dir,isEnemy,username); }
  reset(x,y,dir,isEnemy,username){
    this.x=x;this.y=y;this.dir=dir;this.isEnemy=isEnemy;this.size=28;
    this.speed=isEnemy?1.4:2.4; this.cool=0; this.fireRate=isEnemy?80:18;
    this.dead=false; this.username=username; this.color=isEnemy?'#ff9b6b':'#7ce0ff';
  }
  rect(){ return {x:this.x+2,y:this.y+2,w:this.size,h:this.size}; }
  center(){ return {x:this.x+16,y:this.y+16}; }
  update(dt){ if(this.cool>0)this.cool--; if(this.isEnemy)this.ai(dt); }
  draw(ctx){
    if(this.dead) return;
    roundRect(ctx,this.x+2,this.y+2,this.size,this.size,4,this.color);
    ctx.save(); ctx.font='12px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.textAlign='center'; ctx.fillText(this.username,this.center().x,this.y-6); ctx.restore();
  }
  fire(){ if(this.cool>0) return;
    const c=this.center(); let vx=0,vy=0; const speed=this.isEnemy?4:6;
    if(this.dir=='up') vy=-speed; if(this.dir=='down') vy=speed; if(this.dir=='left') vx=-speed; if(this.dir=='right') vx=speed;
    bullets.push({x:c.x,y:c.y,vx,vy,fromEnemy:this.isEnemy});
    this.cool=this.fireRate;
    if(socket) socket.emit('fire',{x:c.x,y:c.y,vx,vy,username:this.username});
  }
  ai(dt){ if(Math.random()<0.004) this.fire(); }
}

// --- Input ---
let keys={};
window.addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true; if(e.key===' ') e.preventDefault(); if(e.key==='p') paused=!paused; });
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
startBtn.addEventListener('click',()=>{ paused=false; });
restartBtn.addEventListener('click',()=>{ initGame(); paused=false; });

// --- Init ---
function initGame(){
  makeMap(); placeWalls();
  bullets.length=0;enemies.length=0;explosions.length=0;
  score=0;lives=3;level=1;
  const uname=loggedAs.textContent||'Guest';
  player=new Tank(TILE*9+2,TILE*17+2,'up',false,uname);
  paused=true;
  updateUI();
}

// --- UI ---
function updateUI(){ UI.score.textContent=score; UI.lives.textContent=lives; UI.level.textContent=level; loggedAs.textContent=player.username; }

// --- Render ---
function render(){
  ctx.clearRect(0,0,W,H);
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell=tiles[r][c];
      if(!cell) continue;
      ctx.fillStyle=cell.type=='brick'?'#b64d3b':'#7a7a7a';
      ctx.fillRect(c*TILE,r*TILE,TILE,TILE);
    }
  }
  bullets.forEach(b=>{ ctx.fillStyle=b.fromEnemy?'#ff6b6b':'#7ce0ff'; ctx.fillRect(b.x-3,b.y-3,6,6); });
  enemies.forEach(e=>e.draw(ctx));
  if(player) player.draw(ctx);
}
function loop(){
  const dt=1;
  if(!paused){ update(dt); }
  render();
  requestAnimationFrame(loop);
}

// --- Update ---
function update(dt){
  if(player){
    if(keys['arrowup']) player.y-=player.speed;
    if(keys['arrowdown']) player.y+=player.speed;
    if(keys['arrowleft']) player.x-=player.speed;
    if(keys['arrowright']) player.x+=player.speed;
    if(keys[' ']) player.fire();
    if(socket) socket.emit('move',{x:player.x,y:player.y,dir:player.dir,username:player.username});
  }
  bullets.forEach((b,i)=>{ b.x+=b.vx; b.y+=b.vy; if(b.x<0||b.y<0||b.x>W||b.y>H) bullets.splice(i,1); });
}

// --- Utils ---
function roundRect(ctx,x,y,w,h,r,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.fill(); }

// --- Online Multiplayer ---
networkBtn.addEventListener('click',()=>{
  if(socket) return alert('Already connected!');
  socket=io(); // connect to server
  socket.emit('join',{username:player.username});
  socket.on('players',data=>{ otherPlayers=data; });
  socket.on('fire',b=>{ bullets.push({...b,fromEnemy:true}); });
});

// --- Start ---
initGame();
loop();
