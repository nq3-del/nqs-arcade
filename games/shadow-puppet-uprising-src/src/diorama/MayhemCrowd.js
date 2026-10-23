import * as THREE from 'three';
import { glamourMaterial } from './GlamourEffects.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function shape(parts) {
  const geometries = parts.map(([x, y, z, w, h, d]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const geometry = mergeGeometries(geometries);
  geometries.forEach(g => g.dispose());
  return geometry;
}

// One shared body and eye mesh per crowd, rather than hundreds of full rigs.
export class MayhemCrowd {
  constructor(view, boss = false) {
    this.view = view; this.boss = boss; this.capacity = 0;
    const parts = [[0, 1.05, 0, .68, .8, .42], [0, 1.76, 0, .64, .6, .54],
      [-.22, .36, 0, .24, .65, .27], [.22, .36, 0, .24, .65, .27],
      [-.52, 1.1, 0, .26, .78, .25], [.52, 1.1, 0, .26, .78, .25]];
    if (boss) parts.push([0, 2.12, 0, .8, .15, .6], [-.3, 2.3, 0, .15, .35, .6],
      [0, 2.34, 0, .15, .43, .6], [.3, 2.3, 0, .15, .35, .6]);
    this.bodyGeometry = shape(parts);
    this.eyeGeometry = shape([[-.15, 1.8, .28, .13, .09, .03], [.15, 1.8, .28, .13, .09, .03]]);
    this.bodyMaterial = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .8});
    this.eyeMaterial = new THREE.MeshBasicMaterial({color: boss ? '#ffc767' : '#cfeaff'});
    this.portraitGeometry = new THREE.PlaneGeometry(1,1);
    this.transform = new THREE.Object3D(); this.color = new THREE.Color();
  }
  resize(count) {
    if (count <= this.capacity) return;
    this.capacity = Math.max(128, this.capacity * 2, count);
    for (const mesh of [this.body, this.eyes]) if (mesh) { mesh.removeFromParent(); mesh.dispose(); }
    this.body = new THREE.InstancedMesh(this.bodyGeometry, this.bodyMaterial, this.capacity);
    this.eyes = new THREE.InstancedMesh(this.eyeGeometry, this.eyeMaterial, this.capacity);
    for (const mesh of [this.body, this.eyes]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.view.root.add(mesh);
    }
  }
  render(foes, now) {
    this.resize(foes.length);
    if (!this.body) return;
    this.body.count = this.eyes.count = foes.length;
    if(foes.some(foe=>now<foe.glamourVisualUntil) && (!this.portraits || this.portraits.instanceMatrix.count<this.capacity)) {
      if(this.portraits){this.portraits.removeFromParent();this.portraits.dispose();}
      this.portraitMaterial ||= glamourMaterial();
      this.portraits=new THREE.InstancedMesh(this.portraitGeometry,this.portraitMaterial,this.capacity);
      this.portraits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.portraits.frustumCulled=false;
      this.portraits.renderOrder=20;this.view.root.add(this.portraits);
    }
    let portraitCount=0;
    foes.forEach((foe, index) => {
      const t = this.transform, size = this.boss ? 1.65 : 1;
      t.position.set(foe.x, .28, foe.z);
      t.rotation.set(0, foe.angle, now < foe.poseUntil ? Math.sin(now / 150) * .2 : 0);
      t.scale.setScalar(size); t.updateMatrix();
      this.body.setMatrixAt(index, t.matrix); this.eyes.setMatrixAt(index, t.matrix);
      this.color.set(now < foe.friendlyUntil ? '#91b590' : now < foe.poseUntil ? '#d898c3' :
        foe.winding ? '#c58394' : this.boss ? '#514064' : '#38334a');
      this.body.setColorAt(index, this.color);
      if(now<foe.glamourVisualUntil) {
        t.position.set(foe.x,this.boss?2.25:1.55,foe.z);
        t.quaternion.copy(this.view.camera.quaternion);t.scale.setScalar(this.boss?3.6:2.5);t.updateMatrix();
        this.portraits.setMatrixAt(portraitCount++,t.matrix);
      }
    });
    if(this.portraits){this.portraits.count=portraitCount;this.portraits.instanceMatrix.needsUpdate=true;}
    this.body.instanceMatrix.needsUpdate = this.eyes.instanceMatrix.needsUpdate = true;
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;
  }
  destroy() {
    if(this.portraits){this.portraits.removeFromParent();this.portraits.dispose();}
    this.portraitGeometry.dispose();this.portraitMaterial?.dispose();
    for (const mesh of [this.body, this.eyes]) if (mesh) { mesh.removeFromParent(); mesh.dispose(); }
    this.bodyGeometry.dispose(); this.eyeGeometry.dispose();
    this.bodyMaterial.dispose(); this.eyeMaterial.dispose();
  }
}
