import {DoubleSide,type Material,type Object3D} from 'three';
export function belongsToHair(object:Object3D){
  for(let node:Object3D|null=object;node;node=node.parent)
    if(node.name==='BL_V4_Hair'||node.name==='BL_V3_NaturalHair')return true;
  return false;
}
/** glTF BLEND imports with depthWrite=false. Changing transparent alone leaves
 * rear cards drawing over front cards, producing dark rectangular patches. */
export function stabilizeHairMaterial(material:Material){
  material.alphaTest=.18;
  material.alphaToCoverage=true;
  material.transparent=false;
  material.depthWrite=true;
  material.side=DoubleSide;
}
