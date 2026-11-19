"""Keep the upper pectoral/axillary shoulder field on the shoulder girdle."""
import bpy,json
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife');body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig'];meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text())
if body.get('shoulderWeightRevision'):raise RuntimeError('Shoulder remap already applied')
weights=json.loads((ROOT/'assets/sources/makehuman/default_weights.mhw').read_text())['weights'];index={int(v):i for i,v in enumerate(meta['sourceVertexIndices'])}
changes=0
for side in ['L','R']:
    for original,weight in weights['shoulder01.'+side]:
        if int(original) not in index:continue
        i=index[int(original)];groups={body.vertex_groups[g.group].name:g.weight for g in body.data.vertices[i].groups if body.vertex_groups[g.group].name in rig.data.bones}
        arm='upperArm.'+side;clavicle='clavicle.'+side;move=min(groups.get(arm,0),weight*.82)
        groups[arm]=max(0,groups.get(arm,0)-move);groups[clavicle]=groups.get(clavicle,0)+move
        for name in groups:body.vertex_groups[name].remove([i])
        groups=dict(sorted(groups.items(),key=lambda q:-q[1])[:4]);total=sum(groups.values())
        for name,w in groups.items():
            if w>0:body.vertex_groups[name].add([i],w/total,'REPLACE')
        changes+=1
body['shoulderWeightRevision']='82pct-clavicle';bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'));print({'shoulderVerticesRemapped':changes})
