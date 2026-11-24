/* One letter input, split into the existing viewer/API fields without losing text. */
(function (root) {
    'use strict';
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('vi', {granularity: 'grapheme'}) : null;
    const length = text => segmenter ? [...segmenter.segment(text)].length : [...text.normalize('NFC')].length;
    function parse(value) {
        const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
        const lines = text.split('\n');
        const nonempty = lines.map((line, index) => line.trim() ? index : -1).filter(index => index >= 0);
        let title = '', signature = '';
        if (nonempty.length >= 2) {
            const first = nonempty[0], last = nonempty.at(-1);
            if (length(lines[first].trim()) < 40) { title = lines[first].trim(); lines[first] = ''; }
            if (length(lines[last].trim()) <= 15) { signature = lines[last].trim(); lines[last] = ''; }
        }
        return {letterTitle: title, letterContent: lines.join('\n').trim(), letterSignature: signature};
    }
    function compose(fields) {
        return [fields.letterTitle, fields.letterContent, fields.letterSignature].filter(Boolean).join('\n\n');
    }
    const api = {parse, compose};
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TeacherLetterDraft = api;
})(typeof window === 'undefined' ? globalThis : window);
