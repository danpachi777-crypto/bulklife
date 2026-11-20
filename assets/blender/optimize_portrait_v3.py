import bpy,json
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife');OUT=ROOT/'assets/blender/portrait-v3-textures';OUT.mkdir(exist_ok=True)
body=bpy.data.objects['BL_V2_AthleteBody']
if not body.get('portableTexturesV3'):
    scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];scene.render.image_settings.quality=90
    for oldname,filename,size,fmt in [
        ('young_lightskinned_male_diffuse3.png','skin-albedo.jpg',2048,'JPEG'),
        ('shoes02_diffuse.png','trainers-albedo.jpg',1024,'JPEG'),
        ('BL_V2_skin-micronormal','skin-normal.png',512,'PNG'),
        ('BL_V3_AnatomicalRoughness','skin-roughness.png',512,'PNG'),
    ]:
        old=bpy.data.images.get(oldname)
        if not old:raise RuntimeError('Missing image '+oldname)
        image=old.copy()
        if image.size[0]!=size:image.scale(size,size)
        image.filepath_raw=str(OUT/filename)
        image.file_format=next(i.identifier for i in image.bl_rna.properties['file_format'].enum_items if i.identifier==fmt)
        image.save()
        portable=bpy.data.images.load(str(OUT/filename),check_existing=False);portable.colorspace_settings.name=old.colorspace_settings.name;portable.pack()
        for mat in bpy.data.materials:
            if mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type=='TEX_IMAGE' and node.image==old:node.image=portable
    body['portableTexturesV3']=True
exec(compile((ROOT/'assets/blender/polish_portrait_v3.py').read_text(encoding='utf-8'),'polish_portrait_v3.py','exec'))
