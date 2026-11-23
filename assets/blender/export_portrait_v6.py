"""Export only the selected v6 actor; do not recalibrate packed textures twice."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
assert bpy.data.filepath.endswith('bulk-life-athlete-v6-work.blend')
export=(ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf8').replace('athlete-v4.glb','athlete-v6.glb').replace('portrait-v4.json','portrait-v6.json').replace("'portrait-v4'","'portrait-v6'").replace('bulk-life-athlete-v4-final.blend','bulk-life-athlete-v6-work.blend')
exec(compile(export,'export_portrait_v6','exec'))
path=ROOT/'public/assets/portrait-v6.json';meta=json.loads(path.read_text());meta['poseMorphs']=['shoulderRaise']+[n for n in ['elbowFlexL','elbowFlexR'] if n in body.data.shape_keys.key_blocks];meta['clothPoseMorphs']=['shoulderRaise'];path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8')
