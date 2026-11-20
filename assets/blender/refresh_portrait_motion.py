import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path('C:/Users/shota/Documents/BulkLife');rig=bpy.data.objects['BL_V2_Rig'];scene=bpy.data.scenes['BULK_LIFE_Studio_v2'];body=bpy.data.objects['BL_V2_AthleteBody']
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
for name in ['GymIdle','SeatedPrepare','StandUp']:
    a=bpy.data.actions.get(name)
    if a:bpy.data.actions.remove(a)
s=(ROOT/'assets/blender/animate_athlete_v2.py').read_text(encoding='utf-8');exec(s[s.index('def reset():'):s.index('made={}')])
s=(ROOT/'assets/blender/refine_athlete_v3.py').read_text(encoding='utf-8');exec(s[s.index('def seated(t):'):s.index("body['portraitRevision']")])
exec(compile((ROOT/'assets/blender/polish_portrait_v3.py').read_text(encoding='utf-8'),'polish_portrait_v3.py','exec'))
