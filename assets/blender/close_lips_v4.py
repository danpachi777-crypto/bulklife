"""Seal the remaining inner-lip gap without flattening outer lip volume."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife')
body=bpy.data.objects['BL_V2_AthleteBody'];keys=body.data.shape_keys.key_blocks
if not body.get('closedLipFinishV4'):
    for i,v in enumerate(keys[0].data):
        x,y,z=v.co;front=max(0,min(1,(-y-.10)/.035))
        mask=math.exp(-2*(x/.029)**2)*math.exp(-2*((z-1.576)/.008)**2)*front
        delta=Vector((0,0,(1.576-z)*.8*mask))
        for key in keys:key.data[i].co+=delta
    body['closedLipFinishV4']=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
exec(compile((ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf-8'),'export_portrait_v4.py','exec'))
