"""Export the saved v7 duplicate without reapplying authoring changes."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
assert bpy.data.filepath.endswith('bulk-life-athlete-v7-work.blend')
code=(ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf8').replace('athlete-v4.glb','athlete-v7.glb').replace('portrait-v4.json','portrait-v7.json').replace("'portrait-v4'","'portrait-v7'").replace('bulk-life-athlete-v4-final.blend','bulk-life-athlete-v7-work.blend')
exec(compile(code,'export-portrait-v7','exec'))
path=ROOT/'public/assets/portrait-v7.json';meta=json.loads(path.read_text());meta['poseMorphs']=['shoulderRaise','elbowFlexL','elbowFlexR'];meta['clothPoseMorphs']=['shoulderRaise'];meta['authoring']='assets/blender/bulk-life-athlete-v7-work.blend';path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8')
print('V7 actual GLB written',flush=True)
