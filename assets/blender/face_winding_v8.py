"""Orient the short locks outward, preserving all vertex/UV/morph indices."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];hair=bpy.data.objects['BL_V4_Hair'];body=bpy.data.objects['BL_V2_AthleteBody'];base=[v.co for v in body.data.shape_keys.key_blocks[0].data];tree=BVHTree.FromPolygons(base,[list(p.vertices) for p in body.data.polygons]);flipped=0
hair.data.update()
for p in hair.data.polygons:
 center=sum((hair.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices);_,normal,_,_=tree.find_nearest(center)
 if p.normal.dot(normal)<-.05:p.flip();flipped+=1
hair.data.update();hair['v8OutwardLocks']=True
(ROOT/'docs/qa/anatomy-v8/hair-winding.json').write_text(json.dumps({'flippedPolygons':flipped,'method':'compare each groom surface normal to the actual underlying head normal; retain topology, morph indices and UVs'},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('V8 outward groom polygons '+str(flipped),flush=True)
