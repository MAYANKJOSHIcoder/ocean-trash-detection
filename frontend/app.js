const tabs = document.querySelectorAll('.tabs button');
const panels = document.querySelectorAll('.tab-panel');

let activeTab = 'image';
let busy = false;

const state = {
  image: { fileInput: null, stage: null, status: null, overlay: null, img: null },
  webcam: { toggleBtn: null, stage: null, status: null, video: null, display: null, stream: null, running: false, srcCount: 0, infCount: 0, lastDets: 0, lastMs: 0 },
  video: { fileInput: null, stage: null, status: null, video: null, display: null, srcCount: 0, infCount: 0, lastDets: 0, lastMs: 0 }
};

async function init() {
  setupTabs();
  setupImageMode();
  setupWebcamMode();
  setupVideoMode();
  startLoops();
}

function setupTabs() {
  tabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  if (tab === activeTab) return;
  stopMode(activeTab);
  activeTab = tab;
  tabs.forEach(btn => {
    btn.setAttribute('aria-selected', btn.dataset.tab === tab);
  });
  panels.forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });
  startMode(tab);
}

function startMode(tab) {
  if (tab === 'webcam') startWebcam();
  else if (tab === 'video') startVideo();
}

function stopMode(tab) {
  if (tab === 'webcam') stopWebcam();
  else if (tab === 'video') stopVideo();
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
    if (s.video.requestVideoFrameCallback) s.video.requestVideoFrameCallback(countSrcWebcam);
    s.running = true;
    s.toggleBtn.textContent = 'Stop camera';
    s.status.textContent = 'Waiting for first inference...';
  });
}

function countSrcWebcam() {
  const s = state.webcam;
  if (!s.video) return;
  s.srcCount++;
  if (s.running) s.video.requestVideoFrameCallback(countSrcWebcam);
}

function stopWebcam() {
  const s = state.webcam;
  s.running = false;
  if (s.stream) s.stream.getTracks().forEach(t => t.stop());
  s.stream = null;
  s.toggleBtn.textContent = 'Start camera';
  s.status.textContent = 'Idle.';
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
      if (s.video.requestVideoFrameCallback) s.video.requestVideoFrameCallback(countSrcVideo);
      s.video.play().catch(() => {});
      s.status.textContent = 'Waiting for first inference...';
    });
  });
}

function countSrcVideo() {
  const s = state.video;
  if (!s.video || s.video.paused || s.video.ended) return;
  s.srcCount++;
  s.video.requestVideoFrameCallback(countSrcVideo);
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
  setInterval(loopWebcam, 100);
  setInterval(loopVideo, 100);
  setInterval(meterWebcam, 1000);
  setInterval(meterVideo, 1000);
}

async function loopWebcam() {
  const s = state.webcam;
  if (!s.running || busy || !s.video || s.video.readyState < 2) return;
  busy = true;
  try {
    const cap = document.createElement('canvas');
    cap.width = s.display.width;
    cap.height = s.display.height;
    cap.getContext('2d').drawImage(s.video, 0, 0, cap.width, cap.height);
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

async function loopVideo() {
  const s = state.video;
  if (!s.video || busy || s.video.readyState < 2 || s.video.paused || s.video.ended) return;
  busy = true;
  try {
    const cap = document.createElement('canvas');
    cap.width = s.display.width;
    cap.height = s.display.height;
    cap.getContext('2d').drawImage(s.video, 0, 0, cap.width, cap.height);
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

function meterWebcam() {
  const s = state.webcam;
  if (!s.running) return;
  s.status.textContent = s.infCount + '/' + s.srcCount + ' fps | ' + s.lastMs + ' ms | ' + s.lastDets + ' object(s)';
  s.infCount = 0;
  s.srcCount = 0;
}

function meterVideo() {
  const s = state.video;
  if (!s.video) return;
  if (s.video.paused || s.video.ended) {
    s.status.textContent = 'Paused.';
    return;
  }
  s.status.textContent = s.infCount + '/' + s.srcCount + ' fps | ' + s.lastMs + ' ms | ' + s.lastDets + ' object(s)';
  s.infCount = 0;
  s.srcCount = 0;
}

async function detectFrame(blob) {
  const res = await fetch('/api/detect', { method: 'POST', body: blob });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

function draw(dets, ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineWidth = 2;
  ctx.font = '13px ui-monospace, "Courier New", monospace';
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