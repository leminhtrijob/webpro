/* Keep the envelope and open letter aligned with Safari's visible viewport. */
(function () {
    function sync() {
        const area = window.TeacherTextLayout.viewport();
        const style = document.documentElement.style;
        style.setProperty('--td-view-width', area.w + 'px');
        style.setProperty('--td-view-height', area.h + 'px');
        style.setProperty('--td-view-left', area.x + 'px');
        style.setProperty('--td-view-top', area.y + 'px');
    }
    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
})();
