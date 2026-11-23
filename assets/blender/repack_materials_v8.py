"""Repeatable material-only packing; geometry, morphs and clips are untouched."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];helper=ROOT/'assets/blender/gltf_materials_v8.py';scope={};exec(compile(helper.read_text(),str(helper),'exec'),scope)
for frame in ['standard','tall','broad']:
 glb=ROOT/f'public/assets/athlete-v8-{frame}.glb';scope['preserve_materials'](glb);path=ROOT/f'public/assets/portrait-v8-{frame}.json';meta=json.loads(path.read_text());meta.update({'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'glbBytes':glb.stat().st_size,'hairAlphaMode':'MASK','hairAlphaCutoff':.18});path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8')
print('Material-only v8 packing complete; clips and geometry unchanged',flush=True)
