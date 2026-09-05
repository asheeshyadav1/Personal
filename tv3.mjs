import * as THREE from '/Users/asheeshyadav/Desktop/Personal/Portfolio/Personal/node_modules/three/build/three.module.js';
import { setThree, createVoyagerProbeModel } from '/Users/asheeshyadav/Desktop/Personal/Portfolio/Personal/src/components/scene/voyagerModel.js';
setThree(THREE);
const g=createVoyagerProbeModel({geometryOnly:true});
g.updateMatrixWorld(true);
const rows=[];
g.traverse(o=>{ if(o.isMesh){
 const b=new THREE.Box3().setFromObject(o), s=b.getSize(new THREE.Vector3()), c=b.getCenter(new THREE.Vector3());
 rows.push([o.name, s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2), c.x.toFixed(2),c.y.toFixed(2),c.z.toFixed(2)]);}});
rows.sort((a,b)=>Math.max(+b[1],+b[2],+b[3])-Math.max(+a[1],+a[2],+a[3]));
for(const r of rows) console.log(r[0].padEnd(28), 'size',r[1],r[2],r[3],'  centre',r[4],r[5],r[6]);
