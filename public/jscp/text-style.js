/* Coiny text renderer adapted from Happy-Birthday: solid HTML text, not particles. */
(function () {
'use strict';
function isModern() { return (window.settings || settings).fontStyle === 'mau2'; }
function parseHex(hex) {
    let value = hex.replace('#', '');
    if (value.length === 3) value = [...value].map(c => c + c).join('');
    const n = parseInt(value, 16);
    return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}
    function wrapLetterLines(l) {
        var raw = String(l == null ? '' : l);
        var t = raw.trim();

        if (!t || /^\d+$/.test(t) || t.length <= 14) return [raw];

        var n = t.length > 28 ? 3 : 2;
        var words = t.split(/\s+/);

        if (words.length === 1) {
            var per = Math.ceil(t.length / n), out = [];
            for (var i = 0; i < t.length; i += per) out.push(t.substr(i, per));
            return out;
        }

        var target = Math.ceil(t.length / n), lines = [], cur = '';
        for (var k = 0; k < words.length; k++) {
            var w = words[k];
            if (!cur) { cur = w; continue; }

            if ((cur + ' ' + w).length <= target || lines.length === n - 1) {
                cur += ' ' + w;
            } else {
                lines.push(cur);
                cur = w;
            }
        }
        if (cur) lines.push(cur);
        return lines;
    }

var heroLayer = null, heroWord = null;
var HERO_FONT_100 = "400 100px 'TD Forward Slash', Coiny, 'Baloo 2', sans-serif";
var HERO_LINE_HEIGHT = 1;
function ensureHeroLayer() {
    if (heroLayer && document.body.contains(heroLayer)) return;
    heroLayer = document.createElement('div');
    heroLayer.className = 'td-hero-center';
    heroWord = document.createElement('h1');
    heroWord.className = 'td-hero-word';
    heroLayer.appendChild(heroWord);
    document.body.appendChild(heroLayer);
}
function setParticleCanvasVisible(hien) {
    var cv = document.querySelector('.canvas');
    if (cv) cv.style.display = hien ? 'block' : 'none';
}
function hideHeroText() {
    if (heroLayer) heroLayer.style.display = 'none';
}
var HERO_MAU = {
    f0:    [94, 100], f1: [80, 100], f2: [67, 100], f3: [52, 85],
    depth: [65, 100], s1: [46, 80],  s2: [35, 85],  s3: [22, 88],
    glow:  [62, 100]
};
function hexSangHsl(hex) {
    var c = parseHex(hex);
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    var l = (mx + mn) / 2;
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    var h = 0;
    if (d) {
        if (mx === r) h = ((g - b) / d) % 6;
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
    }
    return { h: h, s: s * 100, l: l * 100 };
}
function hslSangRgb(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
function rgbSangHex(a) {
    return '#' + a.map(function (v) { return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'); }).join('');
}
var heroPalCache = null;
function heroPalette() {
    var st = window.settings || (typeof settings !== 'undefined' ? settings : null) || {};
    var goc = st.sequenceColor || '#ff69b4';
    if (heroPalCache && heroPalCache.khoa === goc) return heroPalCache;
    var k = hexSangHsl(goc);
    var out = { khoa: goc };
    for (var ten in HERO_MAU) {
        var m = HERO_MAU[ten];
        var rgb = hslSangRgb(k.h, Math.min(k.s, m[1]), m[0]);
        out[ten] = rgbSangHex(rgb);
        if (ten === 'glow') out.glowRgb = rgb.join(',');
    }
    heroPalCache = out;
    return out;
}
var heroProbeCtx = null;
function heroProbe() {
    if (!heroProbeCtx) heroProbeCtx = document.createElement('canvas').getContext('2d');
    return heroProbeCtx;
}
var heroScanCv = null;
function heroDoDayDau(lineText, nhoLenThanChu) {
    if (nhoLenThanChu == null) return null;
    var W = 1400, H = 400, BASE = 300;
    if (!heroScanCv) {
        heroScanCv = document.createElement('canvas');
        heroScanCv.width = W; heroScanCv.height = H;
    }
    var c = heroScanCv.getContext('2d');
    c.clearRect(0, 0, W, H);
    c.font = HERO_FONT_100;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'center';
    c.fillStyle = '#fff';
    c.fillText(lineText, W / 2, BASE);
    var yDinhThan = Math.floor(BASE - nhoLenThanChu);
    if (yDinhThan <= 1) return null;
    var d;
    try { d = c.getImageData(0, 0, W, yDinhThan).data; } catch (e) { return null; }
    for (var y = yDinhThan - 1; y >= 0; y--) {
        for (var x = 0; x < W; x += 2) {
            if (d[((y * W) + x) * 4 + 3] > 40) return BASE - y;
        }
    }
    return null;
}
var currentText = '';
function showHeroText(text) {
    currentText = String(text ?? '');
    ensureHeroLayer();
    heroLayer.style.display = 'flex';
    const viewport = window.TeacherTextLayout.viewport();
    heroLayer.style.left = viewport.x + 'px';
    heroLayer.style.top = viewport.y + 'px';
    heroLayer.style.width = viewport.w + 'px';
    heroLayer.style.height = viewport.h + 'px';
    var bm = heroPalette();
    heroWord.style.setProperty('--bw-f0', bm.f0);
    heroWord.style.setProperty('--bw-f1', bm.f1);
    heroWord.style.setProperty('--bw-f2', bm.f2);
    heroWord.style.setProperty('--bw-f3', bm.f3);
    heroWord.style.setProperty('--bw-depth', bm.depth);
    heroWord.style.setProperty('--bw-s1', bm.s1);
    heroWord.style.setProperty('--bw-s2', bm.s2);
    heroWord.style.setProperty('--bw-s3', bm.s3);
    heroWord.style.setProperty('--bw-glow-rgb', bm.glowRgb);
    var raw = String(text == null ? '' : text);
    if (raw.normalize) raw = raw.normalize('NFC');
    if (!raw.trim()) { hideHeroText(); return; }
    var lines = wrapLetterLines(raw);
    while (heroWord.firstChild) heroWord.removeChild(heroWord.firstChild);
    ['bw-depth', 'bw-face'].forEach(function (cls) {
        var lop = document.createElement('span');
        lop.className = cls;
        if (cls === 'bw-depth') lop.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < lines.length; i++) {
            if (i) lop.appendChild(document.createElement('br'));
            lop.appendChild(document.createTextNode(lines[i]));
        }
        heroWord.appendChild(lop);
    });
    var doBe = heroProbe();
    doBe.font = HERO_FONT_100;
    doBe.textBaseline = 'alphabetic';
    var rong100 = 1;
    for (var j = 0; j < lines.length; j++) {
        var w = doBe.measureText(lines[j]).width;
        if (w > rong100) rong100 = w;
    }
    var mTren = doBe.measureText(lines[0]);
    var mDuoi = doBe.measureText(lines[lines.length - 1]);
    var nhoLen  = mTren.actualBoundingBoxAscent  || 74;
    var thutXuong = mDuoi.actualBoundingBoxDescent || 21;
    var LH100 = 100 * HERO_LINE_HEIGHT;
    var caoMuc100 = (lines.length - 1) * LH100 + nhoLen + thutXuong;
    var vw, vh;
    var csHero = window.getComputedStyle(heroLayer);
    vw = heroLayer.clientWidth
        - (parseFloat(csHero.paddingLeft) || 0) - (parseFloat(csHero.paddingRight) || 0);
    vh = heroLayer.clientHeight
        - (parseFloat(csHero.paddingTop) || 0) - (parseFloat(csHero.paddingBottom) || 0);
    if (!(vw > 0)) vw = window.innerWidth;
    if (!(vh > 0)) vh = window.innerHeight;
    var coChu = Math.min(
        260 * (window.innerHeight <= 500 && window.innerWidth > window.innerHeight ? window.innerHeight / 800 : 1),
        vw / rong100 * 100,
        (vh * 0.86) / caoMuc100 * 100
    );
    coChu = Math.max(12, coChu);
    heroWord.style.fontSize = coChu.toFixed(1) + 'px';
    var tyLe = coChu / 100;
    var fbAsc = mTren.fontBoundingBoxAscent;
    var fbDesc = mTren.fontBoundingBoxDescent;
    var caoKhungChu = lines.length * LH100 * tyLe;
    var demTren = 0, demDuoi = 0;
    if (fbAsc != null && fbDesc != null) {
        var nuaLeading = (LH100 - (fbAsc + fbDesc)) / 2;
        var baselineDau = (nuaLeading + fbAsc) * tyLe;
        var baselineCuoi = baselineDau + (lines.length - 1) * LH100 * tyLe;
        demTren = Math.max(0, nhoLen * tyLe - baselineDau);
        demDuoi = Math.max(0, baselineCuoi + thutXuong * tyLe - caoKhungChu);
        var H = demTren + caoKhungChu + demDuoi;
        var khongDau = lines[0].normalize
            ? lines[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            : lines[0];
        var nhoLenThan = doBe.measureText(khongDau).actualBoundingBoxAscent || nhoLen;
        var yDinhThan = demTren + baselineDau - nhoLenThan * tyLe;
        var dayDau = heroDoDayDau(lines[0], nhoLenThan);
        var yDayDau = (dayDau != null)
            ? demTren + baselineDau - dayDau * tyLe
            : yDinhThan;
        var a = H > 0 ? Math.max(0, Math.min(70, yDinhThan / H * 100)) : 0;
        var m = H > 0 ? Math.max(0, Math.min(a, yDayDau / H * 100)) : 0;
        heroWord.style.setProperty('--ink-pad-top', demTren.toFixed(1) + 'px');
        heroWord.style.setProperty('--ink-pad-bottom', demDuoi.toFixed(1) + 'px');
        heroWord.style.setProperty('--grad-m', m.toFixed(2) + '%');
        heroWord.style.setProperty('--grad-a', a.toFixed(2) + '%');
        heroWord.style.setProperty('--grad-b', (a + 22 * (100 - a) / 100).toFixed(2) + '%');
        heroWord.style.setProperty('--grad-c', (a + 55 * (100 - a) / 100).toFixed(2) + '%');
    } else {
        heroWord.style.setProperty('--ink-pad-top', '0px');
        heroWord.style.setProperty('--ink-pad-bottom', '0px');
        heroWord.style.setProperty('--grad-m', '0%');
        heroWord.style.setProperty('--grad-a', '0%');
        heroWord.style.setProperty('--grad-b', '22%');
        heroWord.style.setProperty('--grad-c', '55%');
    }
    heroWord.classList.remove('is-in');
    void heroWord.offsetWidth;
    heroWord.classList.add('is-in');
}

window.TeacherText = {
    isModern,
    show: showHeroText,
    hide: hideHeroText,
    refresh() {
        document.body.classList.toggle('td-modern-text', isModern());
        setParticleCanvasVisible(!isModern());
        hideHeroText();
    }
};
function refit() {
    if (heroLayer && heroLayer.style.display !== 'none' && isModern()) showHeroText(currentText);
}
window.addEventListener('resize', refit);
window.visualViewport?.addEventListener('resize', refit);
window.visualViewport?.addEventListener('scroll', refit);
if (document.fonts) {
    Promise.all([document.fonts.load(HERO_FONT_100, 'THẦY CÔ NGUYỄN 20/11'), document.fonts.load('800 30px "Baloo 2"')]).then(refit).catch(() => {});
}
})();
