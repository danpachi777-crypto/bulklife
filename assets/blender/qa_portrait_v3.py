"""Render reproducible full-body comparisons and motion/garment inspections.
Works only on the v3 working copy; never modifies v2 sources or game saves.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife');OUT=ROOT/'docs/qa/athlete-v3';OUT.mkdir(exist_ok=True)
scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody'];col=bpy.data.collections['BULK_LIFE_Athlete_v2']
bpy.context.window.scene=scene
for name in ['BL_V2_Hair','BL_V3_HairFlow']:bpy.data.objects[name].hide_render=True
cloth=bpy.data.objects['BL_V3_TrainingTank'];shoes=bpy.data.objects['BL_V3_Trainers']
cam=scene.camera;cam.data.type='PERSP';cam.data.lens=55
scene.render.resolution_x=640;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
def view(name,location=(0,-3.7,1.2),target=(0,0,.92)):
    cam.location=location;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
def state(muscle,fat):
    for o in col.objects:
        if o.type=='MESH' and o.data.shape_keys:
            for k in list(o.data.shape_keys.key_blocks)[1:]:k.value=fat if k.name=='bodyFat' else 0 if k.name=='pump' else muscle
def clip(name,frame=1):
    rig.location.y=.48 if name=='SeatedPrepare' else .48*(1-(frame-1)/36) if name=='StandUp' else 0
    rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame)
records=[]
cloth.hide_render=True;shoes.hide_render=True
for name,m,f in [('slim',-.45,-.45),('standard',0,0),('intermediate',.45,.15),('muscular-fat',1,.75),('muscular-lean',1,-.6)]:
    state(m,f);clip('GymIdle');view(name)
    records.append({'case':name,'muscleMorph':m,'fatMorph':f,'note':'Asset-space comparison, not a saved career or real measurement'})
state(0,0);view('after-body')
view('after-face',(.24,-.80,1.67),(0,-.03,1.64))
for name,anim,frame,loc in [('developed-back','GymIdle',1,(0,3.7,1.2)),('raised-arms','TrainingPress',25,(2.1,-3.5,1.3)),('squat','TrainingSquat',25,(2.1,-3.5,1.3)),('posing-back','BackDoubleBiceps',1,(0,-3.7,1.2))]:
    state(1,-.4);clip(anim,frame);view(name,loc)
cloth.hide_render=False;shoes.hide_render=False
for name,anim,frame in [('wear-idle','GymIdle',1),('wear-raised','TrainingPress',25),('wear-squat','TrainingSquat',25),('wear-seated','SeatedPrepare',193),('wear-standing-up','StandUp',19)]:
    state(.55,.7);clip(anim,frame);view(name,(1.4,-3.7,1.25))
state(0,0);clip('GymIdle')
cloth.hide_render=False;shoes.hide_render=False
(OUT/'blender-cases.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v3-work.blend'))
print('Rendered 5 body states, front/back/raised/squat/posing and 5 garment-motion cases')
