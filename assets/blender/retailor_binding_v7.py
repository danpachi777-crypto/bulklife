"""Rebuild only binding from the retained finished panel mesh, without
reapplying the facial/torso sculpt or smoothing the body a second time."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/portrait-v7'
tank=bpy.data.objects['BL_V4_TrainingTank']
panels=[m for m in bpy.data.meshes if m.name.startswith('V6_RoundNeckTank') and len(m.vertices)==1857 and m.shape_keys]
assert len(panels)==1,[m.name for m in panels]
tank.data=panels[0];assert len(tank.vertex_groups)==50
tk=tank.data.shape_keys.key_blocks
text=(ROOT/'assets/blender/finish_portrait_v7.py').read_text(encoding='utf8')
exec(compile(text[text.index('tank.data.update();old=tank.data'):text.index('report=')],'v7-ordered-binding-only','exec'))
(OUT/'binding-report.json').write_text(json.dumps({'loops':len(loops),'newVertices':len(anchor),'method':'ordered closed edge loops; smoothed real-fabric normals; one consistent inward direction per loop; outward face winding'},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v7-work.blend'))
print('V7 ordered binding rebuilt',flush=True)
