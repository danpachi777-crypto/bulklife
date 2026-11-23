"""Authoring preview counterpart of the game's separate shorts coverage policy."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def install(body):
 group=body.vertex_groups.get('V8_UnderShortsVisible') or body.vertex_groups.new(name='V8_UnderShortsVisible');group.add(list(range(len(body.data.vertices))),1,'REPLACE');frame=body.get('frameV8','standard');leg=-.032 if frame=='broad' else .042 if frame=='tall' else 0
 def s(t):t=max(0,min(1,t));return t*t*(3-2*t)
 for i,p in enumerate(body.data.vertices):
  arm=sum(g.weight for g in p.groups if body.vertex_groups[g.group].name.startswith(('upperArm','forearm','hand','finger')));z=p.co.z
  if leg:
   for _ in range(12):z=p.co.z-leg*(z/.95 if z<.95 else 1-s((z-.95)/.55))
  if arm<.15 and .80<z<.975:group.add([i],0,'REPLACE')
 modifier=body.modifiers.get('V8_CompetitionCoverage') or body.modifiers.new('V8_CompetitionCoverage','MASK');modifier.vertex_group=group.name;modifier.show_viewport=False;modifier.show_render=False
if __name__=='__main__':
 for suffix in ['', '-standard','-tall','-broad']:
  file=ROOT/f'assets/blender/bulk-life-athlete-v8{suffix}-work.blend';bpy.ops.wm.open_mainfile(filepath=str(file));install(bpy.data.objects['BL_V2_AthleteBody']);bpy.ops.wm.save_as_mainfile(filepath=str(file))
 print('v8 authoring shorts coverage installed without changing skin topology',flush=True)
