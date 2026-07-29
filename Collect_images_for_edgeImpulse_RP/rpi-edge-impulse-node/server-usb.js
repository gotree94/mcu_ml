/**
 * server-usb.js — USB 웹캠 Edge Impulse 이미지 수집 (Node.js)
 *
 * - Start/Stop 버튼으로 연속 촬영
 * - 사용자 입력 라벨
 * - ZIP 다운로드
 *
 * 실행: node server-usb.js
 * 접속: http://localhost:5000
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const archiver = require('archiver');

const PORT = process.env.PORT || 5000;
const CAPTURE_DIR = path.join(__dirname, 'captured_images');

const app = express();
const server = http.createServer(app);

fs.mkdirSync(CAPTURE_DIR, { recursive: true });
app.use(express.json({ limit: '10mb' }));

const HTML_PAGE = `<!DOCTYPE html>
<html>
<head>
    <title>Image Collection</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial; text-align: center; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #00d2ff; font-size: 22px; }
        video { width: 640px; max-width: 100%; border: 3px solid #00d2ff; border-radius: 8px; background: #000; transform: scaleX(-1); }
        .row { margin: 12px 0; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; align-items: center; }
        input, select { padding: 10px 16px; border-radius: 6px; font-size: 15px; background: #16213e; color: #eee; border: 2px solid #0f3460; }
        input { width: 200px; }
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
    <video id="video" autoplay playsinline muted></video>

    <div class="row">
        <input id="label-input" type="text" placeholder="Enter label (e.g. cat, dog, person)" list="labels" autofocus>
        <datalist id="labels">
            <option value="cat"><option value="dog"><option value="person"><option value="background">
        </datalist>
        <button class="start-btn" id="start-btn" onclick="startCapture()">▶ Start</button>
        <button class="stop-btn" id="stop-btn" onclick="stopCapture()" disabled>■ Stop</button>
    </div>
    <div class="row">
        <button class="dl-btn" onclick="downloadZip()">⬇ Download All as ZIP</button>
        <button class="dl-btn" onclick="downloadLabelZip()">⬇ Download Current Label ZIP</button>
        <button onclick="clearAll()">🗑 Clear</button>
    </div>

    <div class="status" id="status">Enter a label and click Start.</div>
    <div class="status"><div class="counts" id="counts"></div></div>
    <div class="gallery" id="gallery"></div>

    <script>
        const video = document.getElementById('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let stream = null, timer = null, capturing = false;

        // 카메라 자동 시작
        (async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: 'environment' }
                });
                video.srcObject = stream;
                setStatus('Camera ready. Enter a label and click Start.');
            } catch (e) {
                setStatus('Camera error: ' + e.message);
            }
        })();

        function getFrame() {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
            ctx.drawImage(video, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.85);
        }

        function startCapture() {
            const label = document.getElementById('label-input').value.trim();
            if (!label) { setStatus('Enter a label first.'); return; }
            if (capturing) return;
            capturing = true;

            document.getElementById('start-btn').disabled = true;
            document.getElementById('stop-btn').disabled = false;
            setStatus('Capturing "' + label + '" ...');

            timer = setInterval(() => {
                const dataUrl = getFrame();
                fetch('/api/capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: dataUrl, label: label })
                })
                .then(r => r.json())
                .then(d => { setStatus(d.message); updateCounts(); updateGallery(); })
                .catch(e => setStatus('Error: ' + e.message));
            }, 300);
        }

        function stopCapture() {
            capturing = false;
            if (timer) clearInterval(timer);
            timer = null;
            document.getElementById('start-btn').disabled = false;
            document.getElementById('stop-btn').disabled = true;
            setStatus('Stopped.');
        }

        function downloadZip() {
            setStatus('Preparing ZIP...');
            fetch('/api/download')
                .then(r => {
                    const disp = r.headers.get('Content-Disposition');
                    const match = disp && disp.match(/filename="(.+)"/);
                    const name = match ? match[1] : 'images.zip';
                    return r.blob().then(blob => { saveBlob(blob, name); setStatus('Downloaded: ' + name); });
                });
        }

        function downloadLabelZip() {
            const label = document.getElementById('label-input').value.trim();
            if (!label) { setStatus('Enter a label first.'); return; }
            setStatus('Preparing ZIP for "' + label + '"...');
            fetch('/api/download/' + encodeURIComponent(label))
                .then(r => {
                    if (!r.ok) { setStatus('No images for "' + label + '"'); return; }
                    const disp = r.headers.get('Content-Disposition');
                    const match = disp && disp.match(/filename="(.+)"/);
                    const name = match ? match[1] : label + '.zip';
                    return r.blob().then(blob => { saveBlob(blob, name); setStatus('Downloaded: ' + name); });
                });
        }

        function saveBlob(blob, name) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
        }

        function clearAll() {
            if (!confirm('Delete all captured images?')) return;
            fetch('/api/clear', { method: 'POST' })
                .then(r => r.json())
                .then(d => { setStatus(d.message); updateCounts(); updateGallery(); });
        }

        function updateCounts() {
            fetch('/api/counts').then(r => r.json()).then(d => {
                document.getElementById('counts').innerHTML =
                    Object.entries(d).map(([k,v]) =>
                        '<div class="count-item">' + k + ': <span class="count-num">' + v + '</span></div>'
                    ).join('') || '<div class="count-item">No images</div>';
            });
        }

        function updateGallery() {
            fetch('/api/gallery').then(r => r.json()).then(files => {
                const g = document.getElementById('gallery');
                g.innerHTML = files.slice(-40).reverse().map(f =>
                    '<img src="/image/' + f + '" title="' + f.split('/').pop() + '">'
                ).join('');
            });
        }

        function setStatus(msg) { document.getElementById('status').textContent = msg; }

        setInterval(updateCounts, 3000);
        setInterval(updateGallery, 3000);
    </script>
</body>
</html>`;

// ===== Routes =====
app.get('/', (req, res) => res.send(HTML_PAGE));

app.post('/api/capture', (req, res) => {
    const { image, label } = req.body;
    if (!image || !label) return res.status(400).json({ error: 'Missing' });

    const buf = Buffer.from(image.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
    const dir = path.join(CAPTURE_DIR, label);
    fs.mkdirSync(dir, { recursive: true });
    const n = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length;
    const filename = `${label}_${String(n).padStart(4, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, filename), buf);
    res.json({ success: true, message: `[${label}] ${filename}` });
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
    res.json({ message: 'All images cleared.' });
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
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
            files.forEach(f => archive.file(path.join(dir, f), { name: d.name + '/' + f }));
        });
    }
    archive.finalize();
});

app.get('/api/download/:label', (req, res) => {
    const label = req.params.label;
    const dir = path.join(CAPTURE_DIR, label);
    if (!fs.existsSync(dir) || fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length === 0) {
        return res.status(404).json({ error: 'No images for ' + label });
    }
    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="' + label + '_' + Date.now() + '.zip"'
    });
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);
    fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).forEach(f => archive.file(path.join(dir, f), { name: f }));
    archive.finalize();
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('┌──────────────────────────────────────┐');
    console.log('│  Image Collection Server            │');
    console.log('├──────────────────────────────────────┤');
    console.log('│  URL:  http://localhost:' + PORT);
    console.log('│  Save: ' + CAPTURE_DIR);
    console.log('│  Mode: Start/Stop · User label · ZIP ');
    console.log('└──────────────────────────────────────┘');
});
