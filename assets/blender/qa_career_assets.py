"""Render pose / stage review sheets from the editable assets, restore idle."""
import bpy,math,json,io,contextlib
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');QA=ROOT/'docs/qa';QA.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes['BULK_LIFE_Studio_v1'];bpy.context.window.scene=scene
rig=bpy.data.objects['BL_AthleteRig'];cam=scene.camera
oldloc=cam.location.copy();oldrot=cam.rotation_euler.copy();oldscale=cam.data.ortho_scale
oldres=(scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage)
oldpath=scene.render.filepath;oldformat=scene.render.image_settings.file_format
fmt=next(x.identifier for x in scene.render.image_settings.bl_rna.properties['file_format'].enum_items if x.identifier=='PNG')
scene.render.image_settings.file_format=fmt;scene.render.resolution_x=500;scene.render.resolution_y=650;scene.render.resolution_percentage=100
cam.location=(2.8,-5,2.1);cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.4
out=[]
for name,frame in [('FrontDoubleBiceps',1),('FrontLatSpread',1),('SideChest',1),('BackDoubleBiceps',1),('BackLatSpread',1),('SideTriceps',1),('AbdominalsThigh',1),('MostMuscular',1),('TrainingPress',25),('TrainingRow',25),('TrainingSquat',25)]:
    rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame)
    scene.render.filepath=str(QA/('pose-'+name+'.png'))
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.render.render(write_still=True)
    out.append(scene.render.filepath)
rig.animation_data.action=bpy.data.actions['Breathing'];scene.frame_set(1)
cam.location=oldloc;cam.rotation_euler=oldrot;cam.data.ortho_scale=oldscale
scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage=oldres
scene.render.filepath=oldpath;scene.render.image_settings.file_format=oldformat

stage=bpy.data.scenes['BL_Stage_olympia'];bpy.context.window.scene=stage
if not stage.camera:
    data=bpy.data.cameras.new('BL_StageReviewCamera');ob=bpy.data.objects.new('BL_StageReviewCamera',data);stage.collection.objects.link(ob);stage.camera=ob
camera=stage.camera;camera.location=(5,-10,4);camera.rotation_euler=(Vector((0,2,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=40
for name,loc,power,size in [('BL_StageReviewKey',(-3,-2,5),1500,5),('BL_StageReviewFill',(4,1,4),1000,4)]:
    if not bpy.data.objects.get(name):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);stage.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,1,0))-o.location).to_track_quat('-Z','Y').to_euler()
stage.render.resolution_x=1100;stage.render.resolution_y=700;stage.render.resolution_percentage=100;stage.render.image_settings.file_format=fmt;stage.render.filepath=str(QA/'stage-olympia.png')
with contextlib.redirect_stdout(io.StringIO()):bpy.ops.render.render(write_still=True)
out.append(stage.render.filepath)
bpy.context.window.scene=scene
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v1.blend'))
print(json.dumps(out))
