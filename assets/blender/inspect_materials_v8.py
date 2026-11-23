import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];report=[]
for name in ['BL_V3_Skin','V8_LicensedFeatheredHair']:
 m=bpy.data.materials[name];nodes=[]
 for n in m.node_tree.nodes:
  values={}
  for i in n.inputs:
   if not hasattr(i,'default_value'):continue
   v=i.default_value
   try:values[i.name]=list(v) if hasattr(v,'__len__') else v
   except:pass
  nodes.append({'name':n.name,'type':n.type,'blend':getattr(n,'blend_type',None),'image':n.image.name if n.type=='TEX_IMAGE' and n.image else None,'values':values})
 report.append({'material':name,'nodes':nodes,'links':[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links]})
 if name=='V8_LicensedFeatheredHair':
  image=next(n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE');pixels=image.pixels[:];w,h=image.size[:]
  report.append({'hairPixelSize':[w,h],'hairPixelSamples':[{'xy':[x,y],'value':pixels[(y*w+x)*4:(y*w+x)*4+4]} for x,y in [(700,773),(500,800),(512,512)]]})
body=bpy.data.objects['BL_V2_AthleteBody']
for o in bpy.data.objects:
 if o.name.startswith(('BL_V2_EyeWhite.','BL_V2_Iris.','BL_V2_Pupil.','BL_V4_Brow_')):
  report.append({'eyeObject':o.name,'vertices':len(o.data.vertices),'location':list(o.location),'dimensions':list(o.dimensions),'parent':o.parent.name if o.parent else None,'parentType':o.parent_type,'parentBone':o.parent_bone,'matrixWorld':[list(row) for row in o.matrix_world],'bounds':[list(v) for v in o.bound_box]})
for attr in body.data.color_attributes:
 bands={}
 for label,lo,hi in [('head',1.5,2),('torso',1,1.45),('legs',.2,.7)]:
  ids=[i for i,v in enumerate(body.data.vertices) if lo<v.co.z<hi]
  if attr.domain=='POINT':values=[attr.data[i].color[:] for i in ids]
  else:values=[attr.data[l.index].color[:] for l in body.data.loops if l.vertex_index in set(ids)]
  bands[label]=[sum(v[k] for v in values)/len(values) for k in range(3)] if values else []
 report.append({'colorAttribute':attr.name,'domain':attr.domain,'averages':bands})
(ROOT/'docs/qa/anatomy-v8/material-inspection.json').write_text(json.dumps(report,indent=2),encoding='utf8')
