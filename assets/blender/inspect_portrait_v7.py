import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/portrait-v7';OUT.mkdir(parents=True,exist_ok=True)
data=[]
for o in bpy.data.collections['BULK_LIFE_Athlete_v2'].objects:
 if o.type!='MESH':continue
 coords=[v.co for v in o.data.vertices]
 mats=[]
 for m in o.data.materials:
  nodes=[]
  if m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='BSDF_PRINCIPLED':nodes.append({'type':n.type,'inputs':{s.name:list(s.default_value) if hasattr(s.default_value,'__len__') else s.default_value for s in n.inputs if s.name in ['Base Color','Roughness','Subsurface Weight','Specular IOR Level','Alpha']}})
    if n.type=='TEX_IMAGE':nodes.append({'type':n.type,'image':n.image.name if n.image else None,'size':list(n.image.size) if n.image else None})
  mats.append({'name':m.name,'nodes':nodes})
 data.append({'name':o.name,'verts':len(coords),'faces':len(o.data.polygons),'bounds':[[min(v[i] for v in coords),max(v[i] for v in coords)] for i in range(3)] if coords else [],'materials':mats,'morphs':list(o.data.shape_keys.key_blocks.keys()) if o.data.shape_keys else []})
body=bpy.data.objects['BL_V2_AthleteBody'];key=body.data.shape_keys.key_blocks[0]
samples={}
for label,x,z in [('eye',.032,1.65),('upperlid',.032,1.66),('lowerlid',.032,1.64),('brow',.032,1.675),('cheek',.05,1.625),('nose',.01,1.626),('mouth',.015,1.591),('jaw',.045,1.568),('chest',.09,1.34),('axilla',.18,1.34),('clavicle',.09,1.44)]:
 vs=sorted([v for v in key.data if v.co.y<-.05],key=lambda v:(v.co.x-x)**2+(v.co.z-z)**2)[:8]
 samples[label]=[list(v.co) for v in vs]
(OUT/'source-inventory.json').write_text(json.dumps({'objects':data,'landmarks':samples},indent=2),encoding='utf8')
print('V7 source inventory complete',flush=True)
