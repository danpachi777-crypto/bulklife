"""Run unchanged on v6/v7 to capture identical controlled conditions."""
import bpy,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/portrait-v7'
prefix=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'after'
helper=(ROOT/'assets/blender/qa_portrait_v4.py').read_text(encoding='utf8').replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/portrait-v7'")
exec(compile(helper,'v7-neutral-helpers','exec'));setup()
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
raw=state
def state(muscle=0,fat=0,wear=False,clip='GymIdle',frame=1):
 raw(muscle,fat,wear,clip,frame)
 for o in athletes.objects:
  if o.type=='MESH' and o.data.shape_keys:
   k=o.data.shape_keys.key_blocks
   if 'shoulderRaise' in k:k['shoulderRaise'].value=1 if clip in ['FrontDoubleBiceps','BackDoubleBiceps'] else 0
   for side in ['L','R']:
    if 'elbowFlex'+side in k:
     a=rig.pose.bones['upperArm.'+side];b=rig.pose.bones['forearm.'+side];angle=(a.tail-a.head).angle(b.tail-b.head);k['elbowFlex'+side].value=max(0,min(1,(angle-.35)/1.35))
state();render(prefix+'-face-front',(0,-.92,1.63),(0,-.03,1.63),True);render(prefix+'-face-angle',(.65,-.65,1.63),(0,-.03,1.63),True);render(prefix+'-face-side',(.92,-.12,1.63),(0,-.03,1.63),True)
render(prefix+'-hair-back',(0,.84,1.67),(0,0,1.66),True)
state(wear=True);render(prefix+'-wear-stand');state(.8,.3,True,'FrontDoubleBiceps',25);render(prefix+'-wear-raised')
state(1.2,.75,True,'SeatedPrepare',193);render(prefix+'-wear-seat',(1.1,-4,1.15),(0,.2,.75))
for name,clip,eye in [('high-front','FrontDoubleBiceps',(0,-4.3,1.2)),('high-back','BackDoubleBiceps',(0,4.3,1.2))]:
 state(1.2,-.55,False,clip,25);render(prefix+'-'+name,eye)
state(1.2,-.55,False,'FrontDoubleBiceps',25);render(prefix+'-chest-close',(0,-1.9,1.4),(0,0,1.36),True)
clay=bpy.data.materials.new('V7_Clay');clay.use_nodes=True;pr=next(n for n in clay.node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Base Color'].default_value=(.16,.18,.20,1);pr.inputs['Roughness'].default_value=.8
scene.view_layers[0].material_override=clay;render(prefix+'-clay-chest',(0,-1.9,1.4),(0,0,1.36),True);scene.view_layers[0].material_override=None
state();render(prefix+'-body-front');render(prefix+'-body-side',(4.3,0,1.2));render(prefix+'-body-back',(0,4.3,1.2))
for label,m,f in [('slim',-.45,-.45),('standard',0,0),('middle',.45,.15),('muscular',1,-.55),('muscular-fat',1,.75)]:
 state(m,f);render(prefix+'-'+label)
state(1.2,.75,True,'FrontDoubleBiceps',25);render(prefix+'-wear-high-fat')
(OUT/(prefix+'-capture.json')).write_text(json.dumps({'source':bpy.data.filepath,'cameraLensFull':65,'cameraLensFace':70,'lights':[480,300,420],'sameConditions':True},indent=2),encoding='utf8')
print('V7 controlled '+prefix+' captures complete',flush=True)
