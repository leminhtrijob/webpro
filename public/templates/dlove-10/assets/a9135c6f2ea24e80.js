
let isLandscape = false;
let matrixInterval = null;
const confettiPool = [];
const maxConfetti = 50;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);


function createConfetti() {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    return confetti;
}

function getConfettiFromPool() {
    if (confettiPool.length > 0) {
        return confettiPool.pop();
    }
    return createConfetti();
}

// ✅ FIX 1: Thêm function để force resize matrix canvas
function forceResizeMatrix() {
    const matrixCanvas = document.getElementById('matrix-rain');
    if (matrixCanvas) {
        // Force resize canvas to current window size
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;

        // Restart matrix rain with new dimensions
        if (matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
        }
        initMatrixRain();
    }
}

function returnConfettiToPool(confetti) {
    confetti.remove();
    confettiPool.push(confetti);
}


function checkOrientation() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const orientationLock = document.getElementById('orientation-lock');
    const matrixCanvas = document.getElementById('matrix-rain');
    const mainCanvas = document.querySelector('.canvas');

    if (!isMobile) {
        isLandscape = true;
        orientationLock.style.display = 'none';
        matrixCanvas.style.display = 'block';
        mainCanvas.style.display = 'block';
        startWebsite();
    } else {
        const mediaQuery = window.matchMedia("(orientation: landscape)");
        isLandscape = mediaQuery.matches;

        if (isLandscape) {
            orientationLock.style.display = 'none';
            matrixCanvas.style.display = 'block';
            mainCanvas.style.display = 'block';
            startWebsite();

            // ✅ FIX 2: Force resize matrix khi chuyển sang landscape
            setTimeout(() => {
                forceResizeMatrix();
            }, 100);
        } else {
            orientationLock.style.display = 'flex';
            matrixCanvas.style.display = 'none';
            mainCanvas.style.display = 'none';
            stopWebsite();
        }

        mediaQuery.addEventListener('change', (e) => {
            isLandscape = e.matches;
            if (isLandscape) {
                orientationLock.style.display = 'none';
                matrixCanvas.style.display = 'block';
                mainCanvas.style.display = 'block';
                startWebsite();

                // ✅ FIX 3: Force resize matrix khi orientation change
                setTimeout(() => {
                    forceResizeMatrix();
                }, 100);
            } else {
                orientationLock.style.display = 'flex';
                matrixCanvas.style.display = 'none';
                mainCanvas.style.display = 'none';
                stopWebsite();
            }
        });
    }
}
function startWebsite(restart = false) {
    // Settings and orientation can become ready in either order.
    if (!window.isWebsiteReady || (isMobile && !isLandscape)) return;
    if (S.started && !restart) return;
    S.init();
    S.started = true;
    resetWebsiteState();
}

function stopWebsite() {
    S.started = false;
    window.TeacherText?.hide();
    S.UI.reset(true);
    if (matrixInterval) {
        clearInterval(matrixInterval);
        matrixInterval = null;
        const matrixCanvas = document.getElementById('matrix-rain');
        if (matrixCanvas) {
            const matrixCtx = matrixCanvas.getContext('2d');
            matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        }
    }
}

let matrixChars = "HAPPYBIRTHDAY".split("");
function initMatrixRain() {
    const matrixCanvas = document.getElementById('matrix-rain');
    const matrixCtx = matrixCanvas.getContext('2d');

    // ✅ FIX 4: Force set canvas size to current window dimensions
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    // Detect mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Điều chỉnh fontSize và tốc độ cho mobile
    const fontSize = isMobile ? 13 : 25;
    const intervalTime = isMobile ? 44 : 50; // mobile chạy chậm hơn

    const columns = Math.floor(matrixCanvas.width / fontSize);
    const drops = [];
    const columnColors = [];
    const delays = [];
    const started = [];

    const maxLength = Math.floor(matrixCanvas.height / fontSize) + 2;

    for (let x = 0; x < columns; x++) {
        drops[x] = 0;
        columnColors[x] = x % 2 === 0 ?
            (window.settings ? window.settings.matrixColor1 : settings.matrixColor1) :
            (window.settings ? window.settings.matrixColor2 : settings.matrixColor2);
        delays[x] = Math.random() * 2000;
        started[x] = false;
    }

    let startTime = Date.now();

    function drawMatrixRain() {
        matrixCtx.fillStyle = "rgba(0, 0, 0, 0.05)";
        matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

        matrixCtx.font = window.TeacherText.isModern()
            ? "800 " + fontSize + "px 'Baloo 2', sans-serif"
            : "bold " + fontSize + "px Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";

        const currentTime = Date.now();

        for (let i = 0; i < drops.length; i++) {
            if (!started[i] && currentTime - startTime >= delays[i]) {
                started[i] = true;
            }

            if (started[i] && drops[i] < maxLength) {
                const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                const x = i * fontSize;
                const y = drops[i] * fontSize;

                const color = columnColors[i];
                matrixCtx.fillStyle = color;
                matrixCtx.shadowColor = color;
                matrixCtx.shadowBlur = 8;
                matrixCtx.fillText(text, x, y);
                matrixCtx.shadowBlur = 0;
            }

            if (started[i]) {
                drops[i]++;
            }

            if (drops[i] >= maxLength) {
                drops[i] = 0;
                delays[i] = Math.random() * 1000;
                started[i] = false;
            }
        }
    }

    matrixInterval = setInterval(drawMatrixRain, intervalTime);

    // ✅ FIX 5: Improve resize handler
    window.addEventListener('resize', () => {
        // Debounce resize events
        clearTimeout(window.matrixResizeTimeout);
        window.matrixResizeTimeout = setTimeout(() => {
            matrixCanvas.width = window.innerWidth;
            matrixCanvas.height = window.innerHeight;
            const newColumns = Math.floor(matrixCanvas.width / fontSize);
            const newMaxLength = Math.floor(matrixCanvas.height / fontSize) + 2;

            // Reset arrays with new dimensions
            drops.length = 0;
            columnColors.length = 0;
            delays.length = 0;
            started.length = 0;

            for (let x = 0; x < newColumns; x++) {
                drops[x] = 0;
                columnColors[x] = x % 2 === 0 ?
                    (window.settings ? window.settings.matrixColor1 : settings.matrixColor1) :
                    (window.settings ? window.settings.matrixColor2 : settings.matrixColor2);
                delays[x] = Math.random() * 1000;
                started[x] = false;
            }
            startTime = Date.now();
        }, 100);
    });
}

S = {
    initialized: false,
    init: function () {
        if (!isLandscape && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            return;
        }
        if (S.initialized) return;
        S.initialized = true;
        S.Drawing.init('.canvas');
        document.body.classList.add('body--ready');

        S.Drawing.loop(function () {
            if (!window.TeacherText.isModern()) S.Shape.render();
        });
    }
};

document.addEventListener('DOMContentLoaded', checkOrientation);

S.Drawing = (function () {
    var canvas,
        area,
        context,
        renderFn,
        running = false,
        requestFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };

    return {
        init: function (el) {
            if (canvas) return;
            canvas = document.querySelector(el);
            context = canvas.getContext('2d');
            this.adjustCanvas();
            const refit = function () {
                const previous = area;
                S.Drawing.adjustCanvas();
                if (previous.w === area.w && previous.h === area.h) return;
                const shape = S.ShapeBuilder.resize();
                if (shape && canvas.style.display !== 'none') S.Shape.switchShape(shape, true);
            };
            window.addEventListener('resize', refit);
            window.visualViewport?.addEventListener('resize', refit);
            window.visualViewport?.addEventListener('scroll', refit);
        },

        loop: function (fn) {
            if (running) return;
            running = true;
            renderFn = fn;
            const frame = () => {
                this.clearFrame();
                renderFn();
                requestFrame.call(window, frame);
            };
            frame();
        },

        adjustCanvas: function () {
            area = window.TeacherTextLayout.viewport();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.style.position = 'fixed';
            canvas.style.left = area.x + 'px';
            canvas.style.top = area.y + 'px';
            canvas.style.width = area.w + 'px';
            canvas.style.height = area.h + 'px';
            canvas.width = Math.round(area.w * dpr);
            canvas.height = Math.round(area.h * dpr);
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        },

        clearFrame: function () {
            context.clearRect(0, 0, area.w, area.h);
        },

        getArea: function () {
            // ✅ Kiểm tra canvas trước khi truy cập
            if (!canvas) {
                console.warn('Canvas not initialized, returning default area');
                return window.TeacherTextLayout.viewport();
            }
            return area;
        },
        drawCircle: function (p, c) {
            context.fillStyle = c.render();
            context.beginPath();
            context.arc(p.x, p.y, p.z, 0, 2 * Math.PI, true);
            context.closePath();
            context.fill();
        }
    };
}());

function showMainText(text, fast) {
    if (window.TeacherText.isModern()) {
        document.querySelector('.canvas').style.display = 'none';
        window.TeacherText.show(text);
    } else {
        window.TeacherText.hide();
        document.querySelector('.canvas').style.display = 'block';
        S.Shape.switchShape(S.ShapeBuilder.letter(text), fast);
    }
}

S.UI = (function () {
    let timer = null;
    let sequence = [];
    function reset(destroy) {
        clearTimeout(timer);
        timer = null;
        sequence = [];
        window.TeacherText.hide();
        if (destroy) S.Shape.switchShape(S.ShapeBuilder.letter(''));
    }
    function schedule(fn, delay) {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    }
    function finish() {
        // Clear the last word as well as hiding its canvas, including on resize.
        reset(true);
        document.querySelector('.canvas').style.display = 'none';
        if (typeof window.showEnvelope === 'function') window.showEnvelope();
    }
    function next() {
        if (!sequence.length) { finish(); return; }
        const current = sequence.shift();
        const [command, value] = current.split(' ');
        const delay = (isMobile ? 1700 : 1900) + Math.max(0, (current.length - 5) * 100);
        if (command === '#countdown') {
            let remaining = parseInt(value, 10) || 3;
            const tick = () => {
                if (remaining <= 0) { next(); return; }
                showMainText(remaining--, true);
                schedule(tick, 1000);
            };
            tick();
            return;
        }
        if (command === '#circle') {
            window.TeacherText.hide();
            document.querySelector('.canvas').style.display = 'block';
            S.Shape.switchShape(S.ShapeBuilder.circle(Math.min(parseInt(value, 10) || 30, 30)));
        } else if (command === '#time') {
            const clock = () => {
                const date = new Date();
                showMainText(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`);
                if (!sequence.length) schedule(clock, 1000);
            };
            clock();
            if (!sequence.length) return;
        } else if (command === '#gift') {
            window.TeacherText.hide();
            showStars();
            showFloatingHearts();
        } else {
            showMainText(current.startsWith('#') ? 'What?' : current);
        }
        schedule(next, sequence.length ? delay : Math.max(2000, delay));
    }
    return {
        simulate(action) {
            reset(true);
            if (!isLandscape && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) return;
            // One owned timer prevents a previous preview from opening the letter
            // in the middle of the new countdown after a version/color change.
            sequence = (Array.isArray(action) ? action : action.split('|')).filter(part => part.trim());
            if (sequence.length) next();
        },
        reset
    };
}());

S.Point = function (args) {
    this.x = args.x;
    this.y = args.y;
    this.z = args.z;
    this.a = args.a;
    this.h = args.h;
};

S.Color = function (r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
};

S.Color.prototype = {
    render: function () {
        return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
    }
};

// Cập nhật S.Dot với kích thước nhỏ hơn
S.Dot = function (x, y) {
    this.p = new S.Point({
        x: x,
        y: y,
        z: this.getDotSize(),
        a: 1,
        h: 0
    });
    this.e = 0.07;
    this.s = true;
    const currentSettings = window.settings || settings;
    const rgb = hexToRgb(currentSettings.sequenceColor);
    this.c = new S.Color(rgb.r, rgb.g, rgb.b, this.p.a);
    this.t = this.clone();
    this.q = [];
};
S.Dot.prototype = {
    // Thêm method để tính kích thước dot dựa trên thiết bị
    getDotSize: function () {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            return 2; // Dots nhỏ hơn cho mobile
        } else {
            return 4; // Dots vừa phải cho desktop
        }
    },

    clone: function () {
        return new S.Point({
            x: this.p.x,
            y: this.p.y,
            z: this.p.z,
            a: this.p.a,
            h: this.p.h
        });
    },

    _draw: function () {
        // Cập nhật màu theo settings hiện tại mỗi khi vẽ
        const currentSettings = window.settings || settings;
        const rgb = hexToRgb(currentSettings.sequenceColor);
        this.c.r = rgb.r;
        this.c.g = rgb.g;
        this.c.b = rgb.b;
        this.c.a = this.p.a;
        S.Drawing.drawCircle(this.p, this.c);
    },

    _moveTowards: function (n) {
        var details = this.distanceTo(n, true),
            dx = details[0],
            dy = details[1],
            d = details[2],
            e = this.e * d;

        if (this.p.h === -1) {
            this.p.x = n.x;
            this.p.y = n.y;
            return true;
        }

        if (d > 1) {
            this.p.x -= ((dx / d) * e);
            this.p.y -= ((dy / d) * e);
        } else {
            if (this.p.h > 0) {
                this.p.h--;
            } else {
                return true;
            }
        }

        return false;
    },

    _update: function () {
        if (this._moveTowards(this.t)) {
            var p = this.q.shift();
            if (p) {
                this.t.x = p.x ?? this.p.x;
                this.t.y = p.y ?? this.p.y;
                this.t.z = p.z ?? this.p.z;
                this.t.a = p.a ?? this.p.a;
                this.p.h = p.h || 0;
            } else {
                if (this.s) {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const amplitude = isMobile ? 0.1 : 3.142;
                    this.p.x -= Math.sin(Math.random() * amplitude);
                    this.p.y -= Math.sin(Math.random() * amplitude);
                } else {
                    this.move(new S.Point({
                        x: this.p.x + (Math.random() * 50) - 25,
                        y: this.p.y + (Math.random() * 50) - 25,
                    }));
                }
            }
        }
        var d = this.p.a - this.t.a;
        this.p.a = Math.max(0.1, this.p.a - (d * 0.05));
        d = this.p.z - this.t.z;
        this.p.z = Math.max(1, this.p.z - (d * 0.05));
    },

    distanceTo: function (n, details) {
        var dx = this.p.x - n.x,
            dy = this.p.y - n.y,
            d = Math.sqrt(dx * dx + dy * dy);
        return details ? [dx, dy, d] : d;
    },

    move: function (p, avoidStatic) {
        if (!avoidStatic || (avoidStatic && this.distanceTo(p) > 1)) {
            this.q.push(p);
        }
    },

    render: function () {
        this._update();
        this._draw();
    }
};

S.ShapeBuilder = (function () {
    const shapeCanvas = document.createElement('canvas');
    const shapeContext = shapeCanvas.getContext('2d');
    const fontFamily = 'Avenir, Helvetica Neue, Helvetica, Arial, sans-serif';
    let currentLetter = null;
    function getGap() {
        const area = window.TeacherTextLayout.viewport();
        return Math.min(area.w, area.h) <= 500 ? 3 : 5;
    }
    function fit() {
        const area = window.TeacherTextLayout.viewport();
        shapeCanvas.width = area.w;
        shapeCanvas.height = area.h;
        shapeContext.fillStyle = '#fff';
        shapeContext.textBaseline = 'alphabetic';
        shapeContext.textAlign = 'center';
    }
    function processCanvas() {
        const gap = getGap();
        const pixels = shapeContext.getImageData(0, 0, shapeCanvas.width, shapeCanvas.height).data;
        const dots = [];
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        // Sample using the actual pixel coordinates, then center the ink bounds.
        for (let y = 0; y < shapeCanvas.height; y += gap) {
            for (let x = 0; x < shapeCanvas.width; x += gap) {
                if (pixels[(y * shapeCanvas.width + x) * 4 + 3] < 80) continue;
                dots.push(new S.Point({x, y}));
                minX = Math.min(minX, x); minY = Math.min(minY, y);
                maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            }
        }
        if (!dots.length) return {dots, w: 0, h: 0};
        for (const dot of dots) { dot.x -= minX; dot.y -= minY; }
        return {dots, w: maxX - minX, h: maxY - minY};
    }
    fit();
    return {
        resize: function () {
            fit();
            return currentLetter === null ? null : this.letter(currentLetter);
        },
        circle: function (d) {
            currentLetter = null;
            fit();
            const r = Math.max(0, d) / 2, gap = getGap();
            shapeContext.beginPath();
            shapeContext.arc(r * gap, r * gap, r * gap, 0, 2 * Math.PI, false);
            shapeContext.fill();
            shapeContext.closePath();
            return processCanvas();
        },
        letter: function (text) {
            currentLetter = String(text ?? '');
            fit();
            const layout = window.TeacherTextLayout.particle(currentLetter, shapeContext,
                {w: shapeCanvas.width, h: shapeCanvas.height}, fontFamily);
            shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
            const firstBaseline = (shapeCanvas.height - layout.height) / 2 + layout.size * .8;
            layout.lines.forEach((line, index) => {
                shapeContext.fillText(line, shapeCanvas.width / 2, firstBaseline + index * layout.lineHeight);
            });
            return processCanvas();
        }
    };
}());

// Cập nhật S.Shape với logic tạo dots tối ưu
S.Shape = (function () {
    var dots = [],
        width = 0,
        height = 0,
        cx = 0,
        cy = 0;

    function compensate() {
        var a = S.Drawing.getArea();
        cx = a.w / 2 - width / 2;
        cy = a.h / 2 - height / 2;
    }

    function getDotCreationParams() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth < 768;

        if (isMobile || isSmallScreen) {
            return {
                minSize: 1,      // Giảm từ 2 xuống 1
                maxSize: 4,      // Giảm từ 8 xuống 4
                minZ: 2,         // Giảm từ 3 xuống 2
                maxZ: 3          // Giảm từ 6 xuống 3
            };
        } else {
            return {
                minSize: 3,
                maxSize: 12,
                minZ: 4,
                maxZ: 8
            };
        }
    }

    return {
        switchShape: function (n, fast) {
            var size,
                a = S.Drawing.getArea();
            width = n.w;
            height = n.h;
            compensate();

            const params = getDotCreationParams();

            if (n.dots.length > dots.length) {
                size = n.dots.length - dots.length;
                for (var d = 1; d <= size; d++) {
                    dots.push(new S.Dot(a.w / 2, a.h / 2));
                }
            }

            // A new letter supersedes all unfinished motion, including a resize.
            // Never wait for particles to finish an older countdown number.
            for (const dot of dots) {
                dot.q.length = 0;
                dot.t = dot.clone();
                dot.p.h = 0;
            }

            var d = 0,
                i = 0;
            while (n.dots.length > 0) {
                i = Math.floor(Math.random() * n.dots.length);
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                dots[d].e = isMobile ? 0.35 : 0.11; // Tăng tốc độ di chuyển cho mobile

                // Countdown numbers and viewport refits go straight to the target.
                if (!fast) {
                    dots[d].move(new S.Point({
                        z: dots[d].s
                            ? Math.random() * (params.maxSize - params.minSize) + params.minSize
                            : Math.random() * params.minZ + params.minZ,
                        a: dots[d].s ? Math.random() : dots[d].p.a,
                        h: dots[d].s ? 18 : 30
                    }));
                }

                dots[d].s = true;
                dots[d].move(new S.Point({
                    x: n.dots[i].x + cx,
                    y: n.dots[i].y + cy,
                    a: 1,
                    z: params.minZ,
                    h: 0
                }));

                n.dots[i] = n.dots[n.dots.length - 1];
                n.dots.pop();
                d++;
            }

            for (var i = d; i < dots.length; i++) {
                if (dots[i].s) {
                    dots[i].move(new S.Point({
                        z: Math.random() * (params.maxSize - params.minSize) + params.minSize,
                        a: Math.random(),
                        h: 20
                    }));
                    dots[i].s = false;
                    dots[i].e = 0.04;
                    dots[i].move(new S.Point({
                        x: Math.random() * a.w,
                        y: Math.random() * a.h,
                        a: 0.3,
                        z: Math.random() * params.minZ,
                        h: 0
                    }));
                }
            }
        },

        render: function () {
            for (var d = 0; d < dots.length; d++) {
                dots[d].render();
            }
        }
    };
}());


// 4. Tối ưu hóa floating hearts
const heartPool = [];
const maxFloatingHearts = 25; // Giảm từ 40 xuống 25

function createFloatingHeart() {
    const heart = document.createElement('div');
    heart.className = 'heart';
    return heart;
}

function getHeartFromPool() {
    if (heartPool.length > 0) {
        return heartPool.pop();
    }
    return createFloatingHeart();
}

function returnHeartToPool(heart) {
    heart.remove();
    heartPool.push(heart);
}

function showFloatingHearts() {
    const heartSymbols = ['❤️', '💕', '💖', '💗', '💓', '💞'];

    let heartCount = 0;
    function spawnHeart() {
        if (heartCount >= maxFloatingHearts) return;

        const heart = getHeartFromPool();
        heart.innerHTML = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.top = '100%';
        heart.style.fontSize = (Math.random() * 20 + 15) + 'px';

        document.body.appendChild(heart);
        heartCount++;

        // Cleanup sau 10 giây
        setTimeout(() => returnHeartToPool(heart), 10000);

        // Spawn tiếp theo
        if (heartCount < maxFloatingHearts) {
            setTimeout(spawnHeart, 1600); // Giảm delay
        }
    }

    spawnHeart();
}

// 5. Tối ưu hóa hiệu ứng mở sách
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 211, g: 155, b: 155 };
}


const contentDisplay = document.getElementById('contentDisplay');
const contentText = document.getElementById('contentText');
let typewriterTimeout;

function showConfetti() {
    const confettiColors = ['#ff6f91', '#ff9671', '#ffc75f', '#f9f871', '#ff3c78'];

    // Sử dụng requestAnimationFrame thay vì loop trực tiếp
    let confettiCount = 0;
    function spawnConfetti() {
        if (confettiCount >= maxConfetti) return;

        const confetti = getConfettiFromPool();
        confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        confetti.style.setProperty('--x', (Math.random() * 400 - 200) + 'px');
        confetti.style.setProperty('--y', (Math.random() * -400) + 'px');
        confetti.style.left = (window.innerWidth / 2) + 'px';
        confetti.style.top = (window.innerHeight / 2) + 'px';
        document.body.appendChild(confetti);

        // Sử dụng setTimeout tối ưu hơn
        setTimeout(() => returnConfettiToPool(confetti), 1000);

        confettiCount++;

        // Spawn tiếp theo với delay nhỏ hơn
        if (confettiCount < maxConfetti) {
            setTimeout(spawnConfetti, 20); // Giảm delay
        }
    }

    spawnConfetti();
}

let fireworkContainer = null;
function showFirework() {
    if (!fireworkContainer) {
        fireworkContainer = document.getElementById('fireworkContainer');
    }

    // Xóa nội dung cũ một cách hiệu quả
    fireworkContainer.innerHTML = '';
    fireworkContainer.style.opacity = 1;

    // Sử dụng DocumentFragment để tối ưu DOM manipulation
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 20; i++) { // Giảm từ 30 xuống 20
        const fw = document.createElement('div');
        fw.className = 'firework';
        fw.style.transform = `rotate(${i * 18}deg) translateY(-40px)`; // Tăng góc để bù trừ việc giảm số lượng
        fragment.appendChild(fw);
    }

    fireworkContainer.appendChild(fragment);

    // Sử dụng requestAnimationFrame cho smooth animation
    requestAnimationFrame(() => {
        setTimeout(() => {
            fireworkContainer.style.opacity = 0;
        }, 1000);
    });
}





// 6. Tối ưu hóa typewriter effect
function typewriterEffect(element, text, speed = 50) {
    return new Promise((resolve) => {
        element.innerHTML = '';
        let i = 0;
        let lastScrollTime = 0;

        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;

                // Throttle scroll updates
                const now = Date.now();
                if (now - lastScrollTime > 100) { // Chỉ scroll mỗi 100ms
                    const container = element.closest('.content-display');
                    if (container && container.scrollHeight > container.clientHeight) {
                        container.scrollTop = container.scrollHeight - container.clientHeight;
                    }
                    lastScrollTime = now;
                }

                // Sử dụng requestAnimationFrame thay vì setTimeout khi có thể
                if (speed < 16) {
                    requestAnimationFrame(type);
                } else {
                    typewriterTimeout = setTimeout(type, speed);
                }
            } else {
                resolve();
            }
        }
        type();
    });
}





const musicControl = document.getElementById('musicControl');
const birthdayAudio = document.getElementById('birthdayAudio');
let isPlaying = false;

birthdayAudio.volume = 0.6;

function toggleMusic() {
    if (isPlaying) {
        birthdayAudio.pause();
        musicControl.innerHTML = '▶';
        musicControl.classList.remove('playing');
        musicControl.title = 'Play Music';
        isPlaying = false;
    } else {
        birthdayAudio.play().then(() => {
            musicControl.innerHTML = '⏸';
            musicControl.classList.add('playing');
            musicControl.title = 'Pause Music';
            isPlaying = true;
        }).catch(error => {
            // alert('Click to play music!');
        });
    }
}

musicControl.addEventListener('click', toggleMusic);

birthdayAudio.addEventListener('ended', () => {
});

birthdayAudio.addEventListener('error', (e) => {
    musicControl.style.display = 'none';
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) {
        birthdayAudio.pause();
    }
});

// 8. Tối ưu hóa stars creation
let starsCreated = false;
function createStars() {
    if (starsCreated) return; // Tránh tạo lại stars

    const starsContainer = document.getElementById('starsContainer');
    starsContainer.innerHTML = '';

    const starCount = 100; // Giảm từ 150 xuống 100
    const starSizes = ['small', 'medium', 'large'];
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = `star ${starSizes[Math.floor(Math.random() * starSizes.length)]}`;

        // Batch style updates
        star.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-duration: ${Math.random() * 3 + 1}s;
            animation-delay: ${Math.random() * 2}s;
        `;

        fragment.appendChild(star);
    }

    starsContainer.appendChild(fragment);
    starsCreated = true;
}

function showStars() {
    const starsContainer = document.getElementById('starsContainer');
    createStars();
    starsContainer.style.display = 'block';
}

function hideStars() {
    const starsContainer = document.getElementById('starsContainer');
    starsContainer.style.display = 'none';
}

// 9. Cleanup function để giải phóng memory
function cleanup() {
    // Clear timeouts
    if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
    }
    
    if (zIndexUpdateTimeout) {
        clearTimeout(zIndexUpdateTimeout);
    }

    // Clear pools
    confettiPool.length = 0;
    heartPool.length = 0;

    // Reset counters
    starsCreated = false;
}

// 10. Debounce resize events
let resizeTimeout;
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Resize logic here
        const matrixCanvas = document.getElementById('matrix-rain');
        if (matrixCanvas) {
            matrixCanvas.width = window.innerWidth;
            matrixCanvas.height = window.innerHeight;
        }
    }, 100);
}

window.addEventListener('resize', handleResize);
// Call cleanup when page unloads
window.addEventListener('beforeunload', cleanup);

