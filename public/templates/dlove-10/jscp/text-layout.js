/* Shared CSS-pixel viewport and measured line layout for greeting text. */
(function () {
    'use strict';
    function viewport() {
        const v = window.visualViewport;
        const visible = v && (!v.scale || Math.abs(v.scale - 1) < .01);
        return {
            w: Math.max(1, Math.round(visible ? v.width : window.innerWidth)),
            h: Math.max(1, Math.round(visible ? v.height : window.innerHeight)),
            x: visible ? v.offsetLeft || 0 : 0,
            y: visible ? v.offsetTop || 0 : 0,
        };
    }
    function wrap(text, context, maxWidth) {
        const lines = [];
        const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('vi', {granularity: 'grapheme'}) : null;
        for (const paragraph of text.split(/\r?\n/)) {
            let line = '';
            for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
                const candidate = line ? line + ' ' + word : word;
                if (context.measureText(candidate).width <= maxWidth) { line = candidate; continue; }
                if (line) { lines.push(line); line = ''; }
                const letters = segmenter ? Array.from(segmenter.segment(word), item => item.segment) : Array.from(word);
                for (const letter of letters) {
                    if (line && context.measureText(line + letter).width > maxWidth) { lines.push(line); line = ''; }
                    line += letter;
                }
            }
            lines.push(line);
        }
        return lines;
    }
    function particle(text, context, area, family) {
        text = String(text ?? '').normalize('NFC');
        const maxWidth = area.w * .88, maxHeight = area.h * .78;
        const single = /^\d+(?:[/.:-]\d+)*$/.test(text.trim());
        let size = Math.min(180, area.w * .17, area.h * (single ? .58 : .34));
        let lines, lineHeight, height;
        for (;;) {
            context.font = 'bold ' + size + 'px ' + family;
            lines = single ? [text.trim()] : wrap(text, context, maxWidth);
            lineHeight = size * 1.18;
            height = (lines.length - 1) * lineHeight + size;
            if ((height <= maxHeight && lines.every(line => context.measureText(line).width <= maxWidth)) || size <= 8) break;
            size *= .94;
        }
        return {lines, size, lineHeight, height};
    }
    window.TeacherTextLayout = {viewport, particle};
})();
