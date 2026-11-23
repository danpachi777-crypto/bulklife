"""Bake a restrained, continuous skin albedo using the existing UVs.
This is a material bake, not painted anatomy or a change to facial identity.
The protected v6/v7 textures and production files are never overwritten.
"""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];body=bpy.data.objects['BL_V2_AthleteBody'];scene=bpy.context.scene
assert Path(bpy.data.filepath).name=='bulk-life-athlete-v8-work.blend'
for k in body.data.shape_keys.key_blocks:k.value=0
for modifier in body.modifiers:
 if modifier.type=='MASK':modifier.show_render=False;modifier.show_viewport=False
def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
attr=body.data.color_attributes.new(name='V8_BakeSaturation',type='FLOAT_COLOR',domain='POINT')
for i,p in enumerate(body.data.vertices):
 leg=1-s((p.co.z-.85)/.22);arm=s((abs(p.co.x)-.20)/.14)*(1-s((p.co.z-1.38)/.12))
 saturation=1-.32*leg-.08*arm;attr.data[i].color=(saturation,saturation,saturation,1)
material=body.data.materials[0];nodes=material.node_tree.nodes;links=material.node_tree.links;pr=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
# Re-entrant: always use the protected original, never desaturate a previous bake.
source=next(n for n in nodes if n.type=='TEX_IMAGE' and n.image and n.image.name=='BL_V6_SkinAlbedo').outputs['Color']
for image in list(bpy.data.images):
 if image.name.startswith('V8_ContinuousSkinAlbedo'):bpy.data.images.remove(image)
mask=nodes.new('ShaderNodeVertexColor');mask.layer_name=attr.name;sat=nodes.new('ShaderNodeHueSaturation');links.new(source,sat.inputs['Color']);links.new(mask.outputs['Color'],sat.inputs['Saturation'])
emission=nodes.new('ShaderNodeEmission');links.new(sat.outputs['Color'],emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface'])
image=bpy.data.images.new('V8_ContinuousSkinAlbedo',width=2048,height=2048,alpha=False);image.colorspace_settings.name='sRGB';target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
scene.render.engine='CYCLES';scene.cycles.samples=1;scene.cycles.use_denoising=False
bpy.ops.object.select_all(action='DESELECT');body.hide_set(False);body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.object.bake(type='EMIT',use_clear=True,margin=12)
pixels=image.pixels[:];samples={}
for region,test in [('feet',lambda p:p.z<.112),('thighs',lambda p:.70<p.z<.94)]:
 values=[]
 for loop in body.data.loops:
  if not test(body.data.vertices[loop.vertex_index].co):continue
  uv=body.data.uv_layers.active.data[loop.index].uv;x=max(0,min(2047,int(uv.x*2048)));y=max(0,min(2047,int(uv.y*2048)));j=(y*2048+x)*4;values.append(sum(pixels[j:j+3])/3)
 samples[region]={'meanRGB':sum(values)/len(values),'nonBlackFraction':sum(v>.025 for v in values)/len(values)}
 assert samples[region]['nonBlackFraction']>.97,(region,'unbaked skin',samples[region])
destination=ROOT/'assets/textures/anatomy-v8/skin-albedo.png';destination.parent.mkdir(parents=True,exist_ok=True);image.filepath_raw=str(destination);image.file_format='PNG';image.save();image.pack()
links.new(target.outputs['Color'],pr.inputs['Base Color']);links.new(pr.outputs['BSDF'],output.inputs['Surface'])
for n in [mask,sat,emission]:nodes.remove(n)
body.data.color_attributes.remove(attr)
for attr in body.data.color_attributes:
 for v in attr.data:v.color=(1,1,1,1)
body['v8SkinBake']='existing licensed albedo, leg saturation reduced32%, arm8%, actual UV material bake; no new painted muscle/vein shadows'
scene.render.engine='BLENDER_EEVEE'
(ROOT/'docs/qa/anatomy-v8/skin-bake.json').write_text(json.dumps({'source':'BL_V6_SkinAlbedo (derived from CC0 MakeHuman skin)','target':str(destination.relative_to(ROOT)),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'resolution':[2048,2048],'anatomyPainted':False,'adjustment':body['v8SkinBake'],'coverageMaskDuringBake':False,'previousBug':'outfit coverage had left feet and hidden thigh UVs black; entire body is now baked and sampled','verifiedRegions':samples},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
print('V8 actual UV skin material baked',flush=True)
