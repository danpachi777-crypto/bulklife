import bpy,json
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
source=(ROOT/'assets/blender/refine_v5.py').read_text(encoding='utf-8')
exec(source[:source.index('# Broader distal')])
# Cloth hems should read as fabric, not a thick plate. Keep the independent mesh.
for name in ['BL_V4_TrainingTank','BL_V4_TrainingShorts']:
    o=bpy.data.objects[name]
    for modifier in o.modifiers:
        if modifier.type=='SOLIDIFY':modifier.thickness=min(modifier.thickness,.0018)
skin=body.data.color_attributes.get('SkinTone')
if skin:
    for i,p in enumerate(body.data.shape_keys.key_blocks[0].data):
        lower=1-smooth((p.co.z-.72)/.28)
        skin.data[i].color=(.96-.10*lower,.95+.025*lower,.94+.035*lower,1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v5-work.blend'))
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text().replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/consistency-v5'")
exec(qa);setup()
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
state(wear=True,clip='SeatedPrepare',frame=193);keys['shoulderRaise'].value=0;render('after-seat',(1.1,-4,1.15),(0,.2,.75));render('after-hands',(.45,-1.4,1.2),(0,-.2,.75),True)
for label,m,f in [('slim',-.45,-.45),('standard',0,0),('middle',.45,.15),('muscular',1,-.55),('muscular-fat',1,.75)]:
    state(m,f);keys['shoulderRaise'].value=0;render('after-'+label)
state(.65,0,False,'FrontDoubleBiceps',25);keys['shoulderRaise'].value=1;render('after-pose')
state();keys['shoulderRaise'].value=0;render('after-front');render('after-side',(4.3,0,1.2));render('after-back',(0,4.3,1.2))
state();render('after-face',(0,-.92,1.63),(0,-.03,1.63),True)
# Export using the existing proven selected-mesh pipeline, with new file names.
export=(ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf-8').replace('athlete-v4.glb','athlete-v5.glb').replace('portrait-v4.json','portrait-v5.json').replace("'portrait-v4'","'portrait-v5'").replace('bulk-life-athlete-v4-final.blend','bulk-life-athlete-v5-work.blend')
exec(compile(export,'export_portrait_v5','exec'))
meta=json.loads((ROOT/'public/assets/portrait-v5.json').read_text());meta['poseMorphs']=['shoulderRaise'];(ROOT/'public/assets/portrait-v5.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
print('V5 final pose, garment, complexion, comparisons and game GLB exported',flush=True)
