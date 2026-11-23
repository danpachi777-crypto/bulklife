"""Preserve a Blender multiply-node tint which the exporter omits.
Explicit standard glTF baseColorFactor; no Three-only visual patch or shader trick.
"""
import json,struct
def preserve_materials(path):
 raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);tail=raw[20+length:]
 for material in doc['materials']:
  if material['name']=='V8_LicensedFeatheredHair':
   material['pbrMetallicRoughness']['baseColorFactor']=[.30,.235,.18,1]
   # Same stable depth-writing cutout as the game. Shipping BLEND and relying
   # on a runtime conversion made other glTF viewers disagree with the game.
   material['alphaMode']='MASK';material['alphaCutoff']=.18
  if material['name'] in ['V8_LicensedFeatheredHair','V8_HairSampledAlbedo']:material['doubleSided']=True
 encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf8');encoded+=b' '*((-len(encoded))%4)
 result=struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(tail))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+tail
 path.write_bytes(result)
