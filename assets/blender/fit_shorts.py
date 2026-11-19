"""Fit an opaque garment to the athlete's own surface and share all morphs/weights.
Run in the existing BULK LIFE scene. Keeps previous clothes in a hidden archive.
"""
import bpy, json, shutil
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
body=bpy.data.objects['BL_AthleteBody'];rig=bpy.data.objects['BL_AthleteRig']
collection=bpy.data.collections['BULK_LIFE_Athlete_v1']
if bpy.data.objects.get('StudioWall'):bpy.data.objects['StudioWall'].location.y=6.5
for studio_object in bpy.context.scene.objects:
    if studio_object.name.startswith('OakSlat'):studio_object.location.y=6.42
backup=ROOT/'assets/blender/bulk-life-before-fitted-shorts.blend'
if not backup.exists():shutil.copy2(ROOT/'assets/blender/bulk-life-athlete-v1.blend',backup)
archive=bpy.data.collections.get('BL_PreviousClothes')
if not archive:
    archive=bpy.data.collections.new('BL_PreviousClothes');bpy.context.scene.collection.children.link(archive)
for o in list(collection.objects):
    if o.name.startswith(('BL_Shorts','BL_FittedShorts')):
        collection.objects.unlink(o);archive.objects.link(o);o.name='Archived_'+o.name
archive.hide_render=True;archive.hide_viewport=True
body.data.update();bpy.context.view_layer.update()
faces=[p for p in body.data.polygons if .765 <= p.center.z <= 1.022 and abs(p.center.x)<.23]
indices=sorted({i for p in faces for i in p.vertices});lookup={old:new for new,old in enumerate(indices)}
offset=.012
verts=[body.data.vertices[i].co+body.data.vertices[i].normal*offset for i in indices]
mesh=bpy.data.meshes.new('BL_FittedShorts_Surface')
mesh.from_pydata(verts,[],[tuple(lookup[i] for i in p.vertices) for p in faces]);mesh.update()
garment=bpy.data.objects.new('BL_FittedShorts',mesh);collection.objects.link(garment)
garment.data.materials.append(bpy.data.materials['BL_Shorts'])
for p in mesh.polygons:p.use_smooth=True
garment.shape_key_add(name='Basis',from_mix=False)
for key in list(body.data.shape_keys.key_blocks)[1:]:
    k=garment.shape_key_add(name=key.name,from_mix=False);k.slider_min=key.slider_min;k.slider_max=key.slider_max;k.value=0
    for j,i in enumerate(indices):k.data[j].co=verts[j]+key.data[i].co-body.data.vertices[i].co
for group in body.vertex_groups:
    if not group.name.startswith('region_'):garment.vertex_groups.new(name=group.name)
for j,i in enumerate(indices):
    for g in body.data.vertices[i].groups:
        name=body.vertex_groups[g.group].name
        if name in garment.vertex_groups:garment.vertex_groups[name].add([j],g.weight,'REPLACE')
garment.parent=rig
mod=garment.modifiers.new('SharedSkinning','ARMATURE');mod.object=rig
garment['assetVersion']='athlete-v1';garment['garmentRevision']='fitted-shorts-1'
garment['coverage']='Body surface z .765..1.022m, offset 12mm, same morph deltas and weights'
garment['bodyVertexIndices']=indices
mapping={'version':'fitted-shorts-1','bodyVertexIndices':indices,'offsetMetres':offset,'zRange':[.765,1.022]}
(ROOT/'public/assets/shorts-fit-v1.json').write_text(json.dumps(mapping),encoding='utf-8')
bpy.context.view_layer.update()
for o in collection.objects:
    if o.type=='MESH' and (max(o.dimensions)>2 or min(o.dimensions)<0):raise RuntimeError('Invalid asset size: '+o.name)
bpy.ops.object.select_all(action='DESELECT')
for o in collection.objects:o.select_set(True)
bpy.context.view_layer.objects.active=rig
import io_scene_gltf2
fmt=next(i[0] for i in io_scene_gltf2.get_format_items(bpy.context.scene,bpy.context) if '.glb' in i[1])
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/athlete-v1.glb'),export_format=fmt,use_selection=True,export_skins=True,export_morph=True,export_animations=True,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v1.blend'))
print(json.dumps({'garment':garment.name,'vertices':len(indices),'faces':len(faces),'dimensions':list(garment.dimensions),'morphs':len(garment.data.shape_keys.key_blocks)-1}))
