
(function() {
  if (!window.THREE) return;
  THREE.Pass = function() {
    this.enabled = true;
    this.needsSwap = true;
    this.clear = false;
    this.renderToScreen = false;
  };
  THREE.RenderPass = function(scene, camera) {
    THREE.Pass.call(this);
    this.scene = scene;
    this.camera = camera;
  };
  THREE.UnrealBloomPass = function(resolution, strength, radius, threshold) {
    THREE.Pass.call(this);
    this.resolution = resolution;
    this.strength = strength !== undefined ? strength : 1;
    this.radius = radius !== undefined ? radius : 0;
    this.threshold = threshold !== undefined ? threshold : 0;
  };
  THREE.EffectComposer = function(renderer) {
    this.renderer = renderer;
    this.passes = [];
    this.addPass = function(pass) { this.passes.push(pass); };
    this.setSize = function(w, h) {};
    this.setPixelRatio = function( dpr ) {};
    this.render = function() {
      for (var i = 0; i < this.passes.length; i++) {
        var p = this.passes[i];
        if (p && p.scene && p.camera && this.renderer) {
          this.renderer.render(p.scene, p.camera);
        }
      }
    };
  };
})();
