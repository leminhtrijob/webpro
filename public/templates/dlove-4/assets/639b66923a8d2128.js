/**
 * CẤU HÌNH - Tạo từ config-editor.html
 * File này sẽ được tạo tự động khi download từ config-editor.html
 * Nếu không có file này, website sẽ dùng cấu hình mặc định
 */
(function(){
'use strict';
// Cấu hình mặc định - sẽ được override nếu có config từ config-editor
window.APP_CONFIG = window.APP_CONFIG || {};
window.HEART_MESSAGE_CONFIG = window.APP_CONFIG.heart || {};
})();
