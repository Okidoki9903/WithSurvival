// Every visible item (stacks, piles, flying loot) is drawn through one
// InstancedMesh per item type, rebuilt each frame.
import * as THREE from 'three';
import { itemGeometry, ITEM_TYPES } from './models.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

export class ItemRenderer {
  constructor(scene, cap = 2500) {
    this.meshes = {};
    this.counts = {};
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const type of ITEM_TYPES) {
      const im = new THREE.InstancedMesh(itemGeometry(type), material, cap);
      im.castShadow = true; im.receiveShadow = false;
      im.frustumCulled = false;
      im.count = 0;
      scene.add(im);
      this.meshes[type] = im;
      this.counts[type] = 0;
    }
    this.cap = cap;
  }
  begin() { for (const t of ITEM_TYPES) this.counts[t] = 0; }
  add(type, x, y, z, rotY = 0, scale = 1, tiltX = 0, tiltZ = 0) {
    const n = this.counts[type];
    if (n >= this.cap) return;
    _p.set(x, y, z);
    _e.set(tiltX, rotY, tiltZ, 'YXZ');
    _q.setFromEuler(_e);
    _s.setScalar(scale);
    _m.compose(_p, _q, _s);
    this.meshes[type].setMatrixAt(n, _m);
    this.counts[type] = n + 1;
  }
  end() {
    for (const t of ITEM_TYPES) {
      const im = this.meshes[t];
      im.count = this.counts[t];
      im.instanceMatrix.needsUpdate = true;
    }
  }
}
