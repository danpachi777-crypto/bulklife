import {useEffect,useMemo} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {CanvasTexture,Mesh} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GYM_ASSET_URL} from './portraitAsset';
/** The actual beveled Blender room, shared by title, home and inspection. */
export function GymRoom(){
  const asset=useLoader(GLTFLoader,GYM_ASSET_URL);
  const root=useMemo(()=>{const s=asset.scene.clone(true);s.traverse(o=>{if(o instanceof Mesh){o.castShadow=!o.name.startsWith('GymFloor');o.receiveShadow=true;}});return s;},[asset]);
  const backdrop=root.getObjectByName('GymV4Backdrop');
  useFrame(({camera})=>{if(backdrop)backdrop.visible=camera.position.z>.4;});
  return <primitive object={root}/>;
}
export function ContactShade(){
  const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;const g=x.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(0,0,0,.48)');g.addColorStop(.5,'rgba(0,0,0,.20)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new CanvasTexture(c);},[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.002,.02]}><planeGeometry args={[.8,.6]}/><meshBasicMaterial map={texture} transparent depthWrite={false}/></mesh>;
}
