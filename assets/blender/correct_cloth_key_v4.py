"""A corrective must start from Basis, never the previously active morph."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife')
for name in ['BL_V4_TrainingTank','BL_V4_TrainingShorts']:
    keys=bpy.data.objects[name].data.shape_keys.key_blocks
    for i,v in enumerate(keys[0].data):
        p=v.co;w=math.exp(-((p.z-(1.075 if name.endswith('Tank') else .90))/.10)**2)
        keys['seatedCloth'].data[i].co=p+Vector((0,.0045*math.sin(p.z*138+p.x*24)*w,0))
body=bpy.data.objects['BL_V2_AthleteBody'];basis=body.data.shape_keys.key_blocks[0];blink=body.data.shape_keys.key_blocks['blink']
for i,v in enumerate(basis.data):
    x,y,z=v.co
    if not (.016<abs(x)<.05 and y<-.126 and 1.638<z<1.666):blink.data[i].co=v.co
    else:
        # Retain only the authored lid correction, not a previous body morph.
        smooth=lambda t:max(0,min(1,t))**2*(3-2*max(0,min(1,t)))
        width=smooth((abs(x)-.016)/.006)*smooth((.05-abs(x))/.006)
        upper=smooth((z-1.650)/.004)*smooth((1.668-z)/.008);lower=smooth((1.651-z)/.004)*smooth((z-1.637)/.008)
        blink.data[i].co=v.co+Vector((0,-.0008*width*(upper+lower),width*(-.0068*upper+.0022*lower)))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
exec(compile((ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf-8'),'export_portrait_v4.py','exec'))
