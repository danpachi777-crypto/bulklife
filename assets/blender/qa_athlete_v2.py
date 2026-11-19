"""Comparable image QA for v2 anatomy and high-deformation poses."""
import bpy,math,json,io,contextlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');QA=ROOT/'docs/qa/athlete-v2';QA.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];bpy.context.window.scene=scene;rig=bpy.data.objects['BL_V2_Rig'];cam=scene.camera
body=bpy.data.objects['BL_V2_AthleteBody'];shorts=bpy.data.objects['BL_V2_Shorts'];scene.eevee.taa_render_samples=16
scene.render.resolution_x=560;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
cases=[('front','Breathing',1,(0,-5,1.15),False),('side','Breathing',1,(5,0,1.15),False),('back','Breathing',1,(0,5,1.15),False),('three-quarter','Breathing',1,(2.8,-5,1.8),False),('grown-front','Breathing',1,(0,-5,1.15),True),('grown-back','Breathing',1,(0,5,1.15),True),('double-biceps','FrontDoubleBiceps',1,(0,-5,1.15),True),('back-double-biceps','BackDoubleBiceps',1,(0,-5,1.15),True),('side-chest','SideChest',1,(2.8,-5,1.8),True),('squat-side','TrainingSquat',25,(5,0,1.2),False),('press','TrainingPress',25,(2.8,-5,1.8),False),('face','Breathing',1,(0,-5,1.65),False)]
out=[]
for filename,clip,frame,eye,grown in cases:
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame)
    for mesh in [body,shorts]:
        for key in list(mesh.data.shape_keys.key_blocks)[1:]:key.value=(1.0 if key.name not in ['bodyFat','pump'] else -.15 if key.name=='bodyFat' else .2) if grown else 0
    cam.location=eye;target=Vector((0,0,1.65 if filename=='face' else .96));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.42 if filename=='face' else 2.35
    scene.render.filepath=str(QA/(filename+'.png'));bpy.context.view_layer.update()
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.render.render(write_still=True)
    out.append(str(scene.render.filepath))
for mesh in [body,shorts]:
    for key in list(mesh.data.shape_keys.key_blocks)[1:]:key.value=0
rig.animation_data.action=bpy.data.actions['Breathing'];scene.frame_set(1);cam.location=(2.8,-5,1.8);cam.rotation_euler=(Vector((0,0,.96))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.15
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps(out))
