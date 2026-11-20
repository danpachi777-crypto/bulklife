import {BufferAttribute,SkinnedMesh} from 'three';
/** Hide only skin fully enclosed by the outfit. Full geometry is restored for
 * inspection; attributes, morph indices, bones and anatomical picking stay intact.
 * This avoids small skin specks from differences in cloth/skin tessellation.
 */
export function coveredSkinIndex(mesh:SkinnedMesh):BufferAttribute|null{
  const geometry=mesh.geometry,index=geometry.index;if(!index)return null;
  const p=geometry.getAttribute('position'),joint=geometry.getAttribute('skinIndex'),weight=geometry.getAttribute('skinWeight');
  const enclosed=(i:number)=>{
    let arm=0;for(let j=0;j<4;j++){const bone=mesh.skeleton.bones[joint.getComponent(i,j)];if(/finger|hand|forearm|upperArm/.test(bone.name))arm+=weight.getComponent(i,j);}
    if(arm>.15)return false;
    const y=p.getY(i),x=Math.abs(p.getX(i));
    return y<.112||(y>.695&&y<.99)||(y>.985&&y<1.405&&x<.16);
  };
  const keep:number[]=[];
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(!(enclosed(a)&&enclosed(b)&&enclosed(c)))keep.push(a,b,c);}
  return new BufferAttribute(new Uint32Array(keep),1);
}
