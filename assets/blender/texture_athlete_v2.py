"""Original skin variation + portable micro-normal/roughness textures.
No photographic skin or unlicensed external image is used.
"""
import bpy,math,json
import numpy as np
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife');OUT=ROOT/'public/assets/athlete-v2-textures';OUT.mkdir(exist_ok=True)
body=bpy.data.objects['BL_V2_AthleteBody'];mat=body.data.materials[0];nodes=mat.node_tree.nodes;links=mat.node_tree.links
pr=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
fn=body.data.color_attributes.bl_rna.functions['new'];tp=next(i.identifier for i in fn.parameters['type'].enum_items if i.identifier=='FLOAT_COLOR');dm=next(i.identifier for i in fn.parameters['domain'].enum_items if i.identifier=='POINT')
attr=body.data.color_attributes.get('SkinTone') or body.data.color_attributes.new(name='SkinTone',type=tp,domain=dm)
for i,v in enumerate(body.data.vertices):
    x,y,z=v.co;noise=math.sin(x*173+z*71)*math.cos(y*293-z*137)*.004
    red=math.exp(-((z-.50)/.055)**2)*.015+math.exp(-((z-1.66)/.025)**2)*max(0,(abs(x)-.065))*.25
    lip=math.exp(-2*((x/.033)**2+((z-1.626)/.012)**2))*max(0,min(1,(-y-.09)/.04))
    base=np.array([.43+noise+red,.265+noise-red*.35,.18+noise-red*.25]);base=base*(1-lip*.5)+np.array([.34,.14,.115])*lip*.5
    attr.data[i].color=(*base,1)
node=nodes.new('ShaderNodeVertexColor');node.layer_name='SkinTone';links.new(node.outputs['Color'],pr.inputs['Base Color'])
rng=np.random.default_rng(194775);N=1024;h=rng.random((N,N)).astype(np.float32)
smooth=(h+np.roll(h,1,0)+np.roll(h,-1,0)+np.roll(h,1,1)+np.roll(h,-1,1))/5
dx=np.roll(smooth,1,1)-np.roll(smooth,-1,1);dy=np.roll(smooth,1,0)-np.roll(smooth,-1,0)
normal=np.zeros((N,N,4),np.float32);normal[:,:,0]=.5+dx*.12;normal[:,:,1]=.5+dy*.12;normal[:,:,2]=1;normal[:,:,3]=1
rough=np.zeros((N,N,4),np.float32);rough[:,:,:3]=(.52+smooth[:,:,None]*.12);rough[:,:,3]=1
for name,pixels,kind in [('skin-micronormal',normal,'normal'),('skin-roughness',rough,'rough')]:
    image=bpy.data.images.get('BL_V2_'+name) or bpy.data.images.new('BL_V2_'+name,width=N,height=N,alpha=True,is_data=True)
    image.pixels.foreach_set(pixels.ravel());image.filepath_raw=str(OUT/(name+'.png'))
    image.file_format=next(i.identifier for i in image.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG');image.save();image.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=image
    if kind=='normal':
        normal_node=nodes.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.28;links.new(tex.outputs['Color'],normal_node.inputs['Color']);links.new(normal_node.outputs['Normal'],pr.inputs['Normal'])
    else:links.new(tex.outputs['Color'],pr.inputs['Roughness'])
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps({'textureResolution':N,'vertexColors':len(attr.data),'originalProceduralTextures':True}))
