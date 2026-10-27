/* ============================================
   Mehmet Kahya — Portfolio
   Dithered scene renderer + interactions
   ============================================ */

document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------- Dither primitives ---------- */

// 4x4 ordered (Bayer) threshold matrix
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

const hexToRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ramp = colors => colors.map(hexToRgb);

const RAMPS = {
  sky: ramp(['#050d14', '#081a26', '#0d2a3a', '#14404f', '#1f5a67', '#3d7f84']),
  planet: ramp(['#2a0f06', '#6e240c', '#b8401a', '#ff6b2c', '#ff9459', '#ffd3a8']),
  cloud: ramp(['#14323d', '#2f5c66', '#6f9795', '#b9cbc2', '#e9e6da']),
  hill: ramp(['#05080a', '#11160f', '#262918', '#47452b', '#7d7549', '#bdb174']),
  cover: ramp(['#050d14', '#0c2333', '#14404f', '#b8401a', '#ff6b2c', '#ff9459', '#efe6d8']),
};

function put(d, i, colors, t, threshold) {
  const n = colors.length - 1;
  const v = (t < 0 ? 0 : t > 1 ? 1 : t) * n;
  let k = Math.floor(v);
  if (v - k > threshold) k++;
  if (k > n) k = n;
  const c = colors[k];
  d[i] = c[0];
  d[i + 1] = c[1];
  d[i + 2] = c[2];
  d[i + 3] = 255;
}

function hash(x, y, s) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, s, octaves = 4) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x, y, s + o * 17) * amp;
    norm += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

function beginImage(canvas, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  return { ctx, img: ctx.createImageData(W, H) };
}

/* ---------- Hero scene ---------- */

function sceneLayout(W, H) {
  const tall = W < H * 1.05;
  return tall
    ? { planet: { x: W * 0.7, y: H * 0.17, r: Math.min(W, H) * 0.2 }, peak: 0.7, base: 0.93, amp: 0.13, width: 0.34 }
    : { planet: { x: W * 0.74, y: H * 0.3, r: Math.min(W, H) * 0.17 }, peak: 0.75, base: 0.9, amp: 0.21, width: 0.24 };
}

function hillY(u, L, H) {
  const g = Math.exp(-Math.pow((u - L.peak) / L.width, 2));
  return H * (L.base - L.amp * g);
}

function renderSky(canvas, W, H, L) {
  const { ctx, img } = beginImage(canvas, W, H);
  const d = img.data;
  const { x: px, y: py, r: R } = L.planet;
  const ca = Math.cos(-0.38), sa = Math.sin(-0.38);
  const lx = -0.62, ly = -0.48, lz = 0.62;

  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const b = BAYER[((y & 3) << 2) | (x & 3)];
      const dx = x - px, dy = y - py;
      const dist = Math.hypot(dx, dy);

      // Ring — tilted ellipse, back half hidden behind the planet
      const rx = dx * ca - dy * sa;
      const ry = (dx * sa + dy * ca) / 0.26;
      const rr = Math.hypot(rx, ry) / R;
      if (rr > 1.3 && rr < 2.05 && !(rr > 1.62 && rr < 1.7) && (ry > 0 || dist > R)) {
        let t = 0.5 + 0.18 * Math.sin(rr * 24) - (rx / R) * 0.08;
        if (ry < 0) t -= 0.12;
        put(d, i, RAMPS.planet, t, b);
        continue;
      }

      // Planet — lambert shading, banded surface, rim light
      if (dist < R) {
        const nx = dx / R, ny = dy / R;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const lam = Math.max(0, nx * lx + ny * ly + nz * lz);
        const band = Math.sin((ny * 0.95 + nx * 0.3) * 11 + fbm(x * 0.06, y * 0.06, 3, 3) * 3) * 0.07;
        let t = 0.04 + lam * 0.98 + band + Math.pow(1 - nz, 3) * 0.12;
        // Ring shadow across the planet face
        if (rr > 1.0 && rr < 1.25 && ry < 0) t -= 0.25;
        put(d, i, RAMPS.planet, t, b);
        continue;
      }

      // Distant ridge
      const ridgeY = H * (0.76 + 0.03 * Math.sin((x / W) * 6 + 1.3) + (fbm(x * 0.025, 3.7, 4, 3) - 0.5) * 0.09);
      if (y > ridgeY) {
        const t = 0.3 - ((y - ridgeY) / H) * 1.1 + (fbm(x * 0.06, y * 0.06, 8, 2) - 0.5) * 0.14 + (y - ridgeY < 1.2 ? 0.12 : 0);
        put(d, i, RAMPS.sky, t, b);
        continue;
      }

      // Sky gradient + halo + atmospheric banding
      let t = 0.06 + 0.66 * Math.pow(v, 1.6);
      t += 0.32 * Math.exp(-Math.pow(dist / (R * 2.6), 2));
      t += (fbm(x * 0.012, y * 0.05, 9, 3) - 0.5) * 0.14;
      put(d, i, RAMPS.sky, t, b);

      // Stars
      if (v < 0.62 && dist > R * 2.2) {
        const h = hash(x, y, 1);
        if (h > 0.9968) {
          d[i] = 239; d[i + 1] = 230; d[i + 2] = 216;
        } else if (h > 0.993) {
          d[i] = 120; d[i + 1] = 150; d[i + 2] = 152;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function renderClouds(canvas, W, H) {
  const { ctx, img } = beginImage(canvas, W, H);
  const d = img.data;
  const dens = new Float32Array(W * H);
  const y0 = Math.floor(H * 0.16);

  const density = (x, y) => {
    const v = y / H;
    let best = -1;
    // Low cumulus bank sitting on the horizon
    const base = 0.79;
    if (v > 0.5 && v < base) {
      const h = (base - v) / 0.27;
      const cluster = fbm(x * 0.007, 0.5, 21, 2);
      best = fbm(x * 0.03, y * 0.042, 5, 5) + (1 - h) * 0.38 + (cluster - 0.5) * 0.7 - 0.72;
    }
    // High thin streaks
    if (v > 0.16 && v < 0.42) {
      const band = 1 - Math.abs(v - 0.29) / 0.12;
      const s = fbm(x * 0.016, y * 0.11, 33, 4) + band * 0.32 + (fbm(x * 0.005, 9, 41, 2) - 0.5) * 0.6 - 0.84;
      if (s > best) best = s;
    }
    return best;
  };

  for (let y = y0; y < H; y++) {
    for (let x = 0; x < W; x++) dens[y * W + x] = density(x, y);
  }

  for (let y = y0 + 3; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      const c = dens[k];
      if (c <= 0) continue;
      const above = dens[k - 3 * W];
      const t = 0.18 + clamp01(c * 2.4) * 0.42 + clamp01((c - above) * 7) * 0.45 - (y / H > 0.7 ? 0.12 : 0);
      put(d, k * 4, RAMPS.cloud, t, BAYER[((y & 3) << 2) | (x & 3)]);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function renderHill(canvas, W, H, L) {
  const { ctx, img } = beginImage(canvas, W, H);
  const d = img.data;

  for (let x = 0; x < W; x++) {
    const u = x / W;
    const hy = hillY(u, L, H) + (fbm(x * 0.09, 1.5, 12, 2) - 0.5) * 2.2;
    const fy = H * (1.02 - 0.12 * Math.exp(-Math.pow((u - 0.1) / 0.2, 2)) + (fbm(x * 0.05, 7.1, 19, 2) - 0.5) * 0.015);
    // Slope towards the light (upper-left) brightens the face
    const slope = (hillY(u + 0.01, L, H) - hillY(u - 0.01, L, H)) / (0.02 * H);

    for (let y = Math.max(0, Math.floor(Math.min(hy, fy))); y < H; y++) {
      const i = (y * W + x) * 4;
      const b = BAYER[((y & 3) << 2) | (x & 3)];

      if (y >= fy) {
        // Foreground mound (left), nearly black
        const t = 0.08 + (y - fy < 1 ? 0.3 : 0.14 * Math.exp(-(y - fy) / (H * 0.03))) + (fbm(x * 0.1, y * 0.1, 15, 2) - 0.5) * 0.14;
        put(d, i, RAMPS.hill, t, b);
        continue;
      }
      if (y < hy) continue;

      const depth = y - hy;
      let t;
      if (depth < 1.2) {
        t = 0.88;
      } else {
        t = 0.14 + 0.5 * Math.exp(-depth / (H * 0.07)) + clamp01(slope * 1.4) * 0.12;
        t += (fbm(x * 0.08, y * 0.16, 4, 3) - 0.5) * 0.28;
        // Grass tufts catching light
        if (depth < H * 0.05 && hash(x, y, 7) > 0.93) t += 0.25;
      }
      put(d, i, RAMPS.hill, t, b);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------- Pixel self-portrait: coding cross-legged on the hill ---------- */

// Sprite cut from Mehmet's own pixel-art portrait (images/coder.png, 37×46)
const CODER = {
  W: 37,
  H: 46,
  skin: '#e9a47a',
  eyes: [[13, 14, 4], [21, 14, 3]], // lower eye rows [x, y, width] — covered with skin to blink
  logo: [17, 35, 4, 3] // laptop lid logo [x, y, w, h]
};

const coderSprite = new Image();
coderSprite.src = 'images/coder.png';

function drawCoder(ctx, { blink = false, glow = false } = {}) {
  ctx.clearRect(0, 0, CODER.W, CODER.H);
  ctx.drawImage(coderSprite, 0, 0);
  if (blink) {
    ctx.fillStyle = CODER.skin;
    CODER.eyes.forEach(([x, y, w]) => ctx.fillRect(x, y, w, 1));
  }
  if (glow) {
    const [x, y, w, h] = CODER.logo;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffd3a8';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
}

function initCoder(scene) {
  const canvas = scene.querySelector('.coder-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const state = { blink: false, glow: false };
  const draw = () => drawCoder(ctx, state);

  const start = () => {
    draw();
    if (reduceMotion) return;

    let visible = true;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(scene);

    setInterval(() => {
      if (!visible) return;
      state.glow = !state.glow;
      draw();
    }, 900);

    const blink = () => {
      if (visible) {
        state.blink = true;
        draw();
        setTimeout(() => { state.blink = false; draw(); }, 150);
      }
      setTimeout(blink, 2600 + Math.random() * 3400);
    };
    setTimeout(blink, 1800);
  };

  if (coderSprite.complete && coderSprite.naturalWidth) start();
  else coderSprite.addEventListener('load', start, { once: true });
}

function initScene() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;
  const sky = scene.querySelector('.scene-sky');
  const clouds = scene.querySelector('.scene-clouds');
  const hill = scene.querySelector('.scene-hill');
  const PIXEL = 3;
  let last = { w: 0, h: 0 };

  const render = () => {
    const rect = scene.getBoundingClientRect();
    if (Math.abs(rect.width - last.w) < 2 && Math.abs(rect.height - last.h) < 80) return;
    last = { w: rect.width, h: rect.height };

    const W = Math.ceil(rect.width / PIXEL);
    const H = Math.ceil(rect.height / PIXEL);
    const L = sceneLayout(W, H);

    renderSky(sky, W, H, L);
    renderClouds(clouds, Math.ceil(W * 1.2), H);
    renderHill(hill, W, H, L);

    scene.style.setProperty('--coder-x', `${L.peak * 100}%`);
    scene.style.setProperty('--coder-b', `${(1 - hillY(L.peak, L, H) / H) * 100 - 1.4}%`);
    scene.classList.add('is-ready');
  };

  requestAnimationFrame(() => requestAnimationFrame(render));
  initCoder(scene);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 220);
  });

  // Pointer parallax
  if (finePointer && !reduceMotion) {
    const frame = document.querySelector('.hero-frame');
    let raf = 0;
    frame.addEventListener('pointermove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = frame.getBoundingClientRect();
        scene.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        scene.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        raf = 0;
      });
    });
    frame.addEventListener('pointerleave', () => {
      scene.style.setProperty('--px', 0);
      scene.style.setProperty('--py', 0);
    });
  }
}

/* ---------- Project covers ---------- */

const COVERS = {
  // Ringed sphere rising out of the frame
  orb(u, v, a, x, y, seed) {
    const cx = 0.66 * a, cy = 0.78, R = 0.5;
    const dx = u * a - cx, dy = v - cy;
    const dist = Math.hypot(dx, dy);
    const rx = dx * 0.93 + dy * 0.36, ry = (-dx * 0.36 + dy * 0.93) / 0.24;
    const rr = Math.hypot(rx, ry) / R;
    if (rr > 1.25 && rr < 1.85 && (ry > 0 || dist > R)) return 0.62 + 0.14 * Math.sin(rr * 30);
    if (dist < R) {
      const nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lam = Math.max(0, -0.6 * nx - 0.5 * ny + 0.62 * nz);
      return 0.36 + lam * 0.64 + Math.sin(ny * 12 + fbm(x * 0.1, y * 0.1, seed, 2) * 3) * 0.04;
    }
    return 0.06 + v * 0.2 + 0.18 * Math.exp(-Math.pow(dist / (R * 1.9), 2)) + (hash(x, y, seed) > 0.994 ? 0.8 : 0);
  },
  // Catalogue of tiles with random intensities
  tiles(u, v, a, x, y, seed) {
    const s = 7;
    const cx = Math.floor(x / s), cy = Math.floor(y / s);
    if (x % s === 0 || y % s === 0) return 0.04;
    const h = hash(cx, cy, seed);
    if (h > 0.92) return 0.78;
    const wave = 0.5 + 0.5 * Math.sin(cx * 0.5 + cy * 0.35);
    return 0.08 + h * h * 0.36 + wave * 0.12 * (1 - v);
  },
  // Speed streaks converging to a vanishing point
  streaks(u, v, a, x, y, seed) {
    const hz = 0.52;
    const dy = v - hz;
    const k = Math.abs(dy) < 0.004 ? 0 : 1 / Math.abs(dy);
    const lane = (u - 0.5) * k;
    const t = fbm(lane * 0.8, Math.abs(dy) * 6, seed, 3);
    const streak = t > 0.62 ? (t - 0.62) * 3 : 0;
    const glow = Math.exp(-Math.pow((u - 0.5) * 3.2, 2) - Math.pow(dy * 6, 2));
    return 0.05 + Math.abs(dy) * 0.25 + streak * 0.8 + glow * 0.75;
  },
  // Wire terrain under a striped sun
  terrain(u, v, a, x, y, seed) {
    const hz = 0.5;
    if (v < hz) {
      const dx = (u - 0.5) * a, dy = v - hz + 0.04;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.3) {
        const stripe = v > hz - 0.16 && Math.sin(v * 140) > 0.4;
        return stripe ? 0.1 : 0.55 + (1 - (v / hz)) * 0.45;
      }
      const ridge = hz - 0.08 * fbm(u * 6, 0.5, seed, 3) - 0.04;
      if (v > ridge) return 0.18;
      return 0.05 + v * 0.18 + (hash(x, y, seed) > 0.995 ? 0.8 : 0);
    }
    const z = 1 / (v - hz + 0.02);
    const gx = (u - 0.5) * z * 1.2;
    const gz = z * 0.9;
    const line = Math.abs(gx - Math.round(gx)) < 0.06 * z * 0.3 || Math.abs(gz - Math.round(gz)) < 0.05 * z * 0.25;
    return line ? 0.66 - (z / 60) : 0.06 + (v - hz) * 0.2;
  },
  // Prompt queue: finished, running and pending rows
  queue(u, v, a, x, y, seed) {
    const rows = 5, top = 0.14, h = 0.11, gap = 0.055, left = 0.1;
    for (let i = 0; i < rows; i++) {
      const y0 = top + i * (h + gap);
      if (v < y0 || v > y0 + h) continue;
      const len = 0.42 + 0.4 * hash(i, 0, seed);
      if (u < left - 0.06 && u > left - 0.1) return i < 2 ? 0.55 : i === 2 ? 0.8 : 0.16;
      if (u < left || u > left + len) break;
      if (i < 2) return 0.34;
      if (i === 2) return u < left + len * 0.62 ? 0.82 : 0.46;
      return 0.17;
    }
    const grid = x % 6 === 0 && y % 6 === 0 ? 0.14 : 0;
    return 0.05 + v * 0.1 + grid;
  },
  // Sun over a perspective sea with a glittering reflection
  waves(u, v, a, x, y, seed) {
    const hz = 0.46, sx = 0.68;
    if (v < hz) {
      const dist = Math.hypot((u - sx) * a, v - 0.3);
      if (dist < 0.1) return 0.92;
      return 0.07 + (v / hz) * 0.26 + 0.42 * Math.exp(-Math.pow(dist / 0.24, 2)) + (hash(x, y, seed) > 0.996 ? 0.7 : 0);
    }
    const d = v - hz;
    const z = 1 / (d + 0.03);
    const w = Math.sin(u * z * 7 + fbm(u * z * 0.6, z * 0.4, seed, 2) * 6);
    const refl = Math.exp(-Math.pow(((u - sx) * a) / (0.05 + d * 0.5), 2));
    let t = 0.1 + d * 0.32 + (w > 0.55 ? 0.14 : 0);
    if (w > 0.15) t += refl * 0.62;
    return t;
  },
  // Video frame with a Picture-in-Picture window carrying subtitles
  pip(u, v, a, x, y, seed) {
    const inBox = (x0, y0, x1, y1) => u > x0 && u < x1 && v > y0 && v < y1;
    if (inBox(0.5, 0.42, 0.92, 0.9)) {
      if (!inBox(0.515, 0.445, 0.905, 0.875)) return 0.8;
      if (inBox(0.6, 0.76, 0.82, 0.81)) return 1;
      return 0.2 + (1 - v) * 0.35 + (fbm(x * 0.05, y * 0.05, seed, 3) - 0.5) * 0.3;
    }
    if (inBox(0.08, 0.12, 0.62, 0.72)) {
      if (inBox(0.08, 0.68, 0.62, 0.72)) return u < 0.3 ? 0.78 : 0.2;
      const dist = Math.hypot((u - 0.35) * a, v - 0.4);
      if (dist < 0.08 && (u - 0.32) * a > -0.02 && Math.abs(v - 0.4) < (0.06 - (u - 0.32) * a * 0.6)) return 0.85;
      return 0.12 + (1 - v) * 0.2;
    }
    return 0.04 + v * 0.06;
  },
  // Audio waveform: mirrored bars with a glowing playhead
  bars(u, v, a, x, y, seed) {
    const col = Math.floor(x / 3);
    if (x % 3 === 2) return 0.05;
    const env = 0.15 + 0.75 * Math.abs(Math.sin(col * 0.21 + seed) * Math.sin(col * 0.047 + 1.3));
    const h = env * (0.55 + 0.45 * hash(col, 0, seed));
    const d = Math.abs(v - 0.5) * 2;
    if (d > h) return 0.05 + (1 - d) * 0.08;
    const played = u < 0.58;
    return played ? 0.62 + (1 - d / h) * 0.3 : 0.2 + (1 - d / h) * 0.12;
  },
  // Crawled site map: nodes linked to a hub
  nodes(u, v, a, x, y, seed) {
    const hub = [0.5 * a, 0.5];
    let t = 0.05 + v * 0.06;
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2 + seed;
      const r = 0.24 + 0.12 * hash(i, 1, seed);
      const nx = hub[0] + Math.cos(ang) * r * a * 0.75, ny = hub[1] + Math.sin(ang) * r;
      // Segment from hub to node
      const px = u * a - hub[0], py = v - hub[1], qx = nx - hub[0], qy = ny - hub[1];
      const k = Math.max(0, Math.min(1, (px * qx + py * qy) / (qx * qx + qy * qy)));
      const dl = Math.hypot(px - qx * k, py - qy * k);
      if (dl < 0.006) t = Math.max(t, 0.32);
      const dn = Math.hypot(u * a - nx, v - ny);
      if (dn < 0.05) t = Math.max(t, 0.55 + (0.05 - dn) * 6);
    }
    const dh = Math.hypot(u * a - hub[0], v - hub[1]);
    if (dh < 0.09) t = 0.95 - dh * 3;
    return t;
  },
  // Detection target: concentric rings + bounding box
  rings(u, v, a, x, y, seed) {
    const dx = (u - 0.5) * a, dy = v - 0.5;
    const dist = Math.hypot(dx, dy);
    let t = 0.06 + 0.24 * Math.max(0, Math.cos(dist * 46)) * Math.exp(-dist * 2.2);
    const bx = Math.abs(dx) - 0.2, by = Math.abs(dy) - 0.2;
    const onBox = (Math.abs(bx) < 0.012 && by < 0) || (Math.abs(by) < 0.02 && bx < 0);
    const corner = Math.abs(dx) > 0.12 && Math.abs(dy) > 0.12;
    if (onBox && corner) t = 0.88;
    if (Math.abs(dx) < 0.004 || Math.abs(dy) < 0.006) t = Math.max(t, 0.3);
    if (dist < 0.06) t = 0.7 - dist * 4;
    return t;
  }
};

function renderCover(wrap) {
  const canvas = wrap.querySelector('canvas');
  const rect = wrap.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const W = Math.max(40, Math.round(rect.width / 3));
  const H = Math.max(30, Math.round(rect.height / 3));
  if (canvas.width === W && canvas.height === H) return;
  const fn = COVERS[wrap.dataset.kind] || COVERS.orb;
  const seed = Number(wrap.dataset.seed) || 1;
  const { ctx, img } = beginImage(canvas, W, H);
  const d = img.data;
  const a = W / H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      put(d, (y * W + x) * 4, RAMPS.cover, fn(x / W, y / H, a, x, y, seed), BAYER[((y & 3) << 2) | (x & 3)]);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function initCovers() {
  const covers = document.querySelectorAll('.cover');
  if (!covers.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) renderCover(entry.target);
    });
  }, { rootMargin: '200px' });
  covers.forEach(c => io.observe(c));
  // Covers are cheap; paint any the observer hasn't reached yet once the page settles
  window.addEventListener('load', () => setTimeout(() => covers.forEach(renderCover), 600), { once: true });

  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => covers.forEach(renderCover), 260);
  });
}

/* ---------- Navigation ---------- */

function initNav() {
  const nav = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('menu');

  const setMenu = open => {
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menu.inert = true;

  hamburger.addEventListener('click', () => setMenu(hamburger.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false);
      hamburger.focus();
    }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', e => e.matches && setMenu(false));

  // Transparent over the hero; glass bar once the page has scrolled a little
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => {
    nav.classList.toggle('is-scrolled', !entry.isIntersecting);
  }).observe(sentinel);

  // Active section highlight
  const links = new Map([...document.querySelectorAll('.nav-link')].map(l => [l.getAttribute('href').slice(1), l]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(l => l.classList.remove('is-active'));
      links.get(entry.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('section[id]').forEach(s => spy.observe(s));
}

/* ---------- Scroll reveal ---------- */

function initReveal() {
  const items = document.querySelectorAll('.reveal');

  // Stagger siblings that share a parent
  items.forEach(el => {
    const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const idx = siblings.indexOf(el);
    el.style.setProperty('--delay', `${Math.min(idx * 0.08, 0.48)}s`);
  });

  const settle = el => {
    // Drop reveal classes once settled so hover transitions run without the stagger delay
    const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
    setTimeout(() => {
      el.classList.remove('reveal', 'is-in');
      el.style.removeProperty('--delay');
    }, 1300 + delay * 1000);
  };

  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.remove('reveal'));
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
      settle(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  items.forEach(el => io.observe(el));
}

/* ---------- Count-up stats ---------- */

function initCounters() {
  const counters = document.querySelectorAll('.count');
  if (reduceMotion) return;
  const ease = t => 1 - Math.pow(1 - t, 4);

  const run = el => {
    const to = Number(el.dataset.to);
    const start = performance.now();
    const dur = 1800;
    const tick = now => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * ease(p)).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      setTimeout(() => run(entry.target), 400);
      io.unobserve(entry.target);
    });
  });
  counters.forEach(el => {
    el.textContent = '0';
    io.observe(el);
  });
}

/* ---------- Micro-interactions ---------- */

function initPointerFx() {
  if (!finePointer || reduceMotion) return;

  // Magnetic buttons
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.18;
      const y = (e.clientY - r.top - r.height / 2) * 0.28;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = '';
    });
  });

  // Card spotlight
  document.querySelectorAll('.card').forEach(card => {
    const core = card.querySelector('.card-core');
    card.addEventListener('pointermove', e => {
      const r = core.getBoundingClientRect();
      core.style.setProperty('--mx', `${e.clientX - r.left}px`);
      core.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

function initCardLinks() {
  // Secondary links nested inside a card anchor (can't nest <a> in <a>)
  document.querySelectorAll('.card-link[data-href]').forEach(el => {
    el.setAttribute('role', 'link');
    el.setAttribute('tabindex', '0');
    const go = e => {
      e.preventDefault();
      e.stopPropagation();
      window.open(el.dataset.href, '_blank', 'noopener');
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') go(e);
    });
  });
}

/* Favicon: my pixel bust blinks and the star glints now and then (frames from _favicon.py) */
function initFavicon() {
  if (reduceMotion) return;
  const link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  if (!link) return;
  const strip = new Image();
  strip.src = '/images/favicon-frames.png';
  strip.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const urls = [0, 1, 2].map(k => {
      ctx.clearRect(0, 0, 32, 32);
      ctx.drawImage(strip, k * 32, 0, 32, 32, 0, 0, 32, 32);
      return c.toDataURL('image/png');
    });
    // 0 rest, 1 blink, 2 star glint: rest, blink, rest, glint, rest, double blink
    const seq = [...Array(14).fill(0), 1, ...Array(10).fill(0), 2, 2, 2, ...Array(14).fill(0), 1, 0, 1];
    link.type = 'image/png';
    let i = 0;
    setInterval(() => {
      link.href = urls[seq[i]];
      i = (i + 1) % seq.length;
    }, 180);
  };
}

function initClocks() {
  const clocks = document.querySelectorAll('.clock');
  if (!clocks.length) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
  const tick = () => clocks.forEach(c => { c.textContent = fmt.format(new Date()); });
  tick();
  setInterval(tick, 20000);
}

/* ---------- Blog: table of contents, code blocks, filter ---------- */

function initToc() {
  const toc = document.querySelector('.post-toc');
  if (!toc) return;
  const links = new Map([...toc.querySelectorAll('a')].map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.classList.remove('is-active'));
      links.get(entry.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  document.querySelectorAll('.prose h2[id]').forEach(h => spy.observe(h));
}

const KEYWORDS = new Set((
  'const let var function return if else for while of in new class extends async await try catch finally throw ' +
  'import from export default def self None True False and or not with as lambda yield elif pass raise ' +
  'interface type readonly private public static this null undefined true false typeof'
).split(' '));

// Tiny highlighter: comments, strings and keywords only
function highlight(code, lang) {
  const hashComments = lang === 'py' || lang === 'sh' || lang === 'toml';
  const re = hashComments
    ? /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b([A-Za-z_]+)\b/g
    : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b([A-Za-z_]+)\b/g;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let out = '', last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += `<span class="tok-c">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="tok-s">${esc(m[2])}</span>`;
    else if (KEYWORDS.has(m[3]) && lang !== 'json' && lang !== 'text') out += `<span class="tok-k">${m[3]}</span>`;
    else out += esc(m[0]);
    last = re.lastIndex;
  }
  return out + esc(code.slice(last));
}

function initCodeBlocks() {
  document.querySelectorAll('.prose pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;
    const lang = pre.dataset.lang;
    if (lang && lang !== 'text') code.innerHTML = highlight(code.textContent, lang);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = 'Copied';
      } catch (err) {
        btn.textContent = 'Select & copy';
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    });
    pre.appendChild(btn);
  });
}

function initBlogFilter() {
  const bar = document.querySelector('.blog-filter');
  if (!bar) return;
  const cards = document.querySelectorAll('.post-grid .post-card');
  bar.addEventListener('click', e => {
    const btn = e.target.closest('button[data-tag]');
    if (!btn) return;
    const tag = btn.dataset.tag;
    bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    cards.forEach(card => {
      card.hidden = tag !== 'all' && !card.dataset.tags.split(',').includes(tag);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initScene();
  initCovers();
  initCounters();
  initPointerFx();
  initCardLinks();
  initClocks();
  initFavicon();
  initToc();
  initCodeBlocks();
  initBlogFilter();
});
