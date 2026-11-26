import * as THREE from 'three';

export class Heart {
    constructor(scene) {
        this.scene = scene;
        this.clock = new THREE.Clock();
        this.mesh = this._createHeartMesh();
        this.scene.add(this.mesh);
        window.heart3D = this.mesh;
        setTimeout(() => {
            document.dispatchEvent(new Event('heart3d_ready'));
        }, 50);
    }

    _createHeartMesh() {
        const x = 0, y = 0;
        const heartShape = new THREE.Shape();
        heartShape.moveTo(x + 5, y + 5);
        heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
        heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
        heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
        heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
        heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
        heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

        const extrudeSettings = {
            depth: 4,
            bevelEnabled: true,
            bevelSegments: 5,
            steps: 2,
            bevelSize: 1.5,
            bevelThickness: 1.5
        };

        const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
        geometry.center();
        geometry.rotateZ(Math.PI);

        const material = new THREE.MeshStandardMaterial({
            color: 0xff2a7a,
            emissive: 0xff1464,
            emissiveIntensity: 0.65,
            roughness: 0.25,
            metalness: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(2.2, 2.2, 2.2);
        mesh.position.set(0, 0, 0);
        return mesh;
    }

    animate() {
        if (!this.mesh) return;
        const t = this.clock.getElapsedTime();
        this.mesh.rotation.y = t * 0.6;
        const pulse = 2.1 + Math.sin(t * 3.2) * 0.16;
        this.mesh.scale.set(pulse, pulse, pulse);
    }
}
