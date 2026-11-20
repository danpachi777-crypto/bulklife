import bpy
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
for name in ['BL_V4_TrainingTank','BL_V4_TrainingShorts']:
    o=bpy.data.objects.get(name)
    if o:bpy.data.objects.remove(o,do_unlink=True)
body=bpy.data.objects['BL_V2_AthleteBody']
if 'garmentsV4' in body:del body['garmentsV4']
exec(compile((ROOT/'assets/blender/garments_v4.py').read_text(encoding='utf-8'),'garments_v4.py','exec'))
exec(compile((ROOT/'assets/blender/final_surface_v4.py').read_text(encoding='utf-8'),'final_surface_v4.py','exec'))
