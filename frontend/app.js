const navBtns = document.querySelectorAll('.nav-links button');
const panels = document.querySelectorAll('.panel');
const logoLink = document.querySelector('.logo');

let activePanel = 'home';
let busy = false;

const state = {
  image: { fileInput: null, stage: null, status: null, overlay: null, img: null },
  webcam: { toggleBtn: null, stage: null, status: null, video: null, display: null, stream: null, running: false, srcCount: 0, infCount: 0, lastDets: 0, lastMs: 0 },
  video: { fileInput: null, stage: null, status: null, video: null, display: null, srcCount: 0, infCount: 0, lastDets: 0, lastMs: 0 }
};

async function init() {
  setupNav();
  setupImageMode();
  setupWebcamMode();
  setupVideoMode();
  startLoops();
}

function setupNav() {
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchPanel('home');
  });
  document.getElementById('tryDemoBtn').addEventListener('click', () => switchPanel('image'));
}

function switchPanel(panelId) {
  if (panelId === activePanel) return;
  if (activePanel === 'webcam') stopWebcam();
  else if (activePanel === 'video') stopVideo();
  activePanel = panelId;
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panel === panelId);
  });
  panels.forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + panelId);
  });
  if (panelId === 'webcam') startWebcam();
}

function setupImageMode() {
  const s = state.image;
  s.fileInput = document.getElementById('file-image');
  s.stage = document.getElementById('stage-image');
  s.status = document.getElementById('status-image');

  s.fileInput.addEventListener('change', async () => {
    const file = s.fileInput.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      s.stage.innerHTML = '';
      s.stage.appendChild(img);
      s.overlay = document.createElement('canvas');
      s.overlay.id = 'overlay';
      s.overlay.width = img.naturalWidth;
      s.overlay.height = img.naturalHeight;
      s.stage.appendChild(s.overlay);
      detectImage(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function detectImage(img) {
  const s = state.image;
  s.status.textContent = 'Running detection...';
  const t0 = performance.now();
  try {
    const blob = await new Promise(r => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(r, 'image/jpeg', 0.7);
    });
    const dets = await detectFrame(blob);
    draw(dets, s.overlay.getContext('2d'));
    s.status.textContent = dets.length + ' object(s) in ' + Math.round(performance.now() - t0) + ' ms.';
  } catch (e) {
    s.status.textContent = 'Error: ' + e.message;
  }
}

function setupWebcamMode() {
  const s = state.webcam;
  s.toggleBtn = document.getElementById('toggle-webcam');
  s.stage = document.getElementById('stage-webcam');
  s.status = document.getElementById('status-webcam');

  s.toggleBtn.addEventListener('click', async () => {
    if (s.running) {
      stopWebcam();
      return;
    }
    if (!navigator.mediaDevices) {
      s.status.textContent = 'Camera requires HTTPS or localhost. Current address is not secure.';
      return;
    }
    try {
      s.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } } });
    } catch (e) {
      s.status.textContent = 'Could not access camera: ' + e.message;
      return;
    }
    s.stage.innerHTML = '';
    s.video = document.createElement('video');
    s.video.muted = true;
    s.video.playsInline = true;
    s.video.style.display = 'none';
    s.video.srcObject = s.stream;
    s.stage.appendChild(s.video);
    await s.video.play();
    const scale = 640 / Math.max(s.video.videoWidth, s.video.videoHeight);
    s.display = document.createElement('canvas');
    s.display.id = 'display';
    s.display.width = Math.round(s.video.videoWidth * scale);
    s.display.height = Math.round(s.video.videoHeight * scale);
    s.stage.appendChild(s.display);
    if (s.video.requestVideoFrameCallback) s.video.requestVideoFrameCallback(() => countSrc(s));
    s.running = true;
    s.toggleBtn.textContent = 'Stop camera';
    s.status.textContent = 'Waiting for first inference...';
  });
}

// ponytail: start camera when the webcam tab opens; video can't auto-start (no file to pick)
function startWebcam() {
  if (!state.webcam.running) state.webcam.toggleBtn.click();
}

function countSrc(s) {
  if (!s.video || (s === state.video && (s.video.paused || s.video.ended))) return;
  s.srcCount++;
  if (s.running !== false) s.video.requestVideoFrameCallback(() => countSrc(s));
}

function stopWebcam() {
  const s = state.webcam;
  s.running = false;
  if (s.stream) s.stream.getTracks().forEach(t => t.stop());
  s.stream = null;
  s.video = null;
  s.toggleBtn.textContent = 'Start camera';
  s.status.textContent = 'Idle.';
  s.stage.innerHTML = '<p class="placeholder">Camera is off.</p>';
}

function setupVideoMode() {
  const s = state.video;
  s.fileInput = document.getElementById('file-video');
  s.stage = document.getElementById('stage-video');
  s.status = document.getElementById('status-video');

  s.fileInput.addEventListener('change', () => {
    const file = s.fileInput.files[0];
    if (!file) return;
    s.stage.innerHTML = '';
    s.video = document.createElement('video');
    s.video.muted = true;
    s.video.loop = true;
    s.video.playsInline = true;
    s.video.style.display = 'none';
    s.video.src = URL.createObjectURL(file);
    s.stage.appendChild(s.video);
    s.video.addEventListener('loadedmetadata', () => {
      const scale = 640 / Math.max(s.video.videoWidth, s.video.videoHeight);
      s.display = document.createElement('canvas');
      s.display.id = 'display';
      s.display.width = Math.round(s.video.videoWidth * scale);
      s.display.height = Math.round(s.video.videoHeight * scale);
      s.stage.appendChild(s.display);
      if (s.video.requestVideoFrameCallback) s.video.requestVideoFrameCallback(() => countSrc(s));
      s.video.play().catch(() => {});
      s.status.textContent = 'Waiting for first inference...';
    });
  });
}

function stopVideo() {
  const s = state.video;
  if (s.video) {
    s.video.pause();
    s.video.src = '';
    s.video = null;
  }
  s.display = null;
  s.stage.innerHTML = '<p class="placeholder">No video selected.</p>';
  s.status.textContent = 'Idle.';
}

function startLoops() {
  setInterval(() => loopMedia(state.webcam, s => s.running), 100);
  setInterval(() => loopMedia(state.video, s => s.video && !s.video.paused && !s.video.ended), 100);
  setInterval(() => meter(state.webcam, () => !state.webcam.running), 1000);
  setInterval(() => meter(state.video, () => state.video.video && (state.video.video.paused || state.video.video.ended)), 1000);
}

async function loopMedia(s, readyFn) {
  if (!readyFn(s) || busy || !s.video || s.video.readyState < 2) return;
  busy = true;
  try {
    const cap = document.createElement('canvas');
    const vw = s.video.videoWidth || s.display.width;
    const vh = s.video.videoHeight || s.display.height;
    cap.width = s.display.width;
    cap.height = s.display.height;
    cap.getContext('2d').drawImage(s.video, 0, 0, vw, vh, 0, 0, cap.width, cap.height);
    if (!s.video.requestVideoFrameCallback) s.srcCount++;
    const blob = await new Promise(r => cap.toBlob(r, 'image/jpeg', 0.7));
    const t0 = performance.now();
    const dets = await detectFrame(blob);
    s.infCount++;
    s.lastMs = Math.round(performance.now() - t0);
    s.lastDets = dets.length;
    const ctx = s.display.getContext('2d');
    ctx.drawImage(cap, 0, 0, s.display.width, s.display.height);
    draw(dets, ctx);
  } catch (e) {
    s.status.textContent = 'Error: ' + e.message;
  } finally {
    busy = false;
  }
}

function meter(s, pausedFn) {
  if (!s.video) { s.status.textContent = 'Idle.'; return; }
  if (pausedFn && pausedFn()) { s.status.textContent = 'Paused.'; return; }
  s.status.textContent = s.infCount + '/' + s.srcCount + ' fps | ' + s.lastMs + ' ms | ' + s.lastDets + ' object(s)';
  s.infCount = 0;
  s.srcCount = 0;
}

async function detectFrame(blob) {
  const res = await fetch('/api/detect', { method: 'POST', body: blob });
  if (!res.ok) {
    let msg = 'Detection failed';
    try { const body = await res.json(); msg = body.error || msg; } catch { msg = await res.text() || msg; }
    throw new Error(msg);
  }
  return await res.json();
}

function draw(dets, ctx) {
  const scale = Math.max(1, Math.round(Math.min(ctx.canvas.width, ctx.canvas.height) / 800));
  ctx.lineWidth = 2 * scale;
  ctx.font = `${13 * scale}px ui-monospace, "Courier New", monospace`;
  for (const d of dets) {
    const [x1, y1, x2, y2] = d.box;
    ctx.strokeStyle = '#141414';
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    const label = d.cls + ' ' + d.conf.toFixed(2);
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = '#F5F3EE';
    ctx.fillRect(x1, y1 - 20, w, 20);
    ctx.strokeRect(x1, y1 - 20, w, 20);
    ctx.fillStyle = '#141414';
    ctx.fillText(label, x1 + 6, y1 - 6);
  }
}

init();