"""A1/A3/A5 three-view gate, same neutral camera/light before and after."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/anatomy-v8';OUT.mkdir(parents=True,exist_ok=True)
helper=(ROOT/'assets/blender/qa_portrait_v4.py').read_text(encoding='utf8').replace("ROOT=Path('C:/Users/shota/Documents/BulkLife')","ROOT=Path(__file__).resolve().parents[2]").replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/anatomy-v8'")
helper=helper.replace('if coverage:coverage.show_render=wear','if coverage:coverage.show_render=wear\n    shortsCoverage=body.modifiers.get("V8_CompetitionCoverage")\n    if shortsCoverage:shortsCoverage.show_render=not wear')
exec(compile(helper,'v8-neutral-helpers','exec'));setup()
if body.get('anatomyV8'):
 path=ROOT/'assets/blender/install_coverage_v8.py';scope={'__file__':str(path),'__name__':'coverage_helpers'};exec(compile(path.read_text(),str(path),'exec'),scope);scope['install'](body)
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
scene.view_settings.exposure=-.8
clay=bpy.data.materials.new('V8_NeutralClay');clay.use_nodes=True;pr=next(n for n in clay.node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Base Color'].default_value=(.28,.31,.33,1);pr.inputs['Roughness'].default_value=.8
isNew=bool(body.get('anatomyV8'));prefix='after' if isNew else 'before'
original=list(body.data.materials)
for i in range(len(body.data.materials)):body.data.materials[i]=clay
parts=['upperChest','chest','frontDelts','sideDelts','rearDelts','lats','upperBack','erectors','biceps','triceps','forearms','quads','hamstrings','glutes','calves','abs']
for stage,m,bf in [(1,0,18),(3,.55,15),(5,1.2,7)]:
 state(0,0,False,'GymIdle',1)
 for o in athletes.objects:
  if o.type!='MESH' or not o.data.shape_keys:continue
  for k in o.data.shape_keys.key_blocks:
   k.value=m if k.name in parts else max(0,(bf-18)/18) if isNew and k.name=='bodyFat' else (bf-18)/18 if k.name=='bodyFat' else max(0,(18-bf)/12) if k.name=='leanDefinition' else 0
 for label,eye in [('FRONT',(0,-4.3,1.2)),('SIDE',(4.3,0,1.2)),('BACK',(0,4.3,1.2))]:render(f'{prefix}-A{stage}-{label}-clay',eye)
for i,m in enumerate(original):body.data.materials[i]=m
print('V8 initial anatomy gate '+prefix+' rendered',flush=True)
