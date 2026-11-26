import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.diskRotationSpeed = 0.0015;
        this.innerDiskRotationSpeed = 0.0022;
        this.textureRotationSpeed = 0.002;
        this.colors = {
            background: '#ffffff',
            inner: '#ff85c0',
            middle: '#ffccf2',
            outer: '#b388ff'
        };
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this._buildDisks();
    }

    _createRingPoints(count, rMin, rMax, ySpread, colorHex, size) {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = rMin + Math.random() * (rMax - rMin);
            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = (Math.random() - 0.5) * ySpread;
            positions[i * 3 + 2] = Math.sin(angle) * r;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: new THREE.Color(colorHex),
            size,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return new THREE.Points(geo, mat);
    }

    _buildDisks() {
        this.bgStars = this._createRingPoints(2500, 350, 1400, 900, this.colors.background, 2.2);
        this.innerDisk = this._createRingPoints(2200, 75, 130, 10, this.colors.inner, 2.0);
        this.middleDisk = this._createRingPoints(2800, 135, 210, 14, this.colors.middle, 1.8);
        this.outerDisk = this._createRingPoints(2200, 215, 310, 20, this.colors.outer, 1.6);

        this.group.add(this.bgStars);
        this.group.add(this.innerDisk);
        this.group.add(this.middleDisk);
        this.group.add(this.outerDisk);
    }

    updateColors(bgColor, diskColor, innerDiskColor, outermostColor) {
        if (bgColor && this.bgStars) this.bgStars.material.color.set(bgColor);
        if (innerDiskColor && this.innerDisk) this.innerDisk.material.color.set(innerDiskColor);
        if (diskColor && this.middleDisk) this.middleDisk.material.color.set(diskColor);
        if (outermostColor && this.outerDisk) this.outerDisk.material.color.set(outermostColor);
    }

    updateDiskRotationSpeed(speed) {
        this.diskRotationSpeed = Number(speed) || 0.0015;
    }

    updateInnerDiskRotationSpeed(speed) {
        this.innerDiskRotationSpeed = Number(speed) || 0.0022;
    }

    updateTextureRotationSpeed(speed) {
        this.textureRotationSpeed = Number(speed) || 0.002;
    }

    animate() {
        if (this.innerDisk) this.innerDisk.rotation.y += this.innerDiskRotationSpeed;
        if (this.middleDisk) this.middleDisk.rotation.y += this.diskRotationSpeed;
        if (this.outerDisk) this.outerDisk.rotation.y += this.diskRotationSpeed * 0.7;
        if (this.bgStars) this.bgStars.rotation.y += 0.0003;
    }
}
