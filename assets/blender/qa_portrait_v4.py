"""Controlled before/after evidence: identical camera, lights and rendering.
Run setup on the v4 copy, then render_cases('before'/'after').
"""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/shota/Documents/BulkLife')
OUT=ROOT/'docs/qa/coach-portrait-v4';OUT.mkdir(exist_ok=True)
scene=bpy.data.scenes['BULK_LIFE_Studio_v2']
if bpy.context.window:bpy.context.window.scene=scene
rig=bpy.data.objects['BL_V2_Rig'];body=bpy.data.objects['BL_V2_AthleteBody']
athletes=bpy.data.collections['BULK_LIFE_Athlete_v2']
def setup():
    for o in scene.objects:
        if o.type=='LIGHT':o.hide_render=True
    for c in ['BULK_LIFE_Gym_v3','BULK_LIFE_Gym_v4']:
        if c in bpy.data.collections:bpy.data.collections[c].hide_render=True
    col=bpy.data.collections.get('BL_V4_QA_Neutral')
    if not col:
        col=bpy.data.collections.new('BL_V4_QA_Neutral');scene.collection.children.link(col)
        for name,loc,power,size in [('Key',(-2,-3.5,3.7),480,3),('Fill',(2,-2,2.5),300,3),('Rim',(0,2.4,3),420,2.5)]:
            data=bpy.data.lights.new('QA_'+name,'AREA');data.energy=power;data.shape='DISK';data.size=size
            o=bpy.data.objects.new('QA_'+name,data);col.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
        mesh=bpy.data.meshes.new('QA_floor');mesh.from_pydata([(-8,-8,-.025),(8,-8,-.025),(8,8,-.025),(-8,8,-.025)],[],[(0,1,2,3)])
        floor=bpy.data.objects.new('QA_floor',mesh);col.objects.link(floor)
        m=bpy.data.materials.new('QA_neutral');m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.19,.20,.21,1);p.inputs['Roughness'].default_value=.9;mesh.materials.append(m)
    col.hide_render=False
    for o in col.objects:o.hide_render=False
    scene.world.use_nodes=True
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.22,.23,.25,1);bg.inputs['Strength'].default_value=.45
    scene.render.resolution_x=640;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
    if hasattr(scene,'cycles'):scene.cycles.samples=24
    scene.render.film_transparent=False
    scene.camera=bpy.data.objects['BL_V3_GymCamera'];scene.camera.data.type='PERSP';scene.camera.data.lens=65
def state(muscle=0,fat=0,wear=False,clip='GymIdle',frame=1):
    coverage=body.modifiers.get('V4_OutfitCoverage')
    if coverage:coverage.show_render=wear
    for o in athletes.objects:
        if o.type=='MESH' and o.data.shape_keys:
            for k in list(o.data.shape_keys.key_blocks)[1:]:k.value=fat if k.name=='bodyFat' else (1 if wear and clip=='SeatedPrepare' else 0) if k.name=='seatedCloth' else 0 if k.name in ['pump','blink'] else muscle
    for n in ['BL_V2_Hair','BL_V3_HairFlow']:
        if n in bpy.data.objects:bpy.data.objects[n].hide_render=True
    if 'BL_V4_Hair' in bpy.data.objects:
        bpy.data.objects['BL_V3_NaturalHair'].hide_render=True;bpy.data.objects['BL_V4_Hair'].hide_render=False
    else:bpy.data.objects['BL_V3_NaturalHair'].hide_render=False
    for n in ['BL_V3_TrainingTank','BL_V4_TrainingTank','BL_V4_TrainingShorts','BL_V3_Trainers']:
        if n in bpy.data.objects:bpy.data.objects[n].hide_render=not wear
    bpy.data.objects['BL_V2_Shorts'].hide_render=wear and 'BL_V4_TrainingShorts' in bpy.data.objects
    if 'BL_V3_TrainingTank' in bpy.data.objects and 'BL_V4_TrainingTank' in bpy.data.objects:bpy.data.objects['BL_V3_TrainingTank'].hide_render=True
    rig.location=(0,.48 if clip=='SeatedPrepare' else .24 if clip=='StandUp' else 0,0)
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame)
def render(name,eye=(0,-4.3,1.2),target=(0,0,.91),face=False):
    scene.camera.location=eye;scene.camera.rotation_euler=(Vector(target)-Vector(eye)).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_y=640 if face else 900;scene.camera.data.lens=70 if face else 65
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True,scene=scene.name)
def render_cases(prefix,full=True):
    setup();state()
    render(prefix+'-face-front',(0,-.92,1.63),(0,-.03,1.63),True)
    render(prefix+'-face-side',(.92,-.12,1.63),(0,-.03,1.63),True)
    render(prefix+'-hair-back',(0,.84,1.67),(0,0,1.66),True)
    render(prefix+'-body-front');render(prefix+'-body-side',(4.3,0,1.2));render(prefix+'-body-back',(0,4.3,1.2))
    state(wear=True);render(prefix+'-wear-stand')
    state(wear=True,clip='SeatedPrepare',frame=193);render(prefix+'-wear-seat',(1.1,-4,1.15),(0,.2,.75))
    if full:
        for label,m,f in [('slim',-.45,-.45),('standard',0,0),('middle',.45,.15),('muscular',1,-.55),('muscular-fat',1,.75)]:
            state(m,f);render(prefix+'-'+label)
        for label,c,frame in [('raised','TrainingPress',25),('squat','TrainingSquat',25),('stand-up','StandUp',19)]:
            state(.6,.6,True,c,frame);render(prefix+'-'+label,(1.7,-4,1.25))
    state();
    (OUT/'controlled-capture.json').write_text(json.dumps({'cameraLensFull':65,'cameraLensFace':70,'fullEye':[0,-4.3,1.2],'faceEye':[0,-.92,1.63],'resolution':[640,900],'lighting':'QA neutral key 480 / fill 300 / rim 420; unchanged before and after','notes':'Neutral Blender evidence; browser screenshots are separate.'},indent=2))
