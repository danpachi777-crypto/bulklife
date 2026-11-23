"""Keep the feathered fringe at the irregular hairline, not scattered on skin."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];hair=bpy.data.objects['BL_V4_Hair'];body=bpy.data.objects['BL_V2_AthleteBody'];base=[v.co for v in body.data.shape_keys.key_blocks[0].data];skin=BVHTree.FromPolygons(base,[list(p.vertices) for p in body.data.polygons]);keys=hair.data.shape_keys.key_blocks;changed=0
for i,vertex in enumerate(keys[0].data):
 p=vertex.co.copy();x,y,z=p;ax=abs(x)
 if y>-.065 or ax>.081:continue
 line=1.705+.008*(min(1,ax/.077)**1.6)+.0007*math.sin(x*360)+.0004*math.sin(x*730)
 if z>=line:continue
 q=Vector((x,y,line));hit,n,_,_=skin.find_nearest(q);q=hit+n*.0012;delta=q-p
 for k in keys:k.data[i].co+=delta
 changed+=1
hair.data.update();hair['v8Hairline']='restrained irregular front/temple silhouette; no long detached dark fringe flecks below the hairline'
(ROOT/'docs/qa/anatomy-v8/hairline.json').write_text(json.dumps({'verticesRepositioned':changed,'method':hair['v8Hairline']},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
