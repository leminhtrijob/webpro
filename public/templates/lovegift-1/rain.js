(function () {
  // Mưa lời yêu thương rơi nhẹ nhàng trong không gian
  var container = document.getElementById('container');
  if (!container) return;
  var msgs = (window.settings && Array.isArray(window.settings.messages) && window.settings.messages.length)
    ? window.settings.messages
    : ['Luôn bên nhau ♡', 'Yêu em nhiều lắm 💖', 'Mãi là của nhau ✨', 'Thương em nhất trên đời 💕'];

  var layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:4;';
  container.appendChild(layer);

  function spawnText() {
    if (document.hidden) return;
    var el = document.createElement('div');
    el.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    var left = 5 + Math.random() * 82;
    var dur = 6 + Math.random() * 5;
    el.style.cssText =
      'position:absolute;top:-40px;left:' + left + '%;color:#ffd6e7;font-weight:700;font-size:' +
      (13 + Math.random() * 6) + 'px;text-shadow:0 0 12px rgba(255,79,134,0.85);white-space:nowrap;' +
      'transition:transform ' + dur + 's linear, opacity ' + dur + 's ease-in;opacity:0.92;';
    layer.appendChild(el);
    requestAnimationFrame(function () {
      el.style.transform = 'translateY(' + (window.innerHeight + 80) + 'px)';
      el.style.opacity = '0.15';
    });
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, dur * 1000);
  }

  setInterval(spawnText, 1100);
})();
