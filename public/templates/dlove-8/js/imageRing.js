import * as THREE from 'three';

export class FlowerRingSystem {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.rotationSpeed = 0.0025;
        this.flyingConfig = { floatSpeed: 1.0 };
        this.isFlying = false;
        this.isPaused = false;
        this.flowerTextures = [];
        this.sprites = [];
        this.loader = new THREE.TextureLoader();

        const initialUrls = (window.LOVEGIFT_IMAGES && window.LOVEGIFT_IMAGES.length)
            ? window.LOVEGIFT_IMAGES
            : [
                '/demo/photos/1.jpg',
                '/demo/photos/2.jpg',
                '/demo/photos/3.jpg',
                '/demo/photos/4.jpg',
                '/demo/photos/5.jpg',
                '/demo/photos/6.jpg'
            ];

        this._createSprites(18);
        this.preloadTextures(initialUrls).then(() => {
            this.randomizeFlowerTextures();
        });
    }

    _createSprites(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 115 + (i % 3) * 28;
            const y = ((i % 5) - 2) * 8;
            const mat = new THREE.SpriteMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.95
            });
            const sprite = new THREE.Sprite(mat);
            sprite.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
            sprite.scale.set(22, 22, 1);
            sprite.userData = {
                basePos: sprite.position.clone(),
                phase: Math.random() * Math.PI * 2,
                flyVel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.6,
                    0.35 + Math.random() * 0.5,
                    (Math.random() - 0.5) * 0.6
                )
            };
            this.group.add(sprite);
            this.sprites.push(sprite);
        }
    }

    preloadTextures(urls) {
        if (!Array.isArray(urls) || urls.length === 0) return Promise.resolve([]);
        const tasks = urls.map(url => new Promise(resolve => {
            this.loader.load(
                url,
                tex => resolve(tex),
                undefined,
                () => resolve(null)
            );
        }));
        return Promise.all(tasks).then(loaded => {
            const valid = loaded.filter(Boolean);
            if (valid.length > 0) {
                this.flowerTextures = valid;
            }
            return this.flowerTextures;
        });
    }

    randomizeFlowerTextures() {
        if (!this.flowerTextures.length) return;
        this.sprites.forEach((s, idx) => {
            const tex = this.flowerTextures[idx % this.flowerTextures.length];
            s.material.map = tex;
            s.material.needsUpdate = true;
        });
    }

    randomizeFlowerTexturesWithCache() {
        this.randomizeFlowerTextures();
    }

    updateRotationSpeed(speed) {
        this.rotationSpeed = Number(speed) || 0.0025;
    }

    triggerFlyingEffect() {
        this.isFlying = true;
        this.isPaused = false;
    }

    toggleFlyingPause() {
        this.isPaused = !this.isPaused;
    }

    animate() {
        if (!this.isPaused) {
            this.group.rotation.y += this.rotationSpeed;
        }
        if (this.isFlying && !this.isPaused) {
            const speed = this.flyingConfig.floatSpeed || 1.0;
            this.sprites.forEach(s => {
                s.position.y += s.userData.flyVel.y * speed;
                if (s.position.y > 180) {
                    s.position.y = -120;
                }
            });
        }
    }
}
