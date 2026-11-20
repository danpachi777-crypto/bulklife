import bpy
from pathlib import Path
from mathutils.bvhtree import BVHTree
ROOT=Path('C:/Users/shota/Documents/BulkLife')
body=bpy.data.objects['BL_V2_AthleteBody'];basis=body.data.shape_keys.key_blocks[0]
tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
hair=bpy.data.objects['BL_V4_Hair'];mat=hair.data.materials[0];hair.data=bpy.data.objects['BL_V3_NaturalHair'].data.copy();hair.data.materials.clear();hair.data.materials.append(mat)
for v in hair.data.vertices:
    p,n,_,_=tree.find_nearest(v.co)
    if v.co.z>1.69:v.co=p+(v.co-p)*.75
    elif abs(v.co.x)>.065:v.co=p+(v.co-p)*.67
hair.data.update()
exec(compile((ROOT/'assets/blender/final_motion_v4.py').read_text(encoding='utf-8'),'final_motion_v4.py','exec'))
