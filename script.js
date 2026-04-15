/* ═══ CONFIG ═══ */
const COLORS = [
  '#4a7aff', '#22d3ee', '#2dd4a0', '#a855f7', '#ff5caa',
  '#ff4a6a', '#ff8c42', '#ffd449', '#f0f0f5', '#555566'
];
const SMOOTH_N = 5;

/* ═══ STATE ═══ */
let color = COLORS[0], brush = 3, showSkel = true;
let strokes = [], curStroke = null, drawing = false;
let selIdx = -1;
let lmHist = [[], []];
let twoHandActive = false; // track two-hand mode to reset history on transition
let thStartAng = null, thStartRot = null;

/* ═══ DOM ═══ */
const $ = id => document.getElementById(id);
const splash = $('splash'), app = $('app'), video = $('cam'), carea = $('carea');
const dCan = $('dc'), sCan = $('sk');
const dCtx = dCan.getContext('2d'), sCtx = sCan.getContext('2d');
const selRing = $('selRing'), modeTag = $('modeTag');

/* ═══ SIDEBAR ═══ */
COLORS.forEach((c, i) => {
  const d = document.createElement('div');
  d.className = 'c-sw' + (i === 0 ? ' on' : '');
  d.style.background = c;
  d.onclick = () => {
    document.querySelectorAll('.c-sw').forEach(s => s.classList.remove('on'));
    d.classList.add('on');
    color = c;
    updBrush();
  };
  $('cGrid').appendChild(d);
});

$('custCol').addEventListener('input', e => {
  color = e.target.value;
  document.querySelectorAll('.c-sw').forEach(s => s.classList.remove('on'));
  updBrush();
});

$('bSlider').addEventListener('input', e => {
  brush = +e.target.value;
  $('bVal').textContent = brush;
  updBrush();
});

function updBrush() {
  const s = Math.max(4, Math.min(brush * 2, 26));
  $('bDot').style.width = $('bDot').style.height = s + 'px';
  $('bDot').style.background = color;
  $('bDot').style.boxShadow = `0 0 5px ${color}`;
}
updBrush();

/* ═══ RESIZE ═══ */
function resize() {
  const r = carea.getBoundingClientRect();
  dCan.width = sCan.width = r.width;
  dCan.height = sCan.height = r.height;
  redraw();
}
window.addEventListener('resize', resize);

/* ═══ COORDINATES (un-mirror) ═══ */
function lm2c(lm) {
  const r = carea.getBoundingClientRect();
  return { x: (1 - lm.x) * r.width, y: lm.y * r.height };
}

/* ═══ DRAW ENGINE ═══ */
function redraw() {
  dCtx.clearRect(0, 0, dCan.width, dCan.height);
  strokes.forEach((s, i) => renderStroke(s, i === selIdx));
  if (curStroke) renderStroke(curStroke, false);
  updSelRing();
}

function renderStroke(s, sel) {
  if (s.pts.length < 2) return;
  dCtx.save();
  if (s.cx !== undefined) {
    dCtx.translate(s.cx, s.cy);
    dCtx.rotate((s.rot || 0) * Math.PI / 180);
    dCtx.scale(s.sc || 1, s.sc || 1);
    dCtx.translate(-s.cx, -s.cy);
  }
  // glow
  dCtx.lineCap = dCtx.lineJoin = 'round';
  dCtx.lineWidth = s.sz + 5;
  dCtx.strokeStyle = s.col;
  dCtx.globalAlpha = .07;
  dCtx.filter = `blur(${s.sz}px)`;
  trace(dCtx, s.pts);
  dCtx.stroke();
  dCtx.filter = 'none';
  // main
  dCtx.globalAlpha = .92;
  dCtx.lineWidth = s.sz;
  dCtx.strokeStyle = s.col;
  dCtx.shadowColor = s.col;
  dCtx.shadowBlur = s.sz * 2.2;
  trace(dCtx, s.pts);
  dCtx.stroke();
  // core
  dCtx.globalAlpha = .4;
  dCtx.lineWidth = Math.max(1, s.sz * .3);
  dCtx.strokeStyle = '#fff';
  dCtx.shadowBlur = s.sz;
  trace(dCtx, s.pts);
  dCtx.stroke();
  dCtx.shadowBlur = 0;
  dCtx.globalAlpha = 1;
  if (sel) {
    dCtx.setLineDash([5, 3]);
    dCtx.lineWidth = 1.5;
    dCtx.strokeStyle = 'rgba(74,122,255,.55)';
    trace(dCtx, s.pts);
    dCtx.stroke();
    dCtx.setLineDash([]);
  }
  dCtx.restore();
}

function trace(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2);
  }
}

/* Raw bounding box of original (untransformed) points — used only for initCenter */
function bounds(s) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of s.pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/*
 * Bounding box that accounts for the stroke's current rotation and scale.
 * Used for the selection ring position and nearest-stroke detection so that
 * both stay accurate after the user has rotated or zoomed a stroke.
 */
function transformedBounds(s) {
  if (s.cx === undefined || !s.pts.length) return bounds(s);
  const rot = (s.rot || 0) * Math.PI / 180;
  const sc = s.sc || 1;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of s.pts) {
    const dx = (p.x - s.cx) * sc;
    const dy = (p.y - s.cy) * sc;
    const fx = cos * dx - sin * dy + s.cx;
    const fy = sin * dx + cos * dy + s.cy;
    if (fx < x0) x0 = fx;
    if (fy < y0) y0 = fy;
    if (fx > x1) x1 = fx;
    if (fy > y1) y1 = fy;
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function initCenter(s) {
  const b = bounds(s);
  s.cx = b.cx;
  s.cy = b.cy;
  if (s.rot === undefined) s.rot = 0;
  if (s.sc === undefined) s.sc = 1;
}

/* Find nearest stroke to point using transformed bounds */
function findNearest(x, y) {
  if (!strokes.length) return -1;
  let best = -1, bestD = Infinity;
  for (let i = 0; i < strokes.length; i++) {
    const b = transformedBounds(strokes[i]);
    const dx = x - b.cx, dy = y - b.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestD) { bestD = dist; best = i; }
  }
  return best;
}

function updSelRing() {
  if (selIdx < 0 || selIdx >= strokes.length) { selRing.style.display = 'none'; return; }
  const b = transformedBounds(strokes[selIdx]);
  const r = carea.getBoundingClientRect(), pad = 14;
  selRing.style.display = 'block';
  selRing.style.left   = (r.left + b.x0 - pad) + 'px';
  selRing.style.top    = (r.top  + b.y0 - pad) + 'px';
  selRing.style.width  = (b.x1 - b.x0 + pad * 2) + 'px';
  selRing.style.height = (b.y1 - b.y0 + pad * 2) + 'px';
}

/* ═══ ACTIONS ═══ */
function clearAll() { strokes = []; curStroke = null; selIdx = -1; redraw(); }

function undo() {
  if (!strokes.length) return;
  strokes.pop();
  // clamp selIdx so it can never point past the end of the array
  if (selIdx >= strokes.length) selIdx = -1;
  redraw();
}

function savePNG() {
  const t = document.createElement('canvas');
  t.width = dCan.width;
  t.height = dCan.height;
  const c = t.getContext('2d');
  c.fillStyle = '#17171b';
  c.fillRect(0, 0, t.width, t.height);
  c.drawImage(dCan, 0, 0);
  const a = document.createElement('a');
  a.download = 'gesture-canvas.png';
  a.href = t.toDataURL('image/png');
  a.click();
}

function togSkel() {
  showSkel = !showSkel;
  $('skelBtn').classList.toggle('tog-on', showSkel);
  if (!showSkel) sCtx.clearRect(0, 0, sCan.width, sCan.height);
}

function showMode(txt) {
  modeTag.textContent = txt;
  modeTag.classList.add('vis');
  clearTimeout(showMode._t);
  showMode._t = setTimeout(() => modeTag.classList.remove('vis'), 1200);
}

/* ═══════════════════════════════════════════════════════════════
   GESTURE DETECTION

   • DRAW:       Index up, all others down
   • OPEN_PALM:  All 4 fingers up → SELECT nearest stroke
   • THUMBS_UP:  Thumb tip above IP, all fingers curled → ZOOM IN
   • THUMBS_DN:  Thumb tip below wrist, all fingers curled → ZOOM OUT
   • FIST:       Everything curled, thumb tucked → DESELECT
   • (two hands detected = ROTATE, handled separately)
═══════════════════════════════════════════════════════════════ */

function fingerUp(lm, finger) {
  const tips = { index: 8, middle: 12, ring: 16, pinky: 20 };
  const pips = { index: 6, middle: 10, ring: 14, pinky: 18 };
  return lm[tips[finger]].y < lm[pips[finger]].y - 0.01;
}

function fingerCurled(lm, finger) {
  const tips = { index: 8, middle: 12, ring: 16, pinky: 20 };
  const pips = { index: 6, middle: 10, ring: 14, pinky: 18 };
  return lm[tips[finger]].y > lm[pips[finger]].y + 0.01;
}

function detectGesture(lm) {
  const idxUp   = fingerUp(lm, 'index');
  const midUp   = fingerUp(lm, 'middle');
  const rngUp   = fingerUp(lm, 'ring');
  const pnkUp   = fingerUp(lm, 'pinky');

  const idxCurl = fingerCurled(lm, 'index');
  const midCurl = fingerCurled(lm, 'middle');
  const rngCurl = fingerCurled(lm, 'ring');
  const pnkCurl = fingerCurled(lm, 'pinky');

  const allCurled = idxCurl && midCurl && rngCurl && pnkCurl;

  const thumbTipY = lm[4].y;
  const thumbIPY  = lm[3].y;
  const wristY    = lm[0].y;
  const thumbUp   = allCurled && thumbTipY < thumbIPY - 0.04 && thumbTipY < lm[5].y;
  const thumbDn   = allCurled && thumbTipY > thumbIPY + 0.04 && thumbTipY > wristY;

  // Fist: everything curled including thumb tucked close to palm
  const thumbTucked = Math.abs(lm[4].x - lm[2].x) < 0.04;

  if (thumbUp) return 'thumbs_up';
  if (thumbDn) return 'thumbs_down';
  if (allCurled && thumbTucked) return 'fist';
  if (idxUp && midUp && rngUp && pnkUp) return 'open_palm';
  if (idxUp && midCurl && rngCurl && pnkCurl) return 'draw';
  return 'none';
}

/* ═══ SMOOTHING ═══ */
function smooth(hi, raw) {
  lmHist[hi].push(raw.map(l => ({ x: l.x, y: l.y, z: l.z })));
  if (lmHist[hi].length > SMOOTH_N) lmHist[hi].shift();
  const h = lmHist[hi], n = h.length;
  return raw.map((_, i) => {
    let sx = 0, sy = 0, sz = 0;
    for (const f of h) { sx += f[i].x; sy += f[i].y; sz += f[i].z; }
    return { x: sx / n, y: sy / n, z: sz / n };
  });
}

/* ═══ SKELETON ═══ */
const CONNS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
];

function drawSkel(lm) {
  sCtx.lineWidth = 1.4;
  sCtx.strokeStyle = 'rgba(74,122,255,.25)';
  for (const [a, b] of CONNS) {
    const pa = lm2c(lm[a]), pb = lm2c(lm[b]);
    sCtx.beginPath();
    sCtx.moveTo(pa.x, pa.y);
    sCtx.lineTo(pb.x, pb.y);
    sCtx.stroke();
  }
  for (let i = 0; i < lm.length; i++) {
    const p = lm2c(lm[i]);
    const r = [0, 4, 8, 12, 16, 20].includes(i) ? 3.5 : 2;
    sCtx.beginPath();
    sCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
    sCtx.fillStyle = [4, 8, 12, 16, 20].includes(i) ? '#ff5caa' : '#4a7aff';
    sCtx.fill();
  }
}

/* ═══ HUD ═══ */
function hud(g, m) {
  $('giG').textContent = g;
  $('giM').textContent = m;
  $('giS').textContent = selIdx >= 0 ? `Stroke #${selIdx + 1}` : '—';
  const sr = selIdx >= 0 ? strokes[selIdx] : null;
  $('giR').textContent  = sr ? Math.round(sr.rot || 0) + '°' : '0°';
  $('giSc').textContent = sr ? (sr.sc || 1).toFixed(2) : '1.00';
}

function finishStroke() {
  if (drawing && curStroke && curStroke.pts.length > 1) {
    initCenter(curStroke);
    strokes.push(curStroke);
  }
  drawing = false;
  curStroke = null;
}

/* ═══ MAIN HANDLER ═══ */
let selectDebounce = 0;

function onResults(res) {
  sCtx.clearRect(0, 0, sCan.width, sCan.height);
  const now = Date.now();
  let gN = 'None', mN = 'Idle';

  if (!res.multiHandLandmarks || !res.multiHandLandmarks.length) {
    finishStroke();
    thStartAng = null;
    twoHandActive = false;
    hud(gN, mN);
    return;
  }

  /* ── TWO HANDS → ROTATE ── */
  if (res.multiHandLandmarks.length > 1) {
    finishStroke();
    // Reset single-hand history on transition into two-hand mode
    if (!twoHandActive) { lmHist[0] = []; lmHist[1] = []; twoHandActive = true; }
    const lm0 = smooth(0, res.multiHandLandmarks[0]);
    const lm1 = smooth(1, res.multiHandLandmarks[1]);
    if (showSkel) { drawSkel(lm0); drawSkel(lm1); }
    gN = 'Two Hands';
    if (selIdx >= 0) {
      mN = 'Rotating';
      const w0 = lm2c(lm0[0]), w1 = lm2c(lm1[0]);
      const ang = Math.atan2(w1.y - w0.y, w1.x - w0.x) * 180 / Math.PI;
      if (thStartAng === null) {
        thStartAng = ang;
        thStartRot = strokes[selIdx].rot || 0;
      } else {
        strokes[selIdx].rot = thStartRot + (ang - thStartAng);
        redraw();
      }
    } else {
      mN = 'Rotate (select first)';
    }
    hud(gN, mN);
    return;
  }

  /* ── SINGLE HAND ── */
  thStartAng = null;
  // Reset two-hand history on transition to single-hand mode
  if (twoHandActive) { lmHist[0] = []; lmHist[1] = []; twoHandActive = false; }
  const lm = smooth(0, res.multiHandLandmarks[0]);
  const gesture = detectGesture(lm);
  gN = gesture.replace(/_/g, ' ');
  gN = gN[0].toUpperCase() + gN.slice(1);
  if (showSkel) drawSkel(lm);

  const tip = lm2c(lm[8]);

  switch (gesture) {

    case 'draw': {
      mN = 'Drawing';
      selIdx = -1;
      if (!drawing) { curStroke = { col: color, sz: brush, pts: [], rot: 0, sc: 1 }; drawing = true; }
      curStroke.pts.push({ x: tip.x, y: tip.y });
      redraw();
      break;
    }

    case 'open_palm': {
      finishStroke();
      mN = 'Selecting';
      const palm = lm2c(lm[9]);
      if (now - selectDebounce > 600) {
        const found = findNearest(palm.x, palm.y);
        if (found >= 0 && found !== selIdx) {
          selIdx = found;
          initCenter(strokes[found]);
          showMode('Selected Stroke #' + (found + 1));
          selectDebounce = now;
        }
        redraw();
      }
      mN = selIdx >= 0 ? 'Selected #' + (selIdx + 1) : 'No strokes';
      break;
    }

    case 'thumbs_up': {
      finishStroke();
      if (selIdx >= 0) {
        mN = 'Zoom In';
        strokes[selIdx].sc = Math.min(5, (strokes[selIdx].sc || 1) * 1.015);
        redraw();
      } else {
        mN = 'Zoom (select first)';
      }
      break;
    }

    case 'thumbs_down': {
      finishStroke();
      if (selIdx >= 0) {
        mN = 'Zoom Out';
        strokes[selIdx].sc = Math.max(.1, (strokes[selIdx].sc || 1) * 0.985);
        redraw();
      } else {
        mN = 'Zoom (select first)';
      }
      break;
    }

    case 'fist': {
      finishStroke();
      if (selIdx >= 0) showMode('Deselected');
      selIdx = -1;
      mN = 'Deselect';
      redraw();
      break;
    }

    default: {
      finishStroke();
      break;
    }
  }

  hud(gN, mN);
}

/* ═══ MEDIAPIPE INIT ═══ */
async function init() {
  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: .6,
    minTrackingConfidence: .5
  });
  hands.onResults(onResults);
  const cam = new Camera(video, {
    onFrame: async () => { await hands.send({ image: video }); },
    width: 1280,
    height: 720
  });
  await cam.start();
}

$('grantBtn').addEventListener('click', async () => {
  $('grantBtn').style.display = 'none';
  $('loadMsg').classList.add('on');
  try {
    await init();
    resize();
    splash.classList.add('off');
    app.classList.add('on');
    setTimeout(resize, 120);
  } catch (e) {
    $('loadMsg').textContent = 'Error: ' + e.message;
    $('loadMsg').style.color = '#ff4a6a';
  }
});
