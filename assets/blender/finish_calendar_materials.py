"""Apply the facial variation and authored surface response to a contoured v8 frame."""
import bpy
from math import exp
body=bpy.data.objects['BL_V2_AthleteBody']
keys=body.data.shape_keys.key_blocks
if 'rivalJaw' not in keys:
    jaw=body.shape_key_add(name='rivalJaw',from_mix=False)
    head=bpy.data.objects['BL_V2_Rig'].data.bones['head'].head_local
    for b,v in zip(keys['Basis'].data,jaw.data):
        x,y,z=b.co
        if z<head.z-.06 or z>head.z+.105 or abs(x)>.105:continue
        w=exp(-((z-head.z-.006)/.037)**2)*exp(-((abs(x)-.059)/.029)**2)
        v.co.x+=.005*w*(1 if x>0 else -1)
        v.co.y-=.0015*w
for material in bpy.data.materials:
    if not material.use_nodes:continue
    p=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not p:continue
    if material.name in ['V8_LicensedFeatheredHair','V8_HairSampledAlbedo']:
        p.inputs['Roughness'].default_value=.66
        p.inputs['Anisotropic'].default_value=.30
    if material.name=='BL_V2_EyeSclera':
        p.inputs['Roughness'].default_value=.30
        p.inputs['Coat Weight'].default_value=.16
        p.inputs['Coat Roughness'].default_value=.15
    if material.name in ['BL_V4_NavyWoven','BL_V6_SlateKnit']:
        p.inputs['Sheen Weight'].default_value=.18
        p.inputs['Sheen Roughness'].default_value=.82
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
