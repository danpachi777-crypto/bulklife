import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody'];k=body.data.shape_keys.key_blocks
data={'view':{'exposure':bpy.context.scene.view_settings.exposure,'viewTransform':bpy.context.scene.view_settings.view_transform},'bones':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones if any(s in b.name for s in ['clavicle','Arm','forearm'])},'armMax':{n:[list(v.co) for i,v in sorted(enumerate(k[0].data),key=lambda q:(k[n].data[q[0]].co-q[1].co).length,reverse=True)[:4]] for n in ['biceps','triceps','frontDelts']}}
(ROOT/'docs/qa/decisions-v6/pose-inventory.json').write_text(json.dumps(data,indent=2),encoding='utf8')
