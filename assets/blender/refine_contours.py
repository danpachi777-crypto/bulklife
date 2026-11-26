"""Refine growth displacements along the athlete's own shoulder-to-elbow axis.
Run on each v8 frame before export_anatomy_v8.py. Metric rig and body use identity transforms.
"""
import bpy
from math import exp
from mathutils import Vector

body = bpy.data.objects['BL_V2_AthleteBody']
rig = bpy.data.objects['BL_V2_Rig']
if body.get('calendarContours'):
    raise RuntimeError('Contours already applied')
bones = rig.data.bones
for name in ['BL_V2_AthleteBody', 'BL_V4_TrainingTank', 'BL_V4_TrainingShorts', 'BL_V2_Shorts']:
    obj = bpy.data.objects[name]
    if not obj.data.shape_keys:
        continue
    keys = obj.data.shape_keys.key_blocks
    for region in ['upperChest','chest','frontDelts','sideDelts','rearDelts','biceps','triceps','forearms','quads','hamstrings']:
        key = keys.get(region)
        if key is None:
            continue
        for basis, shaped in zip(keys[0].data, key.data):
            d = shaped.co - basis.co
            if d.length_squared < 1e-14:
                continue
            point = rig.matrix_world.inverted() @ (obj.matrix_world @ basis.co)
            side = '.L' if point.x > 0 else '.R'
            bone = bones[('thigh' if region in ('quads','hamstrings') else 'upperArm') + side]
            axis = bone.tail_local - bone.head_local
            t = (point - bone.head_local).dot(axis) / axis.length_squared
            if region.endswith('Delts'):
                # Reduce the radial cap, easing into the upper arm insertion.
                shaped.co = basis.co + Vector((d.x*.84,d.y*.91,d.z*.86)) * (1-.16*exp(-((t-.30)/.20)**2))
            elif region in ('chest','upperChest'):
                width = abs(point.x)/abs(bones['upperArm.L'].head_local.x)
                shaped.co = basis.co + d * (1-.26*exp(-((width-.89)/.22)**2))
            elif region == 'forearms':
                shaped.co = basis.co + d * 1.06
            else:
                belly = .40 if region in ('biceps','quads') else .54
                shaped.co = basis.co + d * (.73+.30*exp(-((t-belly)/.29)**2))
body['calendarContours']=1
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
