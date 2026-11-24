// Generated from DLove integrations/marketing/browser.mjs + build-womensday.mjs.
// Load synchronously before SSO so its URL snapshot cannot restore the transfer parameter.
(function () {
'use strict';
if (window.dloveMarketing) return;
// DLove marketing v1. Keep the copies in both frontend projects identical.
// No customer content, account tokens, gift URLs, email or phone is collected.
const PIXEL_ID = '2492674047808776';
const TTL = 30 * 86400000, SESSION_TTL = 30 * 60000;
const KEY = 'dlove_marketing_v1';
const ID = /^[a-zA-Z0-9_-]{16,64}$/;
const fields = ['source', 'medium', 'campaign', 'content', 'campaignId', 'adsetId', 'adId'];
const clean = value => typeof value === 'string' ? value.replace(/[\x00-\x1f<>]/g, '').slice(0, 80) : '';

function createMarketingTracker({ apiBase, surface, enabled = true, env = globalThis }) {
    let state, lastPage = '', lastPixelPage = '', pixelLoaded = false;
    const once = new Set();
    const now = () => Date.now();
    const uuid = () => env.crypto.randomUUID();
    const read = (storage, key) => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } };
    const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch { /* memory fallback */ } };
    const cookie = name => {
        try { return decodeURIComponent((env.document.cookie.split('; ').find(s => s.startsWith(name + '=')) || '').slice(name.length + 1)); }
        catch { return ''; }
    };
    const putCookie = (name, value, seconds) => {
        try {
            const domain = /(^|\.)dlove\.vn$/.test(env.location.hostname) ? '; Domain=dlove.vn' : '';
            env.document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${seconds}; SameSite=Lax; Secure${domain}`;
        } catch { /* blocked cookies */ }
    };
    function touch(value) {
        if (!value || !Number.isFinite(value.at) || value.at > now() + 300000 || now() - value.at > TTL) return null;
        return { ...Object.fromEntries(fields.map(k => [k, clean(value[k])])), at: value.at };
    }
    function valid(value) {
        if (!value || !ID.test(value.visitorId || '') || !touch(value.lastTouch)) return null;
        return { visitorId: value.visitorId, firstTouch: touch(value.firstTouch) || touch(value.lastTouch),
            lastTouch: touch(value.lastTouch), fbc: /^fb\.\d+\.\d+\.[a-zA-Z0-9_-]+$/.test(value.fbc || '') ? value.fbc.slice(0, 512) : '',
            fbp: /^fb\.\d+\.\d+\.\d+$/.test(value.fbp || '') ? value.fbp.slice(0, 128) : '' };
    }
    function persist() {
        write(env.localStorage, KEY, state);
        const json = JSON.stringify(state);
        if (encodeURIComponent(json).length < 3500) putCookie(KEY, json, TTL / 1000);
        putCookie('dlove_visitor', state.visitorId, TTL / 1000);
    }
    function capture() {
        if (!enabled) return null;
        const url = new URL(env.location.href);
        if (!state) {
            let shared = null, incoming = null;
            try { shared = valid(JSON.parse(cookie(KEY))); } catch { /* no shared cookie */ }
            try { if ((url.searchParams.get('dlm') || '').length <= 6000) incoming = valid(JSON.parse(url.searchParams.get('dlm'))); } catch { /* invalid transfer */ }
            const local = valid(read(env.localStorage, KEY));
            state = [shared, local, incoming].filter(Boolean).sort((a, b) => b.lastTouch.at - a.lastTouch.at)[0] || null;
            // Transfer carries the same visitor across main and child origins.
            if (incoming) {
                state = { ...state, visitorId: incoming.visitorId };
                try {
                    const transferred = JSON.parse(url.searchParams.get('dlm'));
                    if (ID.test(transferred.sessionId || '')) write(env.sessionStorage, KEY + '_session', { id: transferred.sessionId, at: now() });
                } catch { /* invalid session */ }
            }
            if (url.searchParams.has('dlm')) {
                url.searchParams.delete('dlm');
                env.history.replaceState(env.history.state, '', url.pathname + url.search + url.hash);
            }
        }
        let source = clean(url.searchParams.get('utm_source')).toLowerCase();
        source = ({ fb: 'facebook', ig: 'instagram' })[source] || source;
        const fbclid = url.searchParams.get('fbclid');
        let medium = clean(url.searchParams.get('utm_medium')).toLowerCase();
        if (!source && fbclid) { source = 'facebook'; medium = 'unknown'; }
        if (!source && !state) {
            try {
                const host = new URL(env.document.referrer).hostname;
                if (/(^|\.)facebook\.com$/.test(host)) { source = 'facebook'; medium = 'organic_social'; }
                else if (/(^|\.)tiktok\.com$/.test(host)) { source = 'tiktok'; medium = 'organic_social'; }
                else if (!/(^|\.)dlove\.vn$/.test(host)) { source = host; medium = 'referral'; }
            } catch { /* direct */ }
        }
        const entry = {
            source: source || 'direct', medium: medium || (source ? 'unknown' : 'none'),
            campaign: clean(url.searchParams.get('utm_campaign')), content: clean(url.searchParams.get('utm_content')),
            campaignId: clean(url.searchParams.get('utm_id') || url.searchParams.get('campaign_id')),
            adsetId: clean(url.searchParams.get('adset_id')), adId: clean(url.searchParams.get('ad_id')), at: now(),
        };
        if (!state || !touch(state.lastTouch)) {
            const existingId = cookie('dlove_visitor');
            state = { visitorId: ID.test(existingId) ? existingId : uuid(), firstTouch: entry, lastTouch: entry, fbc: '', fbp: '' };
        } else if (source) {
            // Capture a URL once; calling getAttribution must not extend the window.
            const key = url.href;
            if (!once.has(key)) { state.lastTouch = entry; once.add(key); }
        }
        if (fbclid && /^[a-zA-Z0-9_-]{1,450}$/.test(fbclid) && !state.fbc?.endsWith('.' + fbclid)) state.fbc = `fb.1.${now()}.${fbclid}`;
        if (source) once.add(url.href);
        const fbp = cookie('_fbp');
        if (/^fb\.\d+\.\d+\.\d+$/.test(fbp)) state.fbp = fbp;
        persist();
        return state;
    }
    function getAttribution() {
        if (!enabled) return null;
        try {
            capture();
            let session = read(env.sessionStorage, KEY + '_session');
            try {
                const shared = JSON.parse(cookie('dlove_session'));
                if (shared?.at > (session?.at || 0)) session = shared;
            } catch { /* local session */ }
            if (!session || !ID.test(session.id || '') || now() - session.at > SESSION_TTL) session = { id: uuid() };
            session.at = now();
            write(env.sessionStorage, KEY + '_session', session);
            putCookie('dlove_session', JSON.stringify(session), SESSION_TTL / 1000);
            return { ...state, sessionId: session.id };
        } catch { return null; } // analytics must never break checkout
    }
    function decorateLink(href) {
        try {
            const value = getAttribution();
            const url = new URL(href, env.location.href);
            if (value && /(^|\.)dlove\.vn$/.test(url.hostname)) url.searchParams.set('dlm', JSON.stringify(value));
            return url.toString();
        } catch { return href; }
    }
    function allowPixel() {
        // Meta's browser SDK reads the URL. Do not load it while SSO tokens or
        // private gift identifiers are in the query string.
        const safe = /^(utm_[a-z_]+|fbclid|campaign_id|adset_id|ad_id|legacy|ref|lang)$/;
        return [...new URL(env.location.href).searchParams.keys()].every(k => safe.test(k));
    }
    function sendPixel(name, data = {}, eventId) {
        if (!enabled || !allowPixel()) return;
        if (!pixelLoaded) {
            if (!env.fbq) {
                const q = function () { q.callMethod ? q.callMethod.apply(q, arguments) : q.queue.push(arguments); };
                q.push = q; q.loaded = true; q.version = '2.0'; q.queue = [];
                env.fbq = q; if (!env._fbq) env._fbq = q;
                const script = env.document.createElement('script'); script.async = true;
                script.src = 'https://connect.facebook.net/en_US/fbevents.js';
                env.document.head.appendChild(script);
            }
            env.fbq('set', 'autoConfig', false, PIXEL_ID);
            env.fbq('init', PIXEL_ID);
            pixelLoaded = true;
        }
        env.fbq('consent', 'grant');
        env.fbq(name === 'GiftCreated' ? 'trackCustom' : 'track', name, data, eventId ? { eventID: eventId } : undefined);
    }
    function pixel(...args) {
        try { sendPixel(...args); } catch { /* an extension / blocked SDK must not break checkout */ }
    }
    function trackPage(path) {
        const marketing = getAttribution();
        if (!marketing) return;
        path = path || env.location.pathname;
        const key = path + JSON.stringify(marketing.lastTouch);
        if (key !== lastPage) {
            lastPage = key;
            const body = JSON.stringify({ eventId: uuid(), marketing, surface, path });
            const send = () => env.fetch(`${apiBase}/marketing/visits`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
            }).then(r => { if (!r.ok) throw new Error('visit'); });
            Promise.resolve().then(send).catch(() => env.setTimeout(() => Promise.resolve().then(send).catch(() => {}), 1500));
        }
        if (key !== lastPixelPage && allowPixel()) { pixel('PageView'); lastPixelPage = key; }
    }
    function trackCreated(result) {
        if (!result?.orderCode || once.has('order:' + result.orderCode)) return;
        once.add('order:' + result.orderCode);
        pixel('GiftCreated', {}, 'created_' + result.orderCode);
        if (result.needsPayment) pixel('InitiateCheckout', { value: result.price, currency: result.currency }, 'checkout_' + result.orderCode);
        // Purchase comes only from backend PAID payments via CAPI.
    }
    function suspendPixel() {
        try { if (pixelLoaded) env.fbq('consent', 'revoke'); } catch { /* blocked SDK */ }
        lastPage = ''; lastPixelPage = '';
    }
    return { capture: getAttribution, getAttribution, decorateLink, trackPage, trackCreated, suspendPixel };
}

const params = new URLSearchParams(location.search);
window.dloveMarketing = createMarketingTracker({
    apiBase: 'https://apiv2.deargift.online/api/v2', surface: 'creator',
    enabled: location.protocol === 'https:' && location.hostname === 'w.dlove.vn'
        && location.pathname === '/config.html' && !navigator.webdriver
        && !params.has('partner') && !params.has('token'),
});
window.dloveMarketing.capture();
window.dloveMarketing.trackPage();
})();
