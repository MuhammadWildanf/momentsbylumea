
        // --- KEYBOARD SYSTEM ---
        let activeInput = null;
        let caps = true;
        let num = false;
        const row1 = "QWERTYUIOP".split(''), row2 = "ASDFGHJKL".split(''), row3 = "ZXCVBNM".split('');
        const nums = "1234567890-/@:();\"+!?. ,*#&".split('');
        let deliveryMethod = 'whatsapp'; // Default, but we collect both now

        function drawKbd() {
            const draw = (id, keys) => {
                const el = document.getElementById(id); el.innerHTML = '';
                if (id === 'kbd-3') el.innerHTML += `<div class="key wide" onclick="kCaps()">⬆️</div>`;
                keys.forEach(k => { el.innerHTML += `<div class="key" onclick="kPress('${k}')">${caps ? k : k.toLowerCase()}</div>`; });
                if (id === 'kbd-3') el.innerHTML += `<div class="key wide" onclick="kBks()">⌫</div>`;
            };

            let r1 = num ? nums.slice(0, 10) : row1;
            let r2 = num ? nums.slice(10, 19) : row2;
            let r3 = num ? nums.slice(19, 26) : row3;



            draw('kbd-1', r1);
            draw('kbd-2', r2);
            draw('kbd-3', r3);
        }
        drawKbd();

        document.getElementById('name').addEventListener('click', () => {
            activeInput = document.getElementById('name');
            num = false;
            drawKbd();
            document.getElementById('kbd-container').classList.add('show');
            document.querySelector('.center-panel').classList.add('keyboard-active');
        });

        function kPress(k) { if (activeInput) activeInput.value += k; }
        function kBks() { if (activeInput) activeInput.value = activeInput.value.slice(0, -1); }
        function kCaps() { caps = !caps; drawKbd(); }
        function kMode() { num = !num; drawKbd(); }
        function kNext() {
            activeInput = null;
            document.getElementById('kbd-container').classList.remove('show');
            document.querySelector('.center-panel').classList.remove('keyboard-active');
        }

        // Hide keyboard when clicking outside inputs (on center panel)
        document.querySelector('.center-panel').addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT' && !e.target.closest('.keyboard-wrapper')) {
                document.getElementById('kbd-container').classList.remove('show');
                document.querySelector('.center-panel').classList.remove('keyboard-active');
            }
        });

        // --- STATE & UI TRANSITION ---
        function changeState(state) {
            window.currentState = state;

            // Update state classes on body
            document.body.classList.remove('state-idle', 'state-form', 'state-ready', 'state-ready-photo', 'state-recording', 'state-review-video', 'state-review-final', 'state-processing');
            document.body.classList.add('state-' + state);

            document.querySelectorAll('.ui-state').forEach(el => el.classList.remove('active'));
            document.getElementById('state-' + state).classList.add('active');

            const largeImg = document.getElementById('photo-preview-large');
            if (largeImg) {
                if (state === 'review-final') {
                    largeImg.classList.remove('hidden');
                } else {
                    largeImg.classList.add('hidden');
                }
            }

            const leftPanel = document.getElementById('panel-left');
            const rightPanel = document.getElementById('panel-right');
            const rightLabel = document.getElementById('label-right-overlay');
            const idleHeader = document.getElementById('idle-header');

            if (state === 'form') {
                document.body.classList.add('state-form-active');
            } else {
                document.body.classList.remove('state-form-active');
            }

            if (state === 'idle') {
                document.body.classList.remove('logo-top-left');
            } else if (state === 'form') {
                document.body.classList.add('logo-top-left');
            } else {
                document.body.classList.add('logo-top-left');
            }

            // idleHeader is ALWAYS visible now, we just hide its children using CSS
            if (idleHeader) idleHeader.classList.remove('hidden');

            const webcamEl = document.getElementById('webcam');

            if (state === 'idle' || state === 'form') {
                if (state === 'idle') {
                    if (window.showLeftPanel !== false) {
                        leftPanel.classList.remove('hidden-panel');
                    } else {
                        leftPanel.classList.add('hidden-panel');
                    }

                    if (window.showRightPanel !== false) {
                        rightPanel.classList.remove('hidden-panel');
                    } else {
                        rightPanel.classList.add('hidden-panel');
                    }
                } else {
                    leftPanel.classList.add('hidden-panel');
                    rightPanel.classList.add('hidden-panel');
                }

                rightLabel.classList.remove('hidden');

                // Tampilkan video jika URL-nya ada
                const previewVid = document.getElementById('preview');
                const loopVid = document.getElementById('loop-preview');

                if (webcamEl) webcamEl.classList.add('hidden');

                if (previewVid.src) {
                    previewVid.classList.remove('hidden');
                    previewVid.play().catch(e => console.log("Tutorial play error:", e));
                }

                if (loopVid.src) {
                    loopVid.classList.remove('hidden');
                    loopVid.play().catch(e => console.log("Result preview play error:", e));
                }
            } else {
                leftPanel.classList.add('hidden-panel');
                rightPanel.classList.remove('hidden-panel');
                rightLabel.classList.add('hidden');
                if (state === 'ready' || state === 'ready-photo') {
                    if (webcamEl) webcamEl.classList.remove('hidden');
                    document.getElementById('preview').classList.add('hidden');
                    if (state === 'ready') {
                        // Reset Button UI
                        const btn = document.getElementById('btn-record');
                        if (btn) {
                            btn.classList.remove('recording');
                            btn.style.pointerEvents = 'auto';
                        }
                        document.getElementById('countdown-area').innerHTML = window.readyCountdownText || 'Start Recording';
                    } else {
                        // Reset Shutter Button UI
                        const btn = document.getElementById('btn-photo-shutter');
                        if (btn) {
                            btn.style.pointerEvents = 'auto';
                        }
                        document.getElementById('countdown-area-photo').innerHTML = window.photoCountdownText || 'Take a Photo';
                    }
                } else {
                    if (webcamEl) webcamEl.classList.add('hidden');
                    if (state === 'review-video') {
                        document.getElementById('preview').classList.remove('hidden');
                    } else if (state === 'review-final') {
                        document.getElementById('preview').classList.add('hidden');
                    } else {
                        document.getElementById('preview').classList.remove('hidden');
                    }
                }
            }
        }

        // --- LOAD CONFIG ---
        function preloadImage(url) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => resolve(url); // Don't block loading if one fails
                img.src = url;
            });
        }

        function applyCachedTheme() {
            try {
                const cached = localStorage.getItem('vb_config');
                if (!cached) return;
                const data = JSON.parse(cached);

                // Set global state variables
                window.showLeftPanel = data.showLeftPanel !== false;
                window.showRightPanel = data.showRightPanel !== false;
                window.enableGesture = data.enableGesture !== false;
                window.recordingDuration = data.recordingDuration || 15;
                window.qrResetDuration = data.qrResetDuration || 45;
                window.readyCdText = data.readyCdText || 'Recording Begins in...';
                window.recordingCdText = data.recordingCdText || 'Recording...';
                window.photoCdText = data.photoCdText || 'Taking Photo in...';
                window.readyCountdownText = data.readyCountdownText || 'Start Recording';
                window.photoCountdownText = data.photoCountdownText || 'Take a Photo';
                window.successAutoResetText = data.successAutoResetText || 'Auto-reset in';

                // Immediately show/hide Left/Right panels based on cache
                const leftPanel = document.getElementById('panel-left');
                const rightPanel = document.getElementById('panel-right');

                if (leftPanel) {
                    if (window.showLeftPanel) leftPanel.classList.remove('hidden-panel');
                    else leftPanel.classList.add('hidden-panel');
                }
                if (rightPanel) {
                    if (window.showRightPanel) rightPanel.classList.remove('hidden-panel');
                    else rightPanel.classList.add('hidden-panel');
                }

                // Immediately update titles & subtitles
                const titleRow = document.querySelector('.names-row');
                if (titleRow && data.title) {
                    titleRow.innerHTML = window.formatTitleText(data.title);
                }

                const subEl = document.getElementById('idle-sub');
                if (subEl && data.subtitle) subEl.innerHTML = data.subtitle;

                const descEl = document.getElementById('desc-premium');
                if (descEl && data.descPremium) descEl.innerHTML = data.descPremium;

                const startBtn = document.getElementById('start-btn-text');
                if (startBtn && data.startText) startBtn.innerHTML = data.startText;

                window.updateConfigurableTexts(data);

                const logoEl = document.getElementById('main-logo');
                if (logoEl && data.logoUrl) {
                    logoEl.src = data.logoUrl;
                }

                const brandingLogoEl = document.getElementById('branding-logo');
                if (brandingLogoEl && data.logoUrl) {
                    brandingLogoEl.src = data.logoUrl;
                }

                // Immediately apply cached background, frame and colors to prevent style flashing
                const rootStyle = document.documentElement.style;
                if (data.bgImageUrl && data.bgImageUrl !== 'none' && data.bgImageUrl !== 'Default') {
                    const targetBg = `url("${data.bgImageUrl}")`;
                    if (document.body.style.backgroundImage !== targetBg) {
                        document.body.style.backgroundImage = targetBg;
                        document.body.style.backgroundSize = 'cover';
                    }
                } else {
                    const targetGrad = `radial-gradient(circle at center, var(--bg-1) 0%, var(--bg-2) 100%)`;
                    if (document.body.style.backgroundImage !== targetGrad) {
                        document.body.style.backgroundImage = targetGrad;
                    }
                }

                if (data.frameImageUrl) {
                    const targetFrame = `url("${data.frameImageUrl}")`;
                    if (rootStyle.getPropertyValue('--frame-image') !== targetFrame) {
                        rootStyle.setProperty('--frame-image', targetFrame);
                    }
                }

                window.applyThemeColors(data, document.documentElement);

                const targetFrameColor = data.frameColor || 'rgba(30, 41, 59, 0.95)';
                if (rootStyle.getPropertyValue('--frame') !== targetFrameColor) rootStyle.setProperty('--frame', targetFrameColor);

                const bg1 = data.bgColor1 || '#fdfbfb';
                if (rootStyle.getPropertyValue('--bg-1') !== bg1) rootStyle.setProperty('--bg-1', bg1);

                const bg2 = data.bgColor2 || '#ebedee';
                if (rootStyle.getPropertyValue('--bg-2') !== bg2) rootStyle.setProperty('--bg-2', bg2);

                if (rootStyle.getPropertyValue('--font-style-sub') !== 'normal') rootStyle.setProperty('--font-style-sub', 'normal');
            } catch (e) {
                console.warn("Cached theme apply failed:", e);
            }
        }

        async function applyTheme() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const eventId = urlParams.get('event') || '';
                const res = await fetch('/api/config' + (eventId ? '?eventId=' + eventId : ''), { cache: 'no-store' });
                const data = await res.json();
                localStorage.setItem('vb_config', JSON.stringify(data));

                // 1. Preload Critical Images in Parallel
                const criticalAssets = [];
                if (data.bgImageUrl && data.bgImageUrl !== 'none' && data.bgImageUrl !== 'Default') criticalAssets.push(preloadImage(data.bgImageUrl));
                if (data.frameImageUrl) criticalAssets.push(preloadImage(data.frameImageUrl));
                if (data.logoUrl) criticalAssets.push(preloadImage(data.logoUrl));
                try {
                    await Promise.all(criticalAssets);
                } catch (e) { console.warn("Asset preload failed:", e); }

                // 2. Update Logo & Title (Only if different)
                const logoEl = document.getElementById('main-logo');
                if (logoEl && data.logoUrl) {
                    const targetLogo = new URL(data.logoUrl, window.location.origin).href;
                    if (logoEl.src !== targetLogo) logoEl.src = data.logoUrl;
                }

                const titleRow = document.querySelector('.names-row');
                if (titleRow && data.title) {
                    const formattedTitle = window.formatTitleText(data.title);
                    if (titleRow.innerHTML !== formattedTitle) titleRow.innerHTML = formattedTitle;
                }

                // Toggle Header Mode (Title vs Logo)
                const mainTitleEl = document.getElementById('main-title');
                const brandingLogoEl = document.getElementById('branding-logo');

                if (data.idleHeadMode === 'logo' && data.logoUrl) {
                    if (mainTitleEl && !mainTitleEl.classList.contains('hidden')) mainTitleEl.classList.add('hidden');
                    if (brandingLogoEl) {
                        const targetSrc = new URL(data.logoUrl, window.location.origin).href;
                        if (brandingLogoEl.src !== targetSrc) brandingLogoEl.src = data.logoUrl;
                        if (brandingLogoEl.style.display !== 'block') brandingLogoEl.style.display = 'block';
                    }
                } else {
                    if (mainTitleEl && mainTitleEl.classList.contains('hidden')) mainTitleEl.classList.remove('hidden');
                    if (brandingLogoEl && brandingLogoEl.style.display !== 'none') brandingLogoEl.style.display = 'none';
                    const subEl = document.getElementById('idle-sub');
                    if (subEl && data.subtitle && subEl.innerHTML !== data.subtitle) subEl.innerHTML = data.subtitle;

                    const descEl = document.getElementById('desc-premium');
                    if (descEl && data.descPremium && descEl.innerHTML !== data.descPremium) descEl.innerHTML = data.descPremium;

                    const startBtn = document.getElementById('start-btn-text');
                    if (startBtn && data.startText && startBtn.innerHTML !== data.startText) startBtn.innerHTML = data.startText;
                }

                // 2.5 Update Bottom Left Logo
                const bottomLeftLogoEl = document.getElementById('bottom-left-logo');
                if (bottomLeftLogoEl && data.bottomLeftLogoUrl) {
                    const targetBottomLeftSrc = new URL(data.bottomLeftLogoUrl, window.location.origin).href;
                    if (bottomLeftLogoEl.src !== targetBottomLeftSrc) bottomLeftLogoEl.src = data.bottomLeftLogoUrl;
                    if (data.bottomLeftLogoUrl === 'none' || data.bottomLeftLogoUrl === '') {
                        bottomLeftLogoEl.style.display = 'none';
                    } else {
                        bottomLeftLogoEl.style.display = 'block';
                    }
                }

                window.updateConfigurableTexts(data);

                // 3. Smart Video Asset Updates (Prevent infinite reload cycle)
                const tutorialVid = document.getElementById('preview');
                const resultVid = document.getElementById('loop-preview');

                if (data.tutorialVideoUrl && tutorialVid) {
                    const cleanSrc = tutorialVid.src ? tutorialVid.src.split('?')[0] : '';
                    const targetUrl = new URL(data.tutorialVideoUrl, window.location.origin).href;
                    if (cleanSrc !== targetUrl) {
                        console.log("[THEME] Loading Tutorial:", targetUrl);
                        tutorialVid.src = targetUrl;
                    }
                } else if (tutorialVid) {
                    if (tutorialVid.src !== '') tutorialVid.src = '';
                }

                if (data.resultVideoUrl && resultVid) {
                    const cleanSrc = resultVid.src ? resultVid.src.split('?')[0] : '';
                    const targetUrl = new URL(data.resultVideoUrl, window.location.origin).href;
                    if (cleanSrc !== targetUrl) {
                        console.log("[THEME] Loading Loop:", targetUrl);
                        resultVid.src = targetUrl;
                    }
                } else if (resultVid) {
                    if (resultVid.src !== '') resultVid.src = '';
                }

                // 4. Optimized CSS Variable Updates (Prevent style flashing)
                const rootStyle = document.documentElement.style;
                if (data.bgImageUrl && data.bgImageUrl !== 'none' && data.bgImageUrl !== 'Default') {
                    const targetBg = `url("${data.bgImageUrl}")`;
                    if (document.body.style.backgroundImage !== targetBg) {
                        document.body.style.backgroundImage = targetBg;
                        document.body.style.backgroundSize = 'cover';
                    }
                } else {
                    const targetGrad = `radial-gradient(circle at center, var(--bg-1) 0%, var(--bg-2) 100%)`;
                    if (document.body.style.backgroundImage !== targetGrad) {
                        document.body.style.backgroundImage = targetGrad;
                    }
                }

                if (data.frameImageUrl) {
                    const targetFrame = `url("${data.frameImageUrl}")`;
                    if (rootStyle.getPropertyValue('--frame-image') !== targetFrame) {
                        rootStyle.setProperty('--frame-image', targetFrame);
                    }
                }

                window.applyThemeColors(data, document.documentElement);

                const targetFrameColor = data.frameColor || 'rgba(30, 41, 59, 0.95)';
                if (rootStyle.getPropertyValue('--frame') !== targetFrameColor) rootStyle.setProperty('--frame', targetFrameColor);

                const bg1 = data.bgColor1 || '#fdfbfb';
                if (rootStyle.getPropertyValue('--bg-1') !== bg1) rootStyle.setProperty('--bg-1', bg1);

                const bg2 = data.bgColor2 || '#ebedee';
                if (rootStyle.getPropertyValue('--bg-2') !== bg2) rootStyle.setProperty('--bg-2', bg2);

                if (rootStyle.getPropertyValue('--font-style-sub') !== 'normal') rootStyle.setProperty('--font-style-sub', 'normal');

                const fontFamily = data.fontFamily || "'Aref Ruqaa', serif";
                if (rootStyle.getPropertyValue('--body-font-dyn') !== fontFamily) rootStyle.setProperty('--body-font-dyn', fontFamily);

                window.enableGesture = data.enableGesture !== false;
                window.recordingDuration = data.recordingDuration || 15;
                window.qrResetDuration = data.qrResetDuration || 45;
                window.readyCdText = data.readyCdText || 'Recording Begins in...';
                window.recordingCdText = data.recordingCdText || 'Recording...';
                window.photoCdText = data.photoCdText || 'Taking Photo in...';
                window.readyCountdownText = data.readyCountdownText || 'Start Recording';
                window.photoCountdownText = data.photoCountdownText || 'Take a Photo';
                window.successAutoResetText = data.successAutoResetText || 'Auto-reset in';
                window.showLeftPanel = data.showLeftPanel !== false;
                window.showRightPanel = data.showRightPanel !== false;

                // Re-apply current state if currently idle/form to immediately reflect left/right panel toggle updates
                if (window.currentState === 'idle') {
                    changeState('idle');
                }

                // Update Font if provided
                const isDirectFont = data.fontUrl && /\.(ttf|otf|woff|woff2)(\?.*)?$/i.test(data.fontUrl);
                if (data.fontUrl && !isDirectFont) {
                    let link = document.getElementById('dynamic-font');
                    if (!link) {
                        link = document.createElement('link');
                        link.id = 'dynamic-font';
                        link.rel = 'stylesheet';
                        document.head.appendChild(link);
                    }
                    if (link.href !== data.fontUrl) link.href = data.fontUrl;
                }
                if (data.fontFamily || data.titleFontFamily) {
                    let styleParams = document.getElementById('dynamic-font-styles');
                    if (!styleParams) {
                        styleParams = document.createElement('style');
                        styleParams.id = 'dynamic-font-styles';
                        document.head.appendChild(styleParams);
                    }

                    let fontFaceRule = '';
                    if (isDirectFont) {
                        let format = 'truetype';
                        if (data.fontUrl.toLowerCase().includes('.otf')) format = 'opentype';
                        else if (data.fontUrl.toLowerCase().includes('.woff2')) format = 'woff2';
                        else if (data.fontUrl.toLowerCase().includes('.woff')) format = 'woff';

                        fontFaceRule = `
                            @font-face {
                                font-family: ${data.fontFamily || "'CustomUploadedFont'"};
                                src: url("${data.fontUrl}") format("${format}");
                                font-weight: normal;
                                font-style: normal;
                            }
                        `;
                    }

                    styleParams.innerHTML = `
                        ${fontFaceRule}
                        :root { 
                            --title-font-dyn: ${data.titleFontFamily || data.fontFamily || "'Luxurious Script', cursive"}; 
                            --body-font-dyn: ${data.fontFamily || "'Aref Ruqaa', serif"};
                        }
                        body, input, button, textarea, .subtitle-premium, .desc-premium, .panel-footer, .ui-state h2, .delivery-tab {
                            font-family: var(--body-font-dyn) !important;
                        }
                        .scribble-title, .scribble-title span, .names-row, .names-row span {
                            font-family: var(--title-font-dyn) !important;
                        }
                        #countdown-area, .countdown-text {
                            font-family: var(--body-font-dyn) !important;
                            font-style: var(--font-style-sub, italic);
                        }
                        #countdown-val, #countdown-val-photo {
                            font-family: 'Roboto', sans-serif !important;
                            color: inherit !important;
                        }
                    `;
                }

                // Set initial state
                changeState('idle');

            } catch (e) {
                console.error("Theme apply error:", e);
            }
        }
        applyCachedTheme();
        applyTheme();

        // --- BOOTH LOGIC ---
        let stream, mediaRecorder, recordedChunks = [], videoBlob, photoBlob, isProcessing = false;
        const webcam = document.getElementById('webcam'), preview = document.getElementById('preview');
        const drawing = document.getElementById('drawing_canvas'), dCtx = drawing.getContext('2d');

        async function startCameraFlow() {
            const n = document.getElementById('name').value;
            if (!n) return alert("Please input your name!");
            try {
                // Cari OBS Virtual Camera secara eksplisit
                const devices = await navigator.mediaDevices.enumerateDevices();
                const obsCamera = devices.find(d =>
                    d.kind === 'videoinput' && d.label.toLowerCase().includes('obs')
                );

                // Paksa resolusi 1080x1920 — tanpa ini browser hanya minta 360x634 (default)
                // yang menyebabkan OBS driver crop frame → terlihat zoom
                const videoConstraints = obsCamera
                    ? {
                        deviceId: { exact: obsCamera.deviceId },
                        width: { exact: 1080 },
                        height: { exact: 1920 },
                        resizeMode: 'none'
                    }
                    : { width: { exact: 1080 }, height: { exact: 1920 }, resizeMode: 'none' };

                console.log('Kamera dipilih:', obsCamera ? obsCamera.label : 'Default Camera');
                stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
                webcam.srcObject = stream;

                webcam.onloadedmetadata = () => {
                    const vw = webcam.videoWidth, vh = webcam.videoHeight;
                    console.log(`[Camera] Resolusi: ${vw}x${vh} | Rasio: ${(vw / vh).toFixed(4)}`);
                    const track = stream.getVideoTracks()[0];
                    console.log('[Camera] Track settings:', JSON.stringify(track.getSettings()));
                };

                changeState('ready');
                if (window.enableGesture) initHandTracking();
            } catch (e) { alert("Camera Error: Check permissions."); console.error(e); }
        }

        let hands = null;
        function initHandTracking() {
            hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
            hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            hands.onResults(onRes);
            isProcessing = true;
            webcam.onloadedmetadata = () => {
                drawing.width = webcam.videoWidth; drawing.height = webcam.videoHeight;
                loop();
            };
        }

        let px = null, py = null;
        function onRes(res) {
            if (!isProcessing) return;
            if (res.multiHandLandmarks?.length > 0) {
                const lm = res.multiHandLandmarks[0];
                const tip = lm[8], mcp = lm[5], mid = lm[12];

                // Gesture logic: Index finger up, middle finger down
                const isDraw = tip.y < mcp.y - 0.04 && mid.y > lm[10].y;

                // Coordinate Smoothing
                const rawX = tip.x * drawing.width;
                const rawY = tip.y * drawing.height;

                const cx = px ? px * 0.4 + rawX * 0.6 : rawX;
                const cy = py ? py * 0.4 + rawY * 0.6 : rawY;

                if (isDraw) {
                    if (px) {
                        dCtx.beginPath();
                        dCtx.moveTo(px, py);
                        dCtx.lineTo(cx, cy);

                        // Premium Glow Effect
                        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
                        dCtx.strokeStyle = accent || "#c5a059";
                        dCtx.lineWidth = 14;
                        dCtx.lineCap = "round";
                        dCtx.lineJoin = "round";

                        dCtx.shadowBlur = 10;
                        dCtx.shadowColor = accent || "#c5a059";

                        dCtx.stroke();

                        // Add an extra inner white line for a "light pen" effect
                        dCtx.beginPath();
                        dCtx.moveTo(px, py);
                        dCtx.lineTo(cx, cy);
                        dCtx.strokeStyle = "#ffffff";
                        dCtx.lineWidth = 4;
                        dCtx.shadowBlur = 0;
                        dCtx.stroke();
                    }
                    px = cx; py = cy;
                } else { px = null; py = null; }
            }
        }
        async function loop() { if (isProcessing) await hands.send({ image: webcam }); requestAnimationFrame(loop); }

        function startRecording() {
            // Fase 1: Persiapan 3, 2, 1
            let preTime = 3;
            document.getElementById('btn-record').style.pointerEvents = 'none'; // Disable double click
            document.getElementById('countdown-area').innerHTML = `${window.readyCdText} <span id="countdown-val">${preTime}</span>`;

            const preTimer = setInterval(() => {
                preTime--;
                document.getElementById('countdown-val').innerText = preTime;
                if (preTime <= 0) {
                    clearInterval(preTimer);
                    // Fase 2: Mulai Rekam 15 Detik
                    actuallyStartRecording();
                }
            }, 1000);
        }

        function actuallyStartRecording() {
            recordedChunks = [];
            document.getElementById('btn-record').classList.add('recording');
            const duration = window.recordingDuration || 15;
            document.getElementById('countdown-area').innerHTML = `${window.recordingCdText} <span id="countdown-val">${duration}</span>`;

            // Tampilkan & Reset Timer Bar (Dinamis)
            const svgTimer = document.getElementById('svg-timer');
            const rectTimer = document.getElementById('rect-timer');
            svgTimer.classList.remove('hidden');

            setTimeout(() => {
                const parent = svgTimer.parentElement;
                const offset = 10; // Padding agar glow tidak terpotong
                const w = parent.clientWidth - offset;
                const h = parent.clientHeight - offset;

                rectTimer.setAttribute('width', w);
                rectTimer.setAttribute('height', h);
                rectTimer.setAttribute('x', offset / 2);
                rectTimer.setAttribute('y', offset / 2);

                const perimeter = 2 * (w + h);
                rectTimer.style.strokeDasharray = perimeter;
                rectTimer.style.strokeDashoffset = 0;
                rectTimer.style.transition = 'none'; // Reset transition
                rectTimer.offsetHeight; // Force reflow
                rectTimer.style.transition = `stroke-dashoffset ${duration}s linear`;
                rectTimer.style.strokeDashoffset = perimeter;
            }, 50);

            const rc = document.createElement('canvas'); const rctx = rc.getContext('2d');
            let isRec = true;
            const rloop = () => {
                if (!isRec) return;
                rc.width = webcam.videoWidth; rc.height = webcam.videoHeight;
                rctx.save();
                // Removed mirror logic for 'Normal' recording
                rctx.drawImage(webcam, 0, 0);
                if (window.enableGesture) rctx.drawImage(drawing, 0, 0);
                rctx.restore();
                requestAnimationFrame(rloop);
            };
            rloop();

            const cs = rc.captureStream(30);
            mediaRecorder = new MediaRecorder(cs, {
                mimeType: 'video/webm;codecs=h264',
                videoBitsPerSecond: 8000000 // 8 Mbps untuk kualitas jernih kristal
            });
            mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
            mediaRecorder.onstop = () => {
                isRec = false;
                videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                preview.src = URL.createObjectURL(videoBlob);
                document.getElementById('final-video-preview').src = preview.src;
                svgTimer.classList.add('hidden');
                changeState('review-video');
            };
            mediaRecorder.start();

            let t = duration;
            const timer = setInterval(() => {
                t--;
                document.getElementById('countdown-val').innerText = t;
                if (t <= 0) {
                    clearInterval(timer);
                    mediaRecorder.stop();
                    document.getElementById('btn-record').classList.remove('recording');
                    document.getElementById('btn-record').style.pointerEvents = 'auto';
                }
            }, 1000);
        }

        function retakeVideo() {
            dCtx.clearRect(0, 0, 10000, 10000);
            videoBlob = null;
            photoBlob = null;
            changeState('ready');
        }

        function retakePhotoOnly() {
            photoBlob = null;
            preparePhotoSession();
        }

        function preparePhotoSession() {
            changeState('ready-photo');
            document.getElementById('webcam').classList.remove('hidden');
            document.getElementById('preview').classList.add('hidden');
            const btn = document.getElementById('btn-photo-shutter');
            if (btn) btn.style.pointerEvents = 'auto';
            const area = document.getElementById('countdown-area-photo');
            if (area) area.innerHTML = window.photoCountdownText || 'Take a Photo';
        }

        function startPhotoCountdown() {
            let t = 3;
            const area = document.getElementById('countdown-area-photo');
            if (area) area.innerHTML = `${window.photoCdText} <span id="countdown-val-photo">${t}</span>`;
            const btn = document.getElementById('btn-photo-shutter');
            if (btn) btn.style.pointerEvents = 'none';

            const timer = setInterval(() => {
                t--;
                const valEl = document.getElementById('countdown-val-photo');
                if (valEl) valEl.innerText = t;
                if (t <= 0) {
                    clearInterval(timer);
                    takePhoto();
                }
            }, 1000);
        }

        function takePhoto() {
            // Flash Effect
            const flash = document.getElementById('flash-overlay');
            flash.classList.add('active');
            setTimeout(() => flash.classList.remove('active'), 100);

            // Capture from rc canvas (already used in recording loop)
            const rc = document.createElement('canvas');
            rc.width = webcam.videoWidth;
            rc.height = webcam.videoHeight;
            const rctx = rc.getContext('2d');
            rctx.drawImage(webcam, 0, 0);
            if (window.enableGesture) rctx.drawImage(drawing, 0, 0);

            rc.toBlob((blob) => {
                photoBlob = blob;
                const url = URL.createObjectURL(blob);
                document.getElementById('final-photo-preview').src = url;
                document.getElementById('photo-preview-large').src = url;
                changeState('review-final');
                document.getElementById('btn-record').style.pointerEvents = 'auto';
            }, 'image/jpeg', 0.95);
        }

        let autoResetTimer = null;

        function resetApp() {
            // Clear auto reset timer if active
            if (autoResetTimer) {
                clearInterval(autoResetTimer);
                autoResetTimer = null;
            }

            // Reset input values
            const nameEl = document.getElementById('name');
            if (nameEl) nameEl.value = '';

            // Clear drawing canvas
            if (typeof dCtx !== 'undefined' && dCtx) {
                dCtx.clearRect(0, 0, 10000, 10000);
            }

            // Clear recorded blobs and preview source
            videoBlob = null;
            photoBlob = null;
            recordedChunks = [];

            const previewVid = document.getElementById('preview');
            if (previewVid) {
                previewVid.src = '';
                previewVid.load();
            }

            const finalVid = document.getElementById('final-video-preview');
            if (finalVid) {
                finalVid.src = '';
                finalVid.load();
            }

            const finalPhoto = document.getElementById('final-photo-preview');
            if (finalPhoto) {
                finalPhoto.src = '';
            }

            const largePhoto = document.getElementById('photo-preview-large');
            if (largePhoto) {
                largePhoto.src = '';
            }

            // Reset QR code image
            const qrImg = document.getElementById('qr-image');
            if (qrImg) qrImg.src = '';

            // Hide virtual keyboard
            const kbd = document.getElementById('kbd-container');
            if (kbd) kbd.classList.remove('show');
            const centerPanel = document.querySelector('.center-panel');
            if (centerPanel) centerPanel.classList.remove('keyboard-active');
            activeInput = null;

            // Return to idle state smoothly!
            changeState('idle');
            applyTheme().catch(e => console.warn("Auto-apply theme on reset failed:", e));
        }

        async function submitVideo() {
            changeState('processing');

            // Clear auto reset timer if active
            if (autoResetTimer) {
                clearInterval(autoResetTimer);
                autoResetTimer = null;
            }

            const countdownEl = document.getElementById('auto-reset-countdown');
            if (countdownEl) countdownEl.innerText = '';

            const fd = new FormData();
            fd.append('video', videoBlob, 'recording.mp4');
            if (photoBlob) fd.append('photo', photoBlob, 'photo.jpg');

            const nameValue = document.getElementById('name').value;
            fd.append('name', nameValue || 'Guest');
            
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('event') || 'default';
            fd.append('eventId', eventId);

            try {
                const r = await fetch('/api/videobooth/submit', { method: 'POST', body: fd });
                if (r.ok) {
                    const resJson = await r.json();
                    if (resJson.status === 'success' && resJson.data && resJson.data.resultUrl) {
                        const resultUrl = resJson.data.resultUrl;

                        // Set QR Code image
                        const qrImg = document.getElementById('qr-image');
                        if (qrImg) {
                            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(resultUrl)}`;
                        }

                        // Start auto-reset countdown
                        let timeLeft = window.qrResetDuration || 45;
                        const autoResetLabel = window.successAutoResetText || 'Auto-reset in';
                        if (countdownEl) {
                            countdownEl.innerText = `${autoResetLabel} ${timeLeft}s`;
                            autoResetTimer = setInterval(() => {
                                timeLeft--;
                                if (countdownEl) countdownEl.innerText = `${autoResetLabel} ${timeLeft}s`;
                                if (timeLeft <= 0) {
                                    clearInterval(autoResetTimer);
                                    autoResetTimer = null;
                                    resetApp();
                                }
                            }, 1000);
                        }
                    } else {
                        // Fallback reset if resultUrl is missing
                        setTimeout(resetApp, 10000);
                    }
                }
                else changeState('review-final');
            } catch (e) {
                console.error("Submit error:", e);
                changeState('review-final');
            }
        }

        // Clean up no-transition class after load to allow animations later
        window.addEventListener('load', () => {
            setTimeout(() => {
                document.querySelectorAll('.no-transition').forEach(el => {
                    el.classList.remove('no-transition');
                });
            }, 500);
        });
    