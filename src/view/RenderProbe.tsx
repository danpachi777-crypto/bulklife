import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
export interface RenderSample {fps:number;calls:number;triangles:number;geometries:number;textures:number;dpr:number;width:number;height:number}
/** Developer observation only. Stops when the canvas is out of view/covered. */
export function RenderProbe({active,onSample}:{active:boolean;onSample:(v:RenderSample)=>void}){
 const {gl,size,viewport}=useThree(),frames=useRef(0);
 useFrame(()=>{frames.current++;});
 useEffect(()=>{if(!active)return;let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),info=gl.info;onSample({fps:frames.current*1000/(now-last),calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,dpr:viewport.dpr,width:size.width,height:size.height});frames.current=0;last=now;},1000);return()=>clearInterval(timer);},[active,gl,size.width,size.height,viewport.dpr,onSample]);
 return null;
}
