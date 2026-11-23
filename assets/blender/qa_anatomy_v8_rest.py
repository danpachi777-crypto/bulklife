from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source=(ROOT/'assets/blender/qa_anatomy_v8_initial.py').read_text(encoding='utf8')
exec(compile(source[:source.index('for stage,m,bf in')],'v8-rest-helpers','exec'))
state(0,0,False,'GymIdle',1)
for name in parts:body.data.shape_keys.key_blocks[name].value=1.2
body.data.shape_keys.key_blocks['leanDefinition'].value=.9
rig.data.pose_position='REST';bpy.context.view_layer.update()
render('diagnostic-rest-A5-FRONT');render('diagnostic-rest-A5-SIDE',(4.3,0,1.2))
print('V8 rest-pose diagnostic rendered',flush=True)
