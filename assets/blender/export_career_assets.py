"""Non-destructive export of the authored athlete / 8 stages / gym / dumbbell."""
import bpy,json,io,contextlib
from pathlib import Path
from types import SimpleNamespace
import io_scene_gltf2
ROOT=Path('C:/Users/shota/Documents/BulkLife');OUT=ROOT/'public/assets'
manifest=json.loads((OUT/'career-assets-v1.json').read_text(encoding='utf-8'))
rig=bpy.data.objects['BL_AthleteRig'];studio=bpy.data.scenes['BULK_LIFE_Studio_v1']
fmt=next(x[0] for x in io_scene_gltf2.get_format_items(studio,bpy.context) if '.glb' in x[1])
io_scene_gltf2.on_export_action_filter_changed(SimpleNamespace(export_action_filter=True),bpy.context)
for item in bpy.data.scenes[0].gltf_action_filter:item.keep=item.action.name in manifest['clips']
def export(sc,c,path,animate=False):
    bpy.context.window.scene=sc;bpy.ops.object.select_all(action='DESELECT')
    for o in c.all_objects:
        if not o.hide_render:o.select_set(True)
    props=bpy.ops.export_scene.gltf.get_rna_type().properties
    kwargs=dict(filepath=str(OUT/path),export_format=fmt,use_selection=True,use_active_scene=True,export_skins=True,export_morph=True,export_animations=animate,export_extras=True)
    if animate:
        bpy.context.view_layer.objects.active=rig
        kwargs['export_animation_mode']=next(x.identifier for x in props['export_animation_mode'].enum_items if x.identifier=='ACTIONS')
        kwargs['export_action_filter']=True
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.export_scene.gltf(**kwargs)
    return {'file':path,'bytes':(OUT/path).stat().st_size,'objects':len(c.all_objects)}
out=[]
out.append(export(studio,bpy.data.collections['BULK_LIFE_Athlete_v1'],'athlete-v1.glb',True))
for stage in manifest['stages']:
    name='BL_Stage_'+stage['id'];out.append(export(bpy.data.scenes[name],bpy.data.collections[name+'_Geometry'],Path(stage['url']).name))
for name,path in [('BL_GymEnvironment','gym-v1.glb'),('BL_DumbbellGrip','dumbbell-v1.glb')]:out.append(export(bpy.data.scenes[name],bpy.data.collections[name+'_Geometry'],path))
bpy.context.window.scene=studio;rig.animation_data.action=bpy.data.actions['Breathing'];studio.frame_set(1)
studio['careerAssetsCreated']='career-assets-v1'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v1.blend'))
print(json.dumps(out))
