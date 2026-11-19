"""Regional adipose volume independent of the sixteen muscle targets."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];basis=body.data.shape_keys.key_blocks[0];key=body.data.shape_keys.key_blocks['bodyFat']
if body.get('adiposeSculpt'):raise RuntimeError('Adipose sculpt already applied')
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def gauss(x,c,r):return math.exp(-2*((x-c)/r)**2)
maximum=0
for i,p in enumerate(basis.data):
    v=p.co;x,y,z=v;ax=abs(x);sign=1 if x>0 else -1;d=Vector()
    front=smooth((-y-.025)/.065);back=smooth((y-.015)/.065)
    # Continuous abdominal apron, flanks and lower-back pad; avoid a spherical bulge.
    belly=gauss(x,0,.19)*gauss(z,1.105,.165)*front
    d.y-=.066*belly
    waist=gauss(z,1.07,.18)*smooth((ax-.055)/.08)*smooth((.25-ax)/.06)
    d.x+=sign*.044*waist;d.y+=.026*waist*back
    # Subcutaneous softness across chest and lateral pelvis.
    d.y-=.016*gauss(ax,.09,.13)*gauss(z,1.31,.12)*front
    hip=gauss(z,.95,.12)*smooth((ax-.08)/.07)*smooth((.27-ax)/.07)
    d.x+=sign*.025*hip;d.y+=.018*gauss(ax,.1,.13)*gauss(z,.91,.13)*back
    # Modest thigh/upper-arm volume, tapered before knees and elbows.
    for name,amount in [('thigh',.019),('upperArm',.010)]:
        b=rig.data.bones[name+'.'+('L' if x>0 else 'R')];u=b.tail_local-b.head_local;t=max(0,min(1,(v-b.head_local).dot(u)/u.length_squared));center=b.head_local+u*t;r=v-center;r-=u*(r.dot(u)/u.length_squared)
        radial=gauss(r.length,0,.11 if name=='thigh' else .085);envelope=math.sin(math.pi*t)**1.5
        mask=smooth((ax-.055)/.045) if name=='thigh' else smooth((ax-.18)/.06)
        if r.length>.0001:d+=r.normalized()*amount*envelope*radial*mask
    # Jaw/cheek fullness is small compared with trunk changes.
    face=gauss(z,1.59,.09)*smooth((ax-.015)/.025)*smooth((.085-ax)/.03)
    d.x+=sign*.0045*face;d.y-=.003*face*front
    key.data[i].co+=d;maximum=max(maximum,d.length)
body['adiposeSculpt']='abdomen-flank-lumbar-v1';meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text());meta['adiposeSculpt']={'version':'abdomen-flank-lumbar-v1','maxAdditionalDisplacementMetres':maximum,'notes':'Abdominal apron, lateral waist, lower back, hips, subcutaneous chest/thigh/arm and subtle cheeks; separate from muscle growth.'};(ROOT/'public/assets/regions-v2.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'));print(json.dumps(meta['adiposeSculpt']))
