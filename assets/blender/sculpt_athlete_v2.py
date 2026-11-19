"""Game-specific anatomical muscle authoring on the continuous CC0 base.
Fusiform muscle bellies taper to tendons; pectorals/latissimus use fan fields.
This changes vertex positions and regional targets, not only shading/subdivision.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig']
if body.get('anatomicalMuscleSculpt'):raise RuntimeError('Anatomical sculpt already applied')
keys=body.data.shape_keys.key_blocks;basis=keys[0];parts=[k.name for k in list(keys)[1:] if k.name not in ['bodyFat','pump']]
def clamp(x,a=0,b=1):return max(a,min(b,x))
def smooth(x):x=clamp(x);return x*x*(3-2*x)
def gauss(x,c,r):return math.exp(-2*((x-c)/r)**2)
def limb(v,name):
    b=rig.data.bones[name];a=b.head_local;u=b.tail_local-a;t=clamp((v-a).dot(u)/u.length_squared);center=a+u*t;r=v-center
    r-=u*(r.dot(u)/u.length_squared)
    return t,center,r,r.normalized() if r.length>.00001 else Vector()
summaries={p:0 for p in parts}
for i,point in enumerate(basis.data):
    v=point.co.copy();x,y,z=v;ax=abs(x);side='L' if x>0 else 'R';sign=1 if x>0 else -1;d={p:Vector() for p in parts}
    # Pectoralis: broad medial origin, curved lower edge, narrowed humeral insertion.
    lo=1.255+.060*clamp(ax/.185);hi=1.416-.038*clamp(ax/.185)
    fan=smooth((ax-.008)/.025)*smooth((.19-ax)/.045)*smooth((-y-.045)/.055)
    vertical=clamp((z-lo)/(hi-lo)) if hi>lo else 0
    belly=math.sin(math.pi*vertical)**1.1 if lo<z<hi else 0
    d['chest'].y-=.023*fan*belly*(1-smooth((z-1.35)/.05))
    d['upperChest'].y-=.015*fan*belly*smooth((z-1.32)/.065)
    # Deltoid wraps the humerus; the three masks partition its front/lateral/rear surface.
    t,c,r,n=limb(v,'upperArm.'+side);arm=gauss(t,.14,.32)*smooth((ax-.14)/.06)*smooth((1.51-z)/.08)*smooth((z-1.16)/.13)
    front=smooth((c.y-y+.005)/.065);rear=smooth((y-c.y+.005)/.065);lateral=smooth((abs(x)-abs(c.x))/.04)
    denom=max(1,front+rear+lateral)
    for p,w in [('frontDelts',front),('sideDelts',lateral),('rearDelts',rear)]:d[p]+=n*(.021*arm*w/denom)
    # Upper-arm muscle bellies leave the elbow / shoulder tendon zones thin.
    envelope=(math.sin(math.pi*clamp(t))**1.4)*smooth((ax-.18)/.06)*smooth((1.43-z)/.08)*smooth((z-1.15)/.06)
    d['biceps']+=n*(.018*envelope*front);d['triceps']+=n*(.020*envelope*rear)
    t,c,r,n=limb(v,'forearm.'+side);e=math.sin(math.pi*clamp(t))**1.1*gauss(t,.38,.55)*smooth((ax-.29)/.10)
    d['forearms']+=n*(.012*e)
    # Back surface: lat fan, scapular masses and paired longitudinal erectors.
    back=smooth((y-.015)/.07)
    lat=gauss(z,1.28,.18)*smooth((ax-.045)/.08)*smooth((.205-ax)/.055)*back
    d['lats']+=Vector((sign*.014*lat,.014*lat,0))
    trap=(gauss(ax,.045,.055)*gauss(z,1.43,.10)+gauss(ax,.09,.07)*gauss(z,1.35,.10))*back
    d['upperBack'].y+=.012*trap
    erector=gauss(ax,.032,.024)*gauss(z,1.15,.20)*back;d['erectors'].y+=.012*erector
    # Rectus segments and obliques blend into the lower ribs / iliac region.
    ab=0
    for height,width in [(1.235,.033),(1.17,.033),(1.105,.040)]:ab+=gauss(ax,.030,width)*gauss(z,height,.044)
    ab*=smooth((-y-.04)/.055);d['abs'].y-=.010*ab
    # Thigh anterior/posterior masses and the distal vastus medialis tear-drop.
    t,c,r,n=limb(v,'thigh.'+side);leg=smooth((.93-z)/.11)*smooth((z-.50)/.07)*smooth((.30-ax)/.08)*smooth((ax-.025)/.035)
    env=math.sin(math.pi*clamp(t))**1.25*leg;front=smooth((c.y-y)/.07);rear=smooth((y-c.y)/.07)
    medial=smooth((-sign*r.x+.01)/.045);teardrop=gauss(t,.80,.17)*medial*leg*front
    d['quads']+=n*(.025*env*front+.012*teardrop);d['hamstrings']+=n*(.022*env*rear)
    glute=gauss(ax,.105,.10)*gauss(z,.91,.11)*smooth((y-.015)/.055);d['glutes'].y+=.020*glute
    # Gastrocnemius heads, tapering to a preserved Achilles / ankle.
    t,c,r,n=limb(v,'shin.'+side);calf=gauss(t,.30,.30)*smooth((.52-z)/.08)*smooth((z-.15)/.10)*smooth((.30-ax)/.08)
    posterior=smooth((y-c.y+.015)/.055);d['calves']+=n*(.018*calf*posterior)
    total=sum(d.values(),Vector());base_delta=total*.22
    for key in keys:key.data[i].co+=base_delta
    for name,change in d.items():keys[name].data[i].co+=change;summaries[name]=max(summaries[name],change.length)
    keys['pump'].data[i].co+=total*.06
    # Increased adiposity softens baseline abdominal relief without changing growth state.
    keys['bodyFat'].data[i].co-=d['abs']*.18
body['anatomicalMuscleSculpt']='fan-and-fusiform-v1';body.data.update()
meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text());meta['anatomicalSculpt']={'version':'fan-and-fusiform-v1','baselineFraction':.22,'maxRegionalDisplacementMetres':summaries,'notes':'Pectoral fan / deltoid heads / fusiform arm and thigh bellies / teardrop / calf-Achilles taper, all on continuous topology'}
(ROOT/'public/assets/regions-v2.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps(summaries))
