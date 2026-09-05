import * as THREE from '/Users/asheeshyadav/Desktop/Personal/Portfolio/Personal/node_modules/three/build/three.module.js';
import { voyagerPoints } from '/private/tmp/claude-501/-Users-asheeshyadav-Desktop-Personal-Portfolio-Personal/4ae050bb-828c-448a-87d9-e95c89a03306/scratchpad/i2t/voyagerCloud.test.mjs';
const n=3600, pts=voyagerPoints(THREE,n,2.1);
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],nan=0,zero=0;
for(let i=0;i<n;i++){let z=true;for(let k=0;k<3;k++){const v=pts[i*3+k];
 if(!Number.isFinite(v)){nan++;continue} if(v!==0)z=false;
 if(v<mn[k])mn[k]=v; if(v>mx[k])mx[k]=v;} if(z)zero++;}
console.log('points',n,'nonfinite',nan,'exactly-origin',zero);
console.log('min',mn.map(v=>v.toFixed(2)).join(','),' max',mx.map(v=>v.toFixed(2)).join(','));
const G=14,grid=new Set();
for(let i=0;i<n;i++){grid.add(Math.floor((pts[i*3]+2.1)/4.2*G)+','+Math.floor((pts[i*3+1]+2.1)/4.2*G));}
console.log('occupied XY cells',grid.size,'/',G*G);
