import bpy,json,io,contextlib,hashlib,io_scene_gltf2
from pathlib import Path
from types import SimpleNamespace
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];col=bpy.data.collections['BULK_LIFE_Athlete_v2'];scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text())
if not body.get('garmentClearanceV3'):
    basis=body.data.shape_keys.key_blocks[0]
    tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
    tank=bpy.data.objects['BL_V3_TrainingTank'];keys=tank.data.shape_keys.key_blocks
    for i,v in enumerate(keys[0].data):
        p,n,face,d=tree.find_nearest(v.co)
        clearance=(v.co-p).dot(n)
        if clearance<.009:
            delta=n*(.009-clearance)
            for key in keys:key.data[i].co+=delta
    for side in ['L','R']:
        o=bpy.data.objects['BL_V2_Eyebrow.'+side]
        if not o.users_collection:col.objects.link(o)
        o.hide_render=False;o.hide_viewport=False
        for v in o.data.vertices:
            v.co.z-=.007
            p,n,_,_=tree.find_nearest(v.co)
            v.co=p+n*.0007
        mat=o.data.materials[0];p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.018,.011,.007,1);p.inputs['Roughness'].default_value=.86
    body['garmentClearanceV3']=True
for name in ['BL_V2_Hair','BL_V3_HairFlow']:
    bpy.data.objects[name].hide_viewport=False;bpy.data.objects[name].hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v3-work.blend'))
source=(ROOT/'assets/blender/finish_portrait_v3.py').read_text(encoding='utf-8')
exec(compile(source[source.index('clips=meta'):],'export-portrait-v3','exec'))
