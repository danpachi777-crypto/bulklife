"""Blender six height/adiposity silhouettes and fitted garment deformation checks."""
import bpy,json,math,io,contextlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');QA=ROOT/'docs/qa/athlete-v2';scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];bpy.context.window.scene=scene
body=bpy.data.objects['BL_V2_AthleteBody'];shorts=bpy.data.objects['BL_V2_Shorts'];rig=bpy.data.objects['BL_V2_Rig'];cam=scene.camera;meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text())
def morph(growth=0,fat=0,pump=0):
    for o in [body,shorts]:
        for k in list(o.data.shape_keys.key_blocks)[1:]:k.value=fat if k.name=='bodyFat' else pump if k.name=='pump' else growth
def render(name,eye=(0,-5,1.15)):
    cam.location=eye;cam.rotation_euler=(Vector((0,0,.96))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.35;scene.render.filepath=str(QA/(name+'.png'));bpy.context.view_layer.update()
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.render.render(write_still=True)
profiles=[('P1',172,18,0),('P2',178,17,.12),('P3',175,20,.03),('P4',169,15,-.08),('P5',181,27,.15),('P6',185,16,-.04)]
rig.animation_data.action=bpy.data.actions['Breathing'];scene.frame_set(1)
for name,height,fat,growth in profiles:
    rig.scale=(height/172,height/177,height/177);morph(growth,(fat-18)/20);render('profile-'+name)
rig.scale=(1,1,1)
for name,growth,fat,pump in [('extreme-lean',1.5,-.6,1.5),('extreme-fat',1.5,1.5,0)]:
    morph(growth,fat,pump);render(name,(2.8,-5,1.8))
records=[]
for variant,growth,fat,pump in [('initial',0,0,0),('grown',1,0,.2),('extreme-lean',1.5,-.6,1.5),('extreme-fat',1.5,1.5,0)]:
    morph(growth,fat,pump)
    for clip in ['Idle','FrontDoubleBiceps','SideChest','TrainingSquat']:
        rig.animation_data.action=bpy.data.actions[clip]
        for frame in [1,25,49]:
            scene.frame_set(frame);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();bo=body.evaluated_get(deps);so=shorts.evaluated_get(deps);bm=bo.to_mesh();sm=so.to_mesh();gaps=[]
            for j,samples in enumerate(meta['garmentSamples']):
                point=sum((bm.vertices[int(i)].co*w for i,w in samples),Vector());normal=sum((bm.vertices[int(i)].normal*w for i,w in samples),Vector()).normalized();gaps.append((sm.vertices[j].co-point).dot(normal))
            assert all(math.isfinite(v) for v in gaps)
            records.append({'variant':variant,'clip':clip,'frame':frame,'minNormalGapMetres':min(gaps),'maxNormalGapMetres':max(gaps),'negativeVertexCount':sum(v<0 for v in gaps)})
            bo.to_mesh_clear();so.to_mesh_clear()
morph();rig.animation_data.action=bpy.data.actions['Breathing'];scene.frame_set(1);render('final-three-quarter',(2.8,-5,1.8))
report={'sixProfileRenders':profiles,'profileNote':'Height/fat/profile silhouette QA; gameplay capacity calculations stay in the application. Blender axes are x width, y depth, z height.','garmentSamplesChecked':len(meta['garmentSamples']),'deformationRecords':records,'minimumGapMetres':min(r['minNormalGapMetres'] for r in records),'limitations':'Normal gap at corresponding skin samples is a deformation diagnostic, not an exhaustive triangle collision proof.'}
(QA/'blender-extremes.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'renders':9,'garmentCases':len(records),'minimumGapMetres':report['minimumGapMetres']}))
