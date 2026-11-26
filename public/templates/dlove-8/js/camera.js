import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraController {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.camera.position.set(0, 75, 290);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 60;
        this.controls.maxDistance = 950;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.6;
    }

    triggerAnimation() {
        if (window.gsap) {
            window.gsap.to(this.camera.position, {
                x: 0,
                y: 35,
                z: 195,
                duration: 2.2,
                ease: 'power2.out'
            });
        }
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    update() {
        if (this.controls) {
            this.controls.update();
        }
    }
}
