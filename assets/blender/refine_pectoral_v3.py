"""Broad pectoral volume without a hard lower shelf under combined targets."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife')
body=bpy.data.objects['BL_V2_AthleteBody'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
if body.get('pectoralRevisionV3'):raise RuntimeError('Pectoral revision already applied')
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def gaussian(v,c,r):return math.exp(-2*((v-c)/r)**2)
for i,point in enumerate(basis.data):
    x,y,z=point.co;ax=abs(x)
    front=smooth((-y-.015)/.065)
    medial=smooth((ax-.005)/.032)
    fan=gaussian(ax,.090,.105)*front*medial
    for name,center,depth in [('chest',1.337,.024),('upperChest',1.392,.013)]:
        amount=fan*gaussian(z,center,.100)
        keys[name].data[i].co=point.co+Vector((math.copysign(.002*amount,x),-depth*amount,0))
# Reuse the continuous surface sampling transfer for the two fitted garments.
src=(ROOT/'assets/blender/refine_growth_v3.py').read_text(encoding='utf-8')
namespace=globals();namespace['parts']=['chest','upperChest']
import json
from mathutils.bvhtree import BVHTree
from mathutils.geometry import closest_point_on_tri
exec(compile(src[src.index('tree=BVHTree'):src.index("body['growthRevisionV3']")],'transfer-pectoral','exec'))
body['pectoralRevisionV3']='continuous-broad-fan-v2'
exec(compile((ROOT/'assets/blender/polish_portrait_v3.py').read_text(encoding='utf-8'),'export-portrait','exec'))
