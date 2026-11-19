"""Preserve the pelvis midline while thigh targets enlarge their own limb."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text());keys=body.data.shape_keys.key_blocks;basis=keys[0]
if body.get('groinProtection'):raise RuntimeError('Groin protection already applied')
src=ROOT/'assets/sources/makehuman';raw=[Vector(tuple(map(float,l.split()[1:4]))) for l in (src/'base.obj').read_text().splitlines() if l.startswith('v ')]
def target(name):
    return {int(l.split()[0]):Vector(tuple(map(float,l.split()[1:4]))) for l in (src/name).read_text().splitlines() if l.strip() and not l.startswith('#')}
male=target('asian-male-young.target');muscle=target('universal-male-young-maxmuscle-averageweight.target');coords=[v+male.get(i,Vector())+muscle.get(i,Vector())*.25 for i,v in enumerate(raw)];ids=meta['sourceVertexIndices'];ground=min(coords[i].y for i in ids);scale=1.77/(max(coords[i].y for i in ids)-ground)
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
count=0
for i,original in enumerate(ids):
    v=coords[original];x=v.x*scale;z=(v.y-ground)*scale;mask=smooth((abs(x)-.025)/.035)
    if mask>=1:continue
    removed=Vector()
    for name in ['quads','hamstrings']:
        try:w=body.vertex_groups['region_'+name].weight(i)
        except RuntimeError:w=0
        d=muscle.get(original,Vector());official=Vector((d.x,-d.z,d.y))*scale*.95*w
        extra=keys[name].data[i].co-basis.data[i].co-official;change=extra*(1-mask);keys[name].data[i].co-=change;removed+=change
    for key in keys:key.data[i].co-=removed*.22
    keys['pump'].data[i].co-=removed*.06
    count+=1
body['groinProtection']='thigh-belly-midline-mask';bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'));print({'midlineVerticesProtected':count})
