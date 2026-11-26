(function () {
  var intro = document.getElementById('intro');
  var btn = document.getElementById('intro-btn');
  var canvas = document.getElementById('intro-rose-canvas');

  if (canvas && canvas.getContext) {
    canvas.width = 220;
    canvas.height = 220;
    var ctx = canvas.getContext('2d');
    var t = 0;
    function drawRose() {
      if (!ctx) return;
      ctx.clearRect(0, 0, 220, 220);
      ctx.save();
      ctx.translate(110, 110);
      for (var i = 0; i < 18; i++) {
        var angle = (i / 18) * Math.PI * 2 + t * 0.015;
        var r = 18 + (i % 4) * 14 + Math.sin(t * 0.04 + i) * 3;
        ctx.save();
        ctx.rotate(angle);
        var grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        grad.addColorStop(0, 'rgba(255, 220, 235, 0.95)');
        grad.addColorStop(0.6, 'rgba(255, 65, 130, 0.78)');
        grad.addColorStop(1, 'rgba(180, 15, 75, 0.15)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(r * 0.45, 0, r * 0.55, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      t++;
      if (document.body.classList.contains('intro-open')) {
        requestAnimationFrame(drawRose);
      }
    }
    drawRose();
  }

  function openGift() {
    if (!intro) return;
    intro.classList.add('is-opening');
    document.body.classList.remove('intro-open');
    setTimeout(function () {
      intro.style.display = 'none';
    }, 650);
  }

  if (intro) {
    intro.classList.add('is-ready');
  }
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Chạm để mở quà ♡';
    btn.addEventListener('click', openGift);
  }
})();
