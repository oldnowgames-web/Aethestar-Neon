/* =========================================================
   AETHESTAR NEON
   ========================================================= */
(() => {
'use strict';

/* ---------------------------------------------------------
   SISTEMA DE ÁUDIO SINTETIZADO (Web Audio API)
   --------------------------------------------------------- */
const Audio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playClick() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  },
  playDash() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  },
  playPowerup() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.08);
    osc.frequency.setValueAtTime(900, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.28);
  },
  playExplosion() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(50, now + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    whiteNoise.start(now);
  },
  playLaser() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.3);
  }
};

/* ---------------------------------------------------------
   CONFIGURAÇÃO E CONSTANTES
   --------------------------------------------------------- */
const CFG = {
  maxPlayWidth: 600,
  baseSpeed: 0.30,
  speedGrowth: 0.016,
  speedCap: 2.8,
  playerSpeed: 1.6,
  dragGain: 1.3,
  dashCooldown: 1.6,
  dashDistance: 0.30,
  dashIFrames: 0.28,
  shieldTime: 10,
  slowTime: 5,
  slowScale: 0.45,
  bonusPoints: 500,
  storeKey: 'aethestarNeon.best'
};
const C = { cyan:'#00f0ff', magenta:'#ff2bd6', purple:'#9b5cff', amber:'#ffd84a', white:'#f4fdff' };
const TAU = Math.PI * 2;
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

const QUALITY_PRESETS = [
  { glow:false, maxDpr:1,   particles:50,  streaks:8  },
  { glow:true,  maxDpr:1.5, particles:110, streaks:18 },
  { glow:true,  maxDpr:2,   particles:180, streaks:30 }
];
const quality = { level:2, glow:true, maxDpr:2, particles:180, streaks:30 };
{
  const weak = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2;
  quality.level = weak ? 1 : 2;
  Object.assign(quality, QUALITY_PRESETS[quality.level]);
}

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const mod = (n, m) => ((n % m) + m) % m;
const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

function loadBest() { try { return parseInt(localStorage.getItem(CFG.storeKey), 10) || 0; } catch (e) { return 0; } }
function saveBest(v) { try { localStorage.setItem(CFG.storeKey, String(v)); } catch (e) {} }

function circleRotRect(cx, cy, cr, rx, ry, half, rot) {
  const dx = cx - rx, dy = cy - ry;
  const c = Math.cos(-rot), s = Math.sin(-rot);
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  const qx = clamp(lx, -half, half), qy = clamp(ly, -half, half);
  const ex = lx - qx, ey = ly - qy;
  return ex * ex + ey * ey < cr * cr;
}

const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });
const el = {
  probe: $('safeProbe'),
  hudScore: $('hudScore'), hudBest: $('hudBest'),
  bestStart: $('bestStart'), bestOver: $('bestOver'),
  finalScore: $('finalScore'), recordMsg: $('recordMsg'),
  btnPause: $('btnPause'), btnPlay: $('btnPlay'), btnFull: $('btnFull'),
  btnRestart: $('btnRestart'), btnMenuOver: $('btnMenuOver'),
  btnResume: $('btnResume'), btnMenuPause: $('btnMenuPause'),
  btnLeft: $('btnLeft'), btnRight: $('btnRight'), btnDash: $('btnDash'), dashFill: $('dashFill')
};
const chips = {
  shield: { box: $('chipShield'), bar: $('chipShield').lastElementChild, on: false, v: -1 },
  slow:   { box: $('chipSlow'),   bar: $('chipSlow').lastElementChild,   on: false, v: -1 },
  dash:   { box: $('chipDash'),   bar: $('chipDash').lastElementChild,   on: true,  v: -1, ready: false }
};

let state = 'menu';
let best = loadBest();

const game = {
  time: 0, score: 0, speedMul: 1, timeScale: 1, slowT: 0, scroll: 0,
  spawnT: 1, puT: 6, shake: 0, flash: 0, overT: 0, newRecord: false
};
const player = { x: 0, tx: 0, tilt: 0, dir: 1, invuln: 0, shield: 0, dashCd: 0, dashT: 0, trailT: 0, dead: false };
const input = { kL: false, kR: false, bL: false, bR: false };
const drag = { active: false, id: -1, lastX: 0 };
const obs = [];
const pups = [];
const texts = [];

function setState(s) {
  state = s;
  const cl = document.body.classList;
  cl.remove('s-menu', 's-play', 's-pause', 's-over', 'over-ready');
  cl.add('s-' + s);
}
const isTouch = () => document.body.classList.contains('touch');

let W = 0, H = 0, DPR = 1;
let playX = 0, playW = 0;
let unit = 0, cell = 32;
let shipR = 14, shipY = 0;
let shipPath = null;
const insets = { top: 0, right: 0, bottom: 0, left: 0 };
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');

function readInsets() {
  const cs = getComputedStyle(el.probe);
  insets.top = parseFloat(cs.paddingTop) || 0;
  insets.right = parseFloat(cs.paddingRight) || 0;
  insets.bottom = parseFloat(cs.paddingBottom) || 0;
  insets.left = parseFloat(cs.paddingLeft) || 0;
}

function resize() {
  const old = { playX, playW, H, unit };
  readInsets();
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, quality.maxDpr);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  playW = Math.min(W, CFG.maxPlayWidth);
  playX = (W - playW) / 2;
  unit = Math.min(playW, H);
  cell = Math.max(26, Math.round(playW / 12));
  shipR = clamp(unit * 0.04, 11, 18);

  const portrait = H >= W;
  const bottom = isTouch() ? (portrait ? 132 : 60) : 64;
  shipY = H - bottom - insets.bottom;

  buildShipPath();
  buildBackground();
  initStreaks();

  if (old.playW > 0) {
    if (state === 'menu') { player.x = player.tx = playX + playW / 2; }
    else rescaleWorld(old);
  }
}

function rescaleWorld(o) {
  const kx = playW / o.playW, ky = H / o.H, ku = unit / o.unit;
  const mx = x => playX + (x - o.playX) * kx;
  player.x = mx(player.x); player.tx = mx(player.tx);
  for (const b of obs) {
    b.x = mx(b.x); b.y *= ky;
    if (b.type === 'block') b.s *= ku;
    else if (b.type === 'laser') b.w *= ku;
    else { b.h *= ku; b.gapW *= ku; }
  }
  for (const u of pups) { u.x = mx(u.x); u.y *= ky; u.r *= ku; }
  texts.length = 0;
}

function buildShipPath() {
  const r = shipR, p = new Path2D();
  p.moveTo(0, -r * 1.45); p.lineTo(r * 1.05, r * 0.95); p.lineTo(0, r * 0.4); p.lineTo(-r * 1.05, r * 0.95); p.closePath();
  shipPath = p;
}

function buildBackground() {
  bgCanvas.width = Math.round(W * DPR);
  bgCanvas.height = Math.round(H * DPR);
  const b = bgCtx;
  b.setTransform(DPR, 0, 0, DPR, 0, 0);

  const g = b.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#08031a'); g.addColorStop(0.6, '#0c0428'); g.addColorStop(1, '#180733');
  b.fillStyle = g; b.fillRect(0, 0, W, H);

  const r = b.createRadialGradient(W / 2, H * 1.02, 0, W / 2, H * 1.02, Math.max(W, H) * 0.75);
  r.addColorStop(0, 'rgba(255,43,214,0.20)');
  r.addColorStop(0.5, 'rgba(138,61,255,0.08)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  b.fillStyle = r; b.fillRect(0, 0, W, H);

  const kMin = -Math.ceil(playX / cell), kMax = Math.ceil((W - playX) / cell);
  b.lineWidth = 1;
  b.beginPath();
  for (let k = kMin; k <= kMax; k++) {
    if (mod(k, 4) === 0) continue;
    const x = Math.round(playX + k * cell) + 0.5; b.moveTo(x, 0); b.lineTo(x, H);
  }
  b.strokeStyle = 'rgba(155,92,255,0.20)'; b.stroke();
  b.beginPath();
  for (let k = kMin; k <= kMax; k++) {
    if (mod(k, 4) !== 0) continue;
    const x = Math.round(playX + k * cell) + 0.5; b.moveTo(x, 0); b.lineTo(x, H);
  }
  b.strokeStyle = 'rgba(0,240,255,0.24)'; b.stroke();
}

const MAX_P = 180;
const particles = [];
for (let i = 0; i < MAX_P; i++) particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: C.cyan });
let pIdx = 0;

function emit(x, y, vx, vy, life, size, color) {
  const p = particles[pIdx];
  pIdx = (pIdx + 1) % quality.particles;
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.color = color;
}
function burst(x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(0.2, 1) * speed;
    emit(x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.35, 0.8), rnd(2, 5), color);
  }
}
function updateParticles(dt) {
  const f = 1 - Math.min(1, 2.5 * dt);
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= f; p.vy *= f;
  }
}
function drawParticles() {
  for (const p of particles) {
    if (p.life <= 0) continue;
    const a = p.life / p.max, s = p.size * (0.4 + 0.6 * a);
    ctx.globalAlpha = a; ctx.fillStyle = p.color;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

let streaks = [];
function initStreaks() {
  streaks = [];
  for (let i = 0; i < quality.streaks; i++)
    streaks.push({ x: rnd(0, W), y: rnd(0, H), len: rnd(14, 60), sp: rnd(0.7, 1.8), c: i % 3 === 0 ? 1 : 0 });
}
function updateStreaks(v, dt) {
  for (const s of streaks) {
    s.y += v * s.sp * dt;
    if (s.y - s.len > H) { s.y = -rnd(0, 40); s.x = rnd(0, W); }
  }
}
function drawStreaks() {
  ctx.lineWidth = 1.5;
  for (let c = 0; c < 2; c++) {
    ctx.beginPath();
    for (const s of streaks) if (s.c === c) { ctx.moveTo(s.x, s.y - s.len); ctx.lineTo(s.x, s.y); }
    ctx.strokeStyle = c ? 'rgba(255,43,214,0.30)' : 'rgba(0,240,255,0.28)';
    ctx.stroke();
  }
}

function addText(x, y, str, color) {
  if (texts.length >= 6) texts.shift();
  texts.push({ x, y, str, color, life: 1 });
}
function updateTexts(dt) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt * 1.1; t.y -= 50 * dt;
    if (t.life <= 0) texts.splice(i, 1);
  }
}
function drawTexts() {
  if (!texts.length) return;
  ctx.font = '700 ' + Math.round(clamp(unit * 0.045, 14, 20)) + 'px "Chakra Petch","Trebuchet MS",sans-serif';
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = Math.min(1, t.life * 1.5); ctx.fillStyle = t.color;
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function resetGame() {
  obs.length = 0; pups.length = 0; texts.length = 0;
  for (const p of particles) p.life = 0;
  Object.assign(game, { time: 0, score: 0, speedMul: 1, timeScale: 1, slowT: 0, spawnT: 1, puT: 6, shake: 0, flash: 0, overT: 0, newRecord: false });
  Object.assign(player, { x: playX + playW / 2, tx: playX + playW / 2, tilt: 0, dir: 1, invuln: 0, shield: 0, dashCd: 0, dashT: 0, trailT: 0, dead: false });
  hudScoreVal = -1; updateHud(true);
}

function startGame() {
  Audio.init();
  Audio.playClick();
  if (state === 'play' || state === 'pause') return;
  if (state === 'over' && !document.body.classList.contains('over-ready')) return;
  resetGame();
  setState('play');
  fpsAcc = 0; fpsN = 0; lowCount = 0;
}

function goMenu() {
  Audio.init();
  Audio.playClick();
  resetGame();
  clearInputs();
  el.bestStart.textContent = best;
  setState('menu');
  player.x = player.tx = playX + playW / 2;
}

function pauseGame() {
  if (state !== 'play') return;
  Audio.init();
  Audio.playClick();
  clearInputs();
  setState('pause');
}

function resumeGame() {
  if (state !== 'pause') return;
  Audio.init();
  Audio.playClick();
  setState('play');
}

function clearInputs() {
  input.kL = input.kR = input.bL = input.bR = false;
  drag.active = false;
  el.btnLeft.classList.remove('down'); el.btnRight.classList.remove('down'); el.btnDash.classList.remove('down');
}

function addShake(v) { if (!REDUCED) game.shake = Math.max(game.shake, v); }

function gameOver() {
  if (state !== 'play') return;
  Audio.playExplosion();
  setState('over');
  clearInputs();
  player.dead = true;
  burst(player.x, shipY, 70, C.cyan, 320);
  burst(player.x, shipY, 40, C.magenta, 260);
  burst(player.x, shipY, 16, C.white, 380);
  addShake(1);
  if (!REDUCED) game.flash = 0.5;
  vibrate([60, 40, 120]);

  const s = Math.floor(game.score);
  game.newRecord = s > best;
  if (game.newRecord) { best = s; saveBest(best); }
  el.finalScore.textContent = s;
  el.bestOver.textContent = best;
  el.recordMsg.hidden = !game.newRecord;
  game.overT = 0;
}

function hitPlayer(o) {
  const p = player;
  if (state !== 'play' || p.invuln > 0) return;
  if (p.shield > 0) {
    p.shield = 0; p.invuln = 1.0;
    Audio.playExplosion();
    burst(p.x, shipY, 28, C.cyan, 240);
    addShake(0.3); vibrate(30);
    if (o && o.type === 'block') { o.dead = true; burst(o.x, o.y, 18, o.color, 220); }
    return;
  }
  gameOver();
}

function doDash() {
  const p = player;
  if (state !== 'play' || p.dashCd > 0) return;
  Audio.playDash();
  const dir = ((input.kR || input.bR) ? 1 : 0) - ((input.kL || input.bL) ? 1 : 0) || p.dir;
  p.dashCd = CFG.dashCooldown; p.dashT = 0.16;
  p.invuln = Math.max(p.invuln, CFG.dashIFrames);
  p.tx = clamp(p.tx + dir * playW * CFG.dashDistance, playX + shipR, playX + playW - shipR);
  burst(p.x, shipY, 14, C.cyan, 160);
  vibrate(10);
}

function updatePlayer(dt) {
  const p = player;
  const dir = ((input.kR || input.bR) ? 1 : 0) - ((input.kL || input.bL) ? 1 : 0);
  if (dir !== 0) { p.tx += dir * playW * CFG.playerSpeed * dt; p.dir = dir; }
  p.tx = clamp(p.tx, playX + shipR, playX + playW - shipR);
  p.x += (p.tx - p.x) * Math.min(1, dt * (p.dashT > 0 ? 40 : 16));

  const tiltTarget = clamp((p.tx - p.x) / (playW * 0.12), -1, 1) * 0.32;
  p.tilt += (tiltTarget - p.tilt) * Math.min(1, dt * 14);

  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.dashT = Math.max(0, p.dashT - dt);
  if (p.shield > 0) p.shield = Math.max(0, p.shield - dt);

  p.trailT -= dt;
  if (p.trailT <= 0) {
    const dashing = p.dashT > 0;
    p.trailT = quality.level === 0 ? 0.05 : 0.022;
    emit(p.x + rnd(-2, 2), shipY + shipR * 0.9, rnd(-12, 12), rnd(40, 110),
         dashing ? 0.5 : 0.36, shipR * (dashing ? 0.5 : 0.32), Math.random() < 0.55 ? C.cyan : C.magenta);
  }
}

function spawnObstacle(vy) {
  const t = game.time, r = Math.random();
  let type = 'block';
  if (t > 8 && r < 0.16) type = 'laser';
  else if (t > 18 && r > 0.86) type = 'wall';

  let mult = 1;
  if (type === 'block') {
    const s = unit * rnd(0.085, 0.17);
    const aimed = Math.random() < 0.4;
    let x = aimed ? player.x + rnd(-1, 1) * unit * 0.12 : rnd(playX + s / 2, playX + playW - s / 2);
    x = clamp(x, playX + s / 2, playX + playW - s / 2);
    obs.push({ type: 'block', x, y: -s, s, rot: rnd(0, TAU), vr: rnd(-2.2, 2.2), m: rnd(0.85, 1.25),
               color: Math.random() < 0.7 ? C.magenta : C.purple });
  } else if (type === 'laser') {
    const w = shipR * rnd(2.6, 4.2);
    let x = Math.random() < 0.6 ? player.x + rnd(-0.5, 0.5) * shipR * 4 : rnd(playX + w / 2, playX + playW - w / 2);
    x = clamp(x, playX + w / 2, playX + playW - w / 2);
    obs.push({ type: 'laser', x, y: 0, w, state: 'warn', t: 0, warn: Math.max(0.6, 1.05 - t * 0.005), fire: 0.5 });
    mult = 1.5;
  } else {
    const h = clamp(unit * 0.045, 14, 26);
    const gapW = shipR * 2 * lerp(3.8, 2.7, clamp(t / 90, 0, 1));
    const x = rnd(playX + gapW / 2, playX + playW - gapW / 2);
    obs.push({ type: 'wall', x, y: -h, h, gapW, m: 1 });
    mult = 1.9;
  }
  const gap = H * lerp(0.34, 0.19, clamp(t / 100, 0, 1));
  game.spawnT = (gap / vy) * rnd(0.8, 1.2) * mult;
}

function spawnPowerup() {
  const bag = ['bonus', 'slow'];
  if (player.shield <= 0) bag.push('shield', 'shield');
  const type = bag[Math.floor(Math.random() * bag.length)];
  const r = clamp(unit * 0.045, 13, 20);
  pups.push({ type, x: rnd(playX + r + 4, playX + playW - r - 4), y: -r, r, t: rnd(0, TAU) });
}

function collect(u) {
  Audio.playPowerup();
  if (u.type === 'shield') {
    player.shield = CFG.shieldTime;
    addText(u.x, u.y, 'Escudo', C.cyan); burst(u.x, u.y, 16, C.cyan, 190);
  } else if (u.type === 'slow') {
    game.slowT = CFG.slowTime;
    addText(u.x, u.y, 'Câmera lenta', C.purple); burst(u.x, u.y, 16, C.purple, 190);
  } else {
    game.score += CFG.bonusPoints;
    addText(u.x, u.y, '+' + CFG.bonusPoints, C.amber); burst(u.x, u.y, 18, C.amber, 210);
  }
  vibrate(15);
}

function beamW(o) {
  const k = o.t < 0.06 ? o.t / 0.06 : (o.t > o.fire - 0.08 ? Math.max(0, (o.fire - o.t) / 0.08) : 1);
  return o.w * k * (0.94 + 0.06 * Math.sin(o.t * 90));
}

function updateObstacles(wdt, vy) {
  const p = player, hitR = shipR * 0.72;
  for (let i = obs.length - 1; i >= 0; i--) {
    const o = obs[i];

    if (o.type === 'laser') {
      o.t += wdt;
      if (o.state === 'warn') {
        if (o.t >= o.warn) {
          o.state = 'fire';
          o.t = 0;
          Audio.playLaser();
          addShake(0.18);
        }
      } else {
        if (o.t >= o.fire) { obs.splice(i, 1); game.score += 10; continue; }
        if (Math.abs(p.x - o.x) < beamW(o) / 2 + hitR * 0.6) hitPlayer(o);
      }
      continue;
    }

    o.y += vy * (o.m || 1) * wdt;

    if (o.type === 'block') {
      o.rot += o.vr * wdt;
      if (o.y - o.s > H) { obs.splice(i, 1); game.score += 10; continue; }
      if (Math.abs(o.y - shipY) < o.s * 0.8 + hitR && circleRotRect(p.x, shipY, hitR, o.x, o.y, o.s * 0.47, o.rot)) {
        hitPlayer(o);
        if (o.dead) obs.splice(i, 1);
      }
    } else {
      if (o.y > H) { obs.splice(i, 1); game.score += 10; continue; }
      if (shipY + hitR > o.y && shipY - hitR < o.y + o.h) {
        const L = o.x - o.gapW / 2, R = o.x + o.gapW / 2;
        if (p.x - hitR * 0.8 < L || p.x + hitR * 0.8 > R) hitPlayer(o);
      }
    }
  }
}

function updatePowerups(wdt, vy) {
  const p = player;
  for (let i = pups.length - 1; i >= 0; i--) {
    const u = pups[i];
    u.y += vy * 0.8 * wdt;
    if (u.y - u.r > H) { pups.splice(i, 1); continue; }
    const dx = p.x - u.x, dy = shipY - u.y, rr = u.r + shipR * 0.9;
    if (dx * dx + dy * dy < rr * rr) { collect(u); pups.splice(i, 1); }
  }
}

let fpsAcc = 0, fpsN = 0, lowCount = 0;
function monitorFps(dt) {
  fpsAcc += dt; fpsN++;
  if (fpsAcc < 1.5) return;
  const fps = fpsN / fpsAcc;
  fpsAcc = 0; fpsN = 0;
  if (game.time < 2.5) return;
  if (fps < 40 && quality.level > 0) {
    if (++lowCount >= 2) {
      quality.level--;
      Object.assign(quality, QUALITY_PRESETS[quality.level]);
      lowCount = 0;
      resize();
    }
  } else lowCount = 0;
}

function update(dt) {
  const g = game;
  g.time += dt;
  g.speedMul = Math.min(1 + g.time * CFG.speedGrowth, CFG.speedCap);

  if (g.slowT > 0) g.slowT = Math.max(0, g.slowT - dt);
  g.timeScale += ((g.slowT > 0 ? CFG.slowScale : 1) - g.timeScale) * Math.min(1, dt * 5);
  const wdt = dt * g.timeScale;
  const vy = H * CFG.baseSpeed * g.speedMul;

  g.score += dt * (20 + g.speedMul * 10);
  g.scroll += vy * 0.55 * wdt;

  updatePlayer(dt);

  g.spawnT -= wdt; if (g.spawnT <= 0) spawnObstacle(vy);
  g.puT -= wdt;    if (g.puT <= 0) { spawnPowerup(); g.puT = rnd(7, 12); }

  updateObstacles(wdt, vy);
  updatePowerups(wdt, vy);
  updateStreaks(vy * 0.9, wdt);
  updateParticles(dt);
  updateTexts(dt);

  g.shake = Math.max(0, g.shake - dt * 1.8);
  g.flash = Math.max(0, g.flash - dt * 2.5);
  updateHud(false);
  monitorFps(dt);
}

function updateOver(dt) {
  const g = game;
  g.scroll += H * 0.05 * dt;
  updateStreaks(H * 0.08, dt);
  updateParticles(dt);
  updateTexts(dt);
  g.shake = Math.max(0, g.shake - dt * 1.8);
  g.flash = Math.max(0, g.flash - dt * 2.5);
  g.overT += dt;
  if (g.overT > 0.75) document.body.classList.add('over-ready');
}

function updateMenu(dt) {
  game.scroll += H * 0.14 * dt;
  updateStreaks(H * 0.2, dt);
  updateParticles(dt);
}

let hudScoreVal = -1;
function updateChip(c, on, v) {
  if (on !== c.on) { c.on = on; c.box.classList.toggle('on', on); c.v = -1; }
  if (on && Math.abs(v - c.v) > 0.004) { c.v = v; c.bar.style.transform = 'scaleX(' + v.toFixed(3) + ')'; }
}
function updateHud(force) {
  const s = Math.floor(game.score);
  if (s !== hudScoreVal || force) {
    hudScoreVal = s;
    el.hudScore.textContent = s;
    el.hudBest.textContent = Math.max(best, s);
  }
  const p = player;
  updateChip(chips.shield, p.shield > 0, p.shield / CFG.shieldTime);
  updateChip(chips.slow, game.slowT > 0, game.slowT / CFG.slowTime);

  const fill = 1 - clamp(p.dashCd / CFG.dashCooldown, 0, 1);
  const ready = p.dashCd <= 0;
  if (ready !== chips.dash.ready) { chips.dash.ready = ready; chips.dash.box.classList.toggle('ready', ready); }
  if (Math.abs(fill - chips.dash.v) > 0.004 || force) {
    chips.dash.v = fill;
    chips.dash.bar.style.transform = 'scaleX(' + fill.toFixed(3) + ')';
    el.dashFill.style.transform = 'scaleY(' + (1 - fill).toFixed(3) + ')';
  }
}

function strokeP(path) { if (path) ctx.stroke(path); else ctx.stroke(); }

function glowStroke(color, lw, a, path) {
  if (a === undefined) a = 1;
  ctx.strokeStyle = color;
  if (quality.glow) {
    ctx.lineWidth = lw * 5;   ctx.globalAlpha = 0.10 * a; strokeP(path);
    ctx.lineWidth = lw * 2.6; ctx.globalAlpha = 0.22 * a; strokeP(path);
  }
  ctx.lineWidth = lw; ctx.globalAlpha = a; strokeP(path);
  ctx.strokeStyle = C.white; ctx.lineWidth = Math.max(1, lw * 0.35); ctx.globalAlpha = 0.75 * a; strokeP(path);
  ctx.globalAlpha = 1;
}

function drawBackground() {
  ctx.drawImage(bgCanvas, 0, 0, W, H);

  const off = game.scroll % cell, base = Math.floor(game.scroll / cell);
  ctx.lineWidth = 1;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0, y = off; y < H + 1; i++, y = i * cell + off) {
      const major = mod(i - base, 4) === 0;
      if ((pass === 1) === major) { const yy = Math.round(y) + 0.5; ctx.moveTo(0, yy); ctx.lineTo(W, yy); }
    }
    ctx.strokeStyle = pass ? 'rgba(0,240,255,0.24)' : 'rgba(155,92,255,0.20)';
    ctx.stroke();
  }

  drawStreaks();

  if (playX > 1) {
    ctx.fillStyle = 'rgba(4,1,12,0.55)';
    ctx.fillRect(0, 0, playX, H);
    ctx.fillRect(playX + playW, 0, playX, H);
    ctx.beginPath();
    ctx.moveTo(playX, 0); ctx.lineTo(playX, H);
    ctx.moveTo(playX + playW, 0); ctx.lineTo(playX + playW, H);
    glowStroke(C.purple, 1.5, 0.9);
  }
}

function drawIcon(type, x, y, r) {
  ctx.beginPath();
  if (type === 'shield') {
    ctx.moveTo(x, y - r * 0.6);
    ctx.lineTo(x + r * 0.5, y - r * 0.35); ctx.lineTo(x + r * 0.45, y + r * 0.15);
    ctx.quadraticCurveTo(x + r * 0.3, y + r * 0.5, x, y + r * 0.65);
    ctx.quadraticCurveTo(x - r * 0.3, y + r * 0.5, x - r * 0.45, y + r * 0.15);
    ctx.lineTo(x - r * 0.5, y - r * 0.35); ctx.closePath();
  } else if (type === 'slow') {
    ctx.arc(x, y, r * 0.5, 0, TAU);
    ctx.moveTo(x, y); ctx.lineTo(x, y - r * 0.32);
    ctx.moveTo(x, y); ctx.lineTo(x + r * 0.24, y + r * 0.12);
  } else {
    ctx.moveTo(x, y - r * 0.6);
    ctx.quadraticCurveTo(x, y, x + r * 0.6, y);
    ctx.quadraticCurveTo(x, y, x, y + r * 0.6);
    ctx.quadraticCurveTo(x, y, x - r * 0.6, y);
    ctx.quadraticCurveTo(x, y, x, y - r * 0.6);
  }
  ctx.strokeStyle = C.white; ctx.lineWidth = 1.8; ctx.stroke();
}

function drawPowerups() {
  const t = performance.now() / 1000;
  for (const u of pups) {
    const col = u.type === 'shield' ? C.cyan : (u.type === 'slow' ? C.purple : C.amber);
    const pulse = 1 + 0.1 * Math.sin(t * 7 + u.t);
    ctx.beginPath(); ctx.arc(u.x, u.y, u.r * pulse, 0, TAU);
    ctx.globalAlpha = 0.18; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
    glowStroke(col, 2.2);
    drawIcon(u.type, u.x, u.y, u.r);
  }
}

function drawBlock(o) {
  const h = o.s / 2;
  ctx.save();
  ctx.translate(o.x, o.y); ctx.rotate(o.rot);
  ctx.beginPath(); ctx.rect(-h, -h, o.s, o.s);
  ctx.globalAlpha = 0.16; ctx.fillStyle = o.color; ctx.fill(); ctx.globalAlpha = 1;
  ctx.rect(-h * 0.42, -h * 0.42, h * 0.84, h * 0.84);
  glowStroke(o.color, 2);
  ctx.restore();
}

function drawLaser(o) {
  if (o.state === 'warn') {
    const on = Math.floor(o.t * 16) % 2 === 0;
    ctx.globalAlpha = on ? 0.75 : 0.3;
    ctx.strokeStyle = C.magenta; ctx.lineWidth = 2; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = on ? 0.10 : 0.04; ctx.fillStyle = C.magenta;
    ctx.fillRect(o.x - o.w / 2, 0, o.w, H);
    const my = insets.top + 100;
    ctx.globalAlpha = on ? 1 : 0.5;
    ctx.beginPath(); ctx.moveTo(o.x - 9, my); ctx.lineTo(o.x + 9, my); ctx.lineTo(o.x, my + 18); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const w = beamW(o);
    ctx.fillStyle = C.magenta;
    if (quality.glow) { ctx.globalAlpha = 0.14; ctx.fillRect(o.x - w * 1.1, 0, w * 2.2, H); }
    ctx.globalAlpha = 0.5;  ctx.fillRect(o.x - w / 2, 0, w, H);
    ctx.globalAlpha = 0.95; ctx.fillStyle = C.white; ctx.fillRect(o.x - w * 0.14, 0, w * 0.28, H);
    ctx.globalAlpha = 1;
  }
}

function drawWall(o) {
  const L = o.x - o.gapW / 2, R = o.x + o.gapW / 2;
  ctx.beginPath();
  ctx.rect(playX, o.y, L - playX, o.h);
  ctx.rect(R, o.y, playX + playW - R, o.h);
  ctx.globalAlpha = 0.2; ctx.fillStyle = C.purple; ctx.fill(); ctx.globalAlpha = 1;
  glowStroke(C.magenta, 2);
  ctx.beginPath();
  ctx.moveTo(L, o.y - 4); ctx.lineTo(L, o.y + o.h + 4);
  ctx.moveTo(R, o.y - 4); ctx.lineTo(R, o.y + o.h + 4);
  ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
}

function drawObstacles() {
  for (const o of obs) {
    if (o.type === 'block') drawBlock(o);
    else if (o.type === 'laser') drawLaser(o);
    else drawWall(o);
  }
}

function drawPlayer() {
  const p = player;
  if (p.dead) return;
  const t = performance.now() / 1000;
  const bob = state === 'menu' ? Math.sin(t * 2.2) * 4 : 0;
  const a = (p.invuln > 0 && Math.floor(t * 18) % 2 === 0) ? 0.4 : 1;

  ctx.save();
  ctx.translate(p.x, shipY + bob);
  ctx.rotate(p.tilt);

  const fl = shipR * (0.9 + Math.random() * 0.7);
  ctx.beginPath();
  ctx.moveTo(-shipR * 0.32, shipR * 0.75); ctx.lineTo(shipR * 0.32, shipR * 0.75); ctx.lineTo(0, shipR * 0.75 + fl);
  ctx.closePath();
  ctx.globalAlpha = 0.85 * a; ctx.fillStyle = C.magenta; ctx.fill();

  ctx.globalAlpha = 0.2 * a; ctx.fillStyle = C.cyan; ctx.fill(shipPath);
  glowStroke(C.cyan, 2.4, a, shipPath);

  if (p.shield > 0 && !(p.shield < 2.5 && Math.floor(t * 8) % 2 === 0)) {
    ctx.beginPath(); ctx.arc(0, 0, shipR * 1.9, 0, TAU);
    ctx.globalAlpha = 0.10; ctx.fillStyle = C.cyan; ctx.fill(); ctx.globalAlpha = 1;
    glowStroke(C.cyan, 2, 0.9);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function render() {
  const g = game;
  ctx.save();
  if (g.shake > 0 && !REDUCED) {
    const m = g.shake * g.shake * 12;
    ctx.translate(rnd(-m, m), rnd(-m, m));
  }
  drawBackground();
  drawPowerups();
  drawObstacles();
  drawParticles();
  drawPlayer();
  drawTexts();
  ctx.restore();

  if (g.timeScale < 0.99) {
    ctx.fillStyle = 'rgba(155,92,255,' + ((1 - g.timeScale) * 0.28).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (g.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (g.flash * 0.5).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) return;
  if (dt > 0.1) dt = 0.1;
  if (state === 'pause') return;
  if (state === 'play') update(dt);
  else if (state === 'over') updateOver(dt);
  else updateMenu(dt);
  render();
}

window.addEventListener('keydown', e => {
  const c = e.code;
  if (c === 'ArrowLeft' || c === 'KeyA') { input.kL = true; e.preventDefault(); }
  else if (c === 'ArrowRight' || c === 'KeyD') { input.kR = true; e.preventDefault(); }
  else if (c === 'Space' || c === 'Enter') {
    e.preventDefault();
    if (e.repeat) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (state === 'menu' || state === 'over') startGame();
    else if (state === 'play') doDash();
    else if (state === 'pause') resumeGame();
  }
  else if (c === 'KeyP' || c === 'Escape') {
    if (state === 'play') pauseGame(); else if (state === 'pause') resumeGame();
  }
});
window.addEventListener('keyup', e => {
  const c = e.code;
  if (c === 'ArrowLeft' || c === 'KeyA') input.kL = false;
  else if (c === 'ArrowRight' || c === 'KeyD') input.kR = false;
});

canvas.addEventListener('pointerdown', e => {
  if (state !== 'play' || drag.active) return;
  drag.active = true; drag.id = e.pointerId; drag.lastX = e.clientX;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
canvas.addEventListener('pointermove', e => {
  if (!drag.active || e.pointerId !== drag.id || state !== 'play') return;
  const dx = e.clientX - drag.lastX;
  drag.lastX = e.clientX;
  player.tx = clamp(player.tx + dx * CFG.dragGain, playX + shipR, playX + playW - shipR);
  if (dx !== 0) player.dir = dx > 0 ? 1 : -1;
});
const endDrag = e => { if (e.pointerId === drag.id) drag.active = false; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function bindHold(btn, key) {
  const up = () => { input[key] = false; btn.classList.remove('down'); };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    input[key] = true; btn.classList.add('down');
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  });
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
}
bindHold(el.btnLeft, 'bL');
bindHold(el.btnRight, 'bR');
el.btnDash.addEventListener('pointerdown', e => {
  e.preventDefault();
  el.btnDash.classList.add('down');
  doDash();
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
  el.btnDash.addEventListener(ev, () => el.btnDash.classList.remove('down')));

el.btnPlay.addEventListener('click', startGame);
el.btnRestart.addEventListener('click', startGame);
el.btnMenuOver.addEventListener('click', goMenu);
el.btnMenuPause.addEventListener('click', goMenu);
el.btnPause.addEventListener('click', pauseGame);
el.btnResume.addEventListener('click', resumeGame);

const root = document.documentElement;
const reqFS = root.requestFullscreen || root.webkitRequestFullscreen;
if (!reqFS) el.btnFull.hidden = true;
el.btnFull.addEventListener('click', () => {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      if (r && r.catch) r.catch(() => {});
    } else {
      const r = reqFS.call(root);
      if (r && r.catch) r.catch(() => {});
    }
  } catch (err) {}
});

if (window.matchMedia && matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
window.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' && !isTouch()) { document.body.classList.add('touch'); resize(); }
}, { passive: true });

document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', pauseGame);

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());

let lastPortrait = null;
function onResize() {
  resize();
  const portrait = H >= W;
  if (lastPortrait !== null && lastPortrait !== portrait) pauseGame();
  lastPortrait = portrait;
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

setState('menu');
el.bestStart.textContent = best;
resize();
lastPortrait = H >= W;
resetGame();
player.x = player.tx = playX + playW / 2;
requestAnimationFrame(frame);

})();