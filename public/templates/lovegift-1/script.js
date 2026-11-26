(function () {
  if (!window.THREE) return;
  var container = document.getElementById('three-container') || document.getElementById('container');
  if (!container) return;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 6, 42);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  // Glowing Heart Particles
  var count = 2400;
  var positions = new Float32Array(count * 3);
  var colors = new Float32Array(count * 3);
  var baseColor = new THREE.Color((window.settings && window.settings.color) || '#ff4f86');

  for (var i = 0; i < count; i++) {
    var t = Math.random() * Math.PI * 2;
    var r = 0.55 + Math.random() * 0.45;
    var x = 16 * Math.pow(Math.sin(t), 3) * r * 0.65;
    var y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r * 0.65;
    var z = (Math.random() - 0.5) * 8;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    colors[i * 3] = baseColor.r;
    colors[i * 3 + 1] = baseColor.g;
    colors[i * 3 + 2] = baseColor.b;
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  var mat = new THREE.PointsMaterial({
    size: 0.48,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  var heartMesh = new THREE.Points(geo, mat);
  scene.add(heartMesh);

  // Orbiting Photos
  var photoGroup = new THREE.Group();
  scene.add(photoGroup);
  var photos = (window.settings && Array.isArray(window.settings.images) && window.settings.images.length)
    ? window.settings.images
    : (window.LOVEGIFT_IMAGES || ['/demo/photos/1.jpg', '/demo/photos/2.jpg', '/demo/photos/3.jpg', '/demo/photos/4.jpg']);
  var loader = new THREE.TextureLoader();
  photos.slice(0, 6).forEach(function (url, idx) {
    var angle = (idx / Math.min(6, photos.length)) * Math.PI * 2;
    var radius = 18;
    loader.load(url, function (tex) {
      var spMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      var sp = new THREE.Sprite(spMat);
      sp.position.set(Math.cos(angle) * radius, Math.sin(idx * 1.3) * 3, Math.sin(angle) * radius);
      sp.scale.set(5.5, 5.5, 1);
      photoGroup.add(sp);
    });
  });

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var elapsed = clock.getElapsedTime();
    var pulse = 1 + Math.sin(elapsed * 2.6) * 0.06;
    heartMesh.scale.set(pulse, pulse, pulse);
    heartMesh.rotation.y = Math.sin(elapsed * 0.4) * 0.35;
    photoGroup.rotation.y = elapsed * 0.28;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
