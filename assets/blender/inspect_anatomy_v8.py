import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/anatomy-v8';body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];keys=body.data.shape_keys.key_blocks
samples={}
for label,x,y,z in [('sternum',.02,-.15,1.35),('pec-mid',.10,-.15,1.35),('pec-low',.10,-.13,1.29),('rib',.12,-.08,1.22),('upper-arm',.29,-.08,1.30),('waist',.12,-.06,1.08)]:
 ids=sorted(range(len(keys[0].data)),key=lambda i:(keys[0].data[i].co-Vector((x,y,z))).length_squared)[:8]
 samples[label]=[{'index':i,'basis':list(keys[0].data[i].co),'developed':list(sum((keys[n].data[i].co-keys[0].data[i].co for n in ['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs']),Vector())*1.2),'skin':{body.vertex_groups[g.group].name:g.weight for g in body.data.vertices[i].groups if body.vertex_groups[g.group].name in rig.data.bones}} for i in ids]
(OUT/'weight-inspection.json').write_text(json.dumps({'samples':samples,'bones':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones}},indent=2),encoding='utf8')
print('Wrote v8 actual weights and rest endpoints',flush=True)
