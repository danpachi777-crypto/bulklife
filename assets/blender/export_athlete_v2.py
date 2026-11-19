import bpy,json,io,contextlib,hashlib
from pathlib import Path
from types import SimpleNamespace
import io_scene_gltf2
ROOT=Path('C:/Users/shota/Documents/BulkLife');scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];bpy.context.window.scene=scene
rig=bpy.data.objects['BL_V2_Rig'];meta=json.loads((ROOT/'public/assets/regions-v2.json').read_text())
io_scene_gltf2.on_export_action_filter_changed(SimpleNamespace(export_action_filter=True),bpy.context)
for item in bpy.data.scenes[0].gltf_action_filter:item.keep=item.action.name in meta['clips'] and bool(item.action.get('v2CareerClip'))
rig.animation_data.action=bpy.data.actions['Breathing'];scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.collections['BULK_LIFE_Athlete_v2'].objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
props=bpy.ops.export_scene.gltf.get_rna_type().properties;fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if '.glb' in i[1]);mode=next(i.identifier for i in props['export_animation_mode'].enum_items if i.identifier=='ACTIONS')
path=ROOT/'public/assets/athlete-v2.glb'
with contextlib.redirect_stdout(io.StringIO()):bpy.ops.export_scene.gltf(filepath=str(path),export_format=fmt,use_selection=True,use_active_scene=True,export_skins=True,export_morph=True,export_animations=True,export_animation_mode=mode,export_action_filter=True,export_extras=True)
meta['glbBytes']=path.stat().st_size;meta['glbSha256']=hashlib.sha256(path.read_bytes()).hexdigest();meta['renderTriangles']=sum(len(p.vertices)-2 for o in bpy.data.collections['BULK_LIFE_Athlete_v2'].objects if o.type=='MESH' for p in o.data.polygons)
(ROOT/'public/assets/regions-v2.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v2.blend'))
print(json.dumps({'path':str(path),'bytes':meta['glbBytes'],'triangles':meta['renderTriangles'],'bones':meta['bones'],'clips':meta['clips']}))
