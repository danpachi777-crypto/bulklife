import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3,AnimationMixer} from 'three';
const file=readFileSync(new URL('../public/assets/athlete-v1.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse(o=>{if(o.isMesh){o.skeleton?.update();const size=new Box3().setFromObject(o,true).getSize(new Vector3());console.log(o.name,o.geometry.attributes.position.count,size.toArray().map(v=>v.toFixed(3)).join(','),o.morphTargetInfluences?.length);}});
console.log('clips',gltf.animations.map(a=>a.name));
