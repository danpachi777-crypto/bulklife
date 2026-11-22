"""Final face-plane, groom silhouette and actual sewn-edge refinements on v5."""
import bpy,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path('C:/Users/shota/Documents/BulkLife');assert bpy.data.filepath.endswith('bulk-life-athlete-v5-work.blend')
body=bpy.data.objects['BL_V2_AthleteBody'];keys=body.data.shape_keys.key_blocks;basis=keys[0]
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text().replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/consistency-v5'")
exec(qa);setup()
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
state();keys['shoulderRaise'].value=0;render('before-face',(0,-.92,1.63),(0,-.03,1.63),True);render('before-face-side',(.92,-.12,1.63),(0,-.03,1.63),True)
def gauss(v,c,r):return math.exp(-2*((v-c)/r)**2)
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
assert not body.get('v5FacePlanes')
for i,p in enumerate(basis.data):
    x,y,z=p.co;ax=abs(x);front=smooth((-y-.105)/.025);d=Vector()
    d.y-=.0016*gauss(ax,.040,.020)*gauss(z,1.632,.022)*front
    d.y+=.0008*gauss(ax,.026,.018)*gauss(z,1.628,.009)*front
    d.y-=.0008*gauss(ax,.014,.008)*gauss(z,1.606,.011)*front
    d.y-=.00045*gauss(x,0,.007)*gauss(z,1.589,.009)*front
    d.y-=.0011*gauss(ax,.025,.022)*gauss(z,1.550,.018)*front
    for key in keys:key.data[i].co+=d
body['v5FacePlanes']='orbital-cheek-ala-philtrum-chin; identity preserved';body.data.update()
hair=bpy.data.objects['BL_V4_Hair'];tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
for v in hair.data.vertices:
    p,n,_,distance=tree.find_nearest(v.co)
    amount=.86 if v.co.z>1.69 else .94
    amount+=.025*math.sin(v.co.x*130+v.co.y*85)
    v.co=p+(v.co-p)*amount
hair.data.update()
for name in ['BL_V4_TrainingTank','BL_V4_TrainingShorts']:
    o=bpy.data.objects[name];garmentKeys=o.data.shape_keys.key_blocks
    changes={}
    for edge in o.data.edges:
        a,b=edge.vertices;va=garmentKeys[0].data[a].co;vb=garmentKeys[0].data[b].co
        if abs((va-vb).length-.0025)<.00008:
            delta=(vb-va)*.14;changes.setdefault(a,Vector());changes.setdefault(b,Vector());changes[a]+=delta;changes[b]-=delta
    for i,delta in changes.items():
        if delta.length>.0005:delta*=.0005/delta.length
        for key in garmentKeys:key.data[i].co+=delta
    o['v5HemRefinementVertices']=len(changes);o.data.update()
# Same neutral conditions for final evidence.
state();keys['shoulderRaise'].value=0;render('after-face',(0,-.92,1.63),(0,-.03,1.63),True);render('after-face-side',(.92,-.12,1.63),(0,-.03,1.63),True)
render('after-hair-back',(0,.84,1.67),(0,0,1.66),True)
state(wear=True);keys['shoulderRaise'].value=0;render('after-wear-stand');state(wear=True,clip='SeatedPrepare',frame=193);keys['shoulderRaise'].value=0;render('after-seat',(1.1,-4,1.15),(0,.2,.75));render('after-hands',(.45,-1.4,1.2),(0,-.2,.75),True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v5-work.blend'))
export=(ROOT/'assets/blender/export_portrait_v4.py').read_text().replace('athlete-v4.glb','athlete-v5.glb').replace('portrait-v4.json','portrait-v5.json').replace("'portrait-v4'","'portrait-v5'").replace('bulk-life-athlete-v4-final.blend','bulk-life-athlete-v5-work.blend')
exec(compile(export,'export_portrait_v5','exec'))
import json
path=ROOT/'public/assets/portrait-v5.json';meta=json.loads(path.read_text());meta['poseMorphs']=['shoulderRaise'];path.write_text(json.dumps(meta,indent=2),encoding='utf-8')
print('Final v5 character exported',flush=True)
