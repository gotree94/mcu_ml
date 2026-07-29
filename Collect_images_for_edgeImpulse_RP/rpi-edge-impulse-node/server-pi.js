/**
 * server-pi.js — Raspberry Pi Camera 이미지 수집 서버 (Node.js)
 *
 * - Start/Stop 연속 촬영 (server-side via libcamera-still / raspistill)
 * - 사용자 입력 라벨
 * - ZIP 다운로드
 *
 * 실행: node server-pi.js
 * 접속: http://raspberry-pi-ip:5000
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec, spawn } = require('child_process');
const archiver = require('archiver');

const PORT = process.env.PORT || 5000;
const CAPTURE_DIR = path.join(__dirname, 'captured_images');
const TEMP_DIR = path.join(__dirname, 'temp');

const app = express();
const server = http.createServer(app);

fs.mkdirSync(CAPTURE_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));

// ===== Pi Camera 감지 =====
function hasPiCamera() {
    try {
        return fs.existsSync('/usr/bin/libcamera-still') ||
               fs.existsSync('/usr/bin/raspistill') ||
               fs.existsSync('/opt/vc/bin/raspistill');
    } catch (e) { return false; }
}

function getStillCmd(outputPath) {
    if (fs.existsSync('/usr/bin/libcamera-still')) {
        return `libcamera-still -o ${outputPath} --width 640 --height 480 --quality 85 --timeout 500 --nopreview --immediate`;
    }
    return `raspistill -o ${outputPath} --width 640 --height 480 --quality 85 --timeout 500 --nopreview`;
}

// ===== 최신 프레임 (MJPEG 스트림 대신 polling) =====
let latestFrame = null;
let captureTimer = null;
let isCapturing = false;
let currentLabel = '';
let frameInterval = 300; // ms

function captureStill(callback) {
    const tmpFile = path.join(TEMP_DIR, 'frame_' + Date.now() + '.jpg');
    exec(getStillCmd(tmpFile), { timeout: 3000 }, (err) => {
        if (err) {
            console.error('Capture error:', err.message);
            return callback(err);
        }
        if (!fs.existsSync(tmpFile)) return callback(new Error('No output'));
        const buf = fs.readFileSync(tmpFile);
        latestFrame = buf;
        fs.unlink(tmpFile, () => {});
        callback(null, buf);
    });
}

function startContinuousCapture(label) {
    if (isCapturing) return;
    isCapturing = true;
    currentLabel = label;
    console.log('Start continuous capture:', label);

    const dir = path.join(CAPTURE_DIR, label);
    fs.mkdirSync(dir, { recursive: true });

    captureTimer = setInterval(() => {
        captureStill((err, buf) => {
            if (err) return;
            const n = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length;
            const filename = `${label}_${String(n).padStart(4, '0')}.jpg`;
            fs.writeFileSync(path.join(dir, filename), buf);
        });
    }, frameInterval);
}

function stopContinuousCapture() {
    if (!isCapturing) return;
    isCapturing = false;
    if (captureTimer) clearInterval(captureTimer);
    captureTimer = null;
    console.log('Stopped capture.');
}

// ===== HTML UI =====
const HTML_PAGE = `<!DOCTYPE html>
<html>
<head>
    <title>Image Collection (Pi Camera)</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial; text-align: center; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #00d2ff; font-size: 22px; }
        .subtitle { color: #888; font-size: 13px; margin-bottom: 8px; }
        #frame-img { width: 640px; max-width: 100%; border: 3px solid #00d2ff; border-radius: 8px; background: #000; min-height: 200px; }
        .row { margin: 12px 0; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; align-items: center; }
        input { padding: 10px 16px; border-radius: 6px; font-size: 15px; background: #16213e; color: #eee; border: 2px solid #0f3460; width: 200px; }
        button { padding: 12px 28px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold; }
        .start-btn { background: #00d2ff; color: #000; }
        .stop-btn { background: #e94560; color: #fff; }
        .dl-btn { background: #0f3460; color: #eee; }
        .status { margin: 8px; padding: 10px; background: #16213e; border-radius: 6px; font-size: 14px; }
        .counts { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .count-item { background: #0f3460; padding: 6px 14px; border-radius: 16px; font-size: 13px; }
        .count-num { color: #00d2ff; font-weight: bold; font-size: 16px; }
        .gallery { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 10px; max-height: 160px; overflow-y: auto; padding: 6px; background: #0d1117; border-radius: 6px; }
        .gallery img { width: 64px; height: 48px; object-fit: cover; border-radius: 3px; border: 1px solid #0f3460; }
    </style>
</head>
<body>
    <h1>Image Collection</h1>
    <div class="subtitle">Raspberry Pi Camera</div>

    <img id="frame-img" src="/api/latest_frame">
    <div class="row">
        <input id="label-input" type="text" placeholder="Enter label (e.g. cat, dog)" list="labels" autofocus>
        <datalist id="labels">
            <option value="cat"><option value="dog"><option value="person"><option value="background">
        </datalist>
        <button class="start-btn" id="start-btn" onclick="startCapture()">▶ Start</button>
        <button class="stop-btn" id="stop-btn" onclick="stopCapture()" disabled>■ Stop</button>
    </div>
    <div class="row">
        <button class="dl-btn" onclick="downloadZip()">⬇ Download All ZIP</button>
        <button class="dl-btn" onclick="downloadLabelZip()">⬇ Download Label ZIP</button>
        <button onclick="clearAll()">🗑 Clear</button>
    </div>

    <div class="status" id="status">Enter a label and click Start.</div>
    <div class="status"><div class="counts" id="counts"></div></div>
    <div class="gallery" id="gallery"></div>

    <script>
        let capturing = false;

        function startCapture() {
            const label = document.getElementById('label-input').value.trim();
            if (!label) { setStatus('Enter a label first.'); return; }
            if (capturing) return;
            capturing = true;

            fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label })
            }).then(r => r.json()).then(d => {
                document.getElementById('start-btn').disabled = true;
                document.getElementById('stop-btn').disabled = false;
                setStatus(d.message);
            });
        }

        function stopCapture() {
            if (!capturing) return;
            capturing = false;
            fetch('/api/stop', { method: 'POST' })
                .then(r => r.json())
                .then(d => {
                    document.getElementById('start-btn').disabled = false;
                    document.getElementById('stop-btn').disabled = true;
                    setStatus(d.message);
                    updateCounts();
                    updateGallery();
                });
        }

        function downloadZip() {
            setStatus('Preparing ZIP...');
            fetch('/api/download')
                .then(r => r.blob())
                .then(blob => {
                    saveBlob(blob, 'images_' + Date.now() + '.zip');
                    setStatus('Downloaded.');
                });
        }

        function downloadLabelZip() {
            const label = document.getElementById('label-input').value.trim();
            if (!label) { setStatus('Enter a label first.'); return; }
            setStatus('Preparing ZIP...');
            fetch('/api/download/' + encodeURIComponent(label))
                .then(r => {
                    if (!r.ok) { setStatus('No images for "' + label + '"'); return; }
                    return r.blob().then(blob => { saveBlob(blob, label + '_' + Date.now() + '.zip'); setStatus('Downloaded.'); });
                });
        }

        function saveBlob(blob, name) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
        }

        function clearAll() {
            if (!confirm('Delete all?')) return;
            fetch('/api/clear', { method: 'POST' }).then(r => r.json()).then(d => { setStatus(d.message); updateCounts(); updateGallery(); });
        }

        function updateCounts() {
            fetch('/api/counts').then(r => r.json()).then(d => {
                document.getElementById('counts').innerHTML =
                    Object.entries(d).map(([k,v]) => '<div class="count-item">' + k + ': <span class="count-num">' + v + '</span></div>').join('');
            });
        }

        function updateGallery() {
            fetch('/api/gallery').then(r => r.json()).then(files => {
                document.getElementById('gallery').innerHTML =
                    files.slice(-40).reverse().map(f => '<img src="/image/' + f + '" title="' + f.split('/').pop() + '">').join('');
            });
        }

        function setStatus(msg) { document.getElementById('status').textContent = msg; }

        // 라이브 프레임 갱신 (0.5초)
        setInterval(() => {
            document.getElementById('frame-img').src = '/api/latest_frame?t=' + Date.now();
        }, 500);

        setInterval(updateCounts, 3000);
        setInterval(updateGallery, 3000);
    </script>
</body>
</html>`;

// ===== API Routes =====
app.get('/', (req, res) => res.send(HTML_PAGE));

// 최신 프레임
app.get('/api/latest_frame', (req, res) => {
    if (latestFrame) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' });
        res.end(latestFrame);
    } else {
        // 첫 프레임 캡처
        captureStill((err, buf) => {
            if (err) { res.status(503).end(); return; }
            res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' });
            res.end(buf);
        });
    }
});

// Start 연속 촬영
app.post('/api/start', (req, res) => {
    const label = req.body.label;
    if (!label) return res.status(400).json({ error: 'Missing label' });
    startContinuousCapture(label);
    res.json({ message: 'Capturing "' + label + '"...' });
});

// Stop 연속 촬영
app.post('/api/stop', (req, res) => {
    stopContinuousCapture();
    res.json({ message: 'Stopped.' });
});

app.get('/api/counts', (req, res) => {
    const counts = {};
    if (fs.existsSync(CAPTURE_DIR)) {
        fs.readdirSync(CAPTURE_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => {
            const files = fs.readdirSync(path.join(CAPTURE_DIR, d.name)).filter(f => f.endsWith('.jpg'));
            if (files.length > 0) counts[d.name] = files.length;
        });
    }
    res.json(counts);
});

app.get('/api/gallery', (req, res) => {
    const all = [];
    if (fs.existsSync(CAPTURE_DIR)) {
        fs.readdirSync(CAPTURE_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => {
            fs.readdirSync(path.join(CAPTURE_DIR, d.name)).filter(f => f.endsWith('.jpg')).forEach(f => all.push(d.name + '/' + f));
        });
    }
    res.json(all.sort());
});

app.get('/image/:cat/:file', (req, res) => {
    const p = path.join(CAPTURE_DIR, req.params.cat, req.params.file);
    if (fs.existsSync(p)) res.sendFile(p); else res.status(404).end();
});

app.post('/api/clear', (req, res) => {
    if (fs.existsSync(CAPTURE_DIR)) {
        fs.readdirSync(CAPTURE_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => {
            const dir = path.join(CAPTURE_DIR, d.name);
            fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
        });
    }
    res.json({ message: 'Cleared.' });
});

app.get('/api/download', (req, res) => {
    const zipName = 'images_' + Date.now() + '.zip';
    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="' + zipName + '"'
    });
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);
    if (fs.existsSync(CAPTURE_DIR)) {
        fs.readdirSync(CAPTURE_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => {
            const dir = path.join(CAPTURE_DIR, d.name);
            fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).forEach(f => archive.file(path.join(dir, f), { name: d.name + '/' + f }));
        });
    }
    archive.finalize();
});

app.get('/api/download/:label', (req, res) => {
    const label = req.params.label;
    const dir = path.join(CAPTURE_DIR, label);
    if (!fs.existsSync(dir) || fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length === 0) {
        return res.status(404).json({ error: 'No images' });
    }
    const zipName = label + '_' + Date.now() + '.zip';
    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="' + zipName + '"'
    });
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);
    fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).forEach(f => archive.file(path.join(dir, f), { name: f }));
    archive.finalize();
});

// ===== 실행 =====
server.listen(PORT, '0.0.0.0', () => {
    const hasCam = hasPiCamera();
    console.log('┌──────────────────────────────────────────┐');
    console.log('│  Image Collection (Pi Camera)           │');
    console.log('├──────────────────────────────────────────┤');
    console.log('│  URL:  http://0.0.0.0:' + PORT);
    console.log('│  Cam:  ' + (hasCam ? 'Pi Camera ✅' : '⚠ No Pi Camera detected'));
    console.log('│  Mode: Start/Stop · User label · ZIP     │');
    console.log('│  Save: ' + CAPTURE_DIR);
    console.log('└──────────────────────────────────────────┘');

    // 시작 시 첫 프레임 캡처
    captureStill(() => {});
});
