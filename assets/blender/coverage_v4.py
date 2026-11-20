"""Author a reversible cloth occlusion preview; runtime keeps identical topology.
The full continuous body remains available when inspecting without the outfit.
"""
import bpy
body=bpy.data.objects['BL_V2_AthleteBody']
group=body.vertex_groups.get('V4_ClothEnclosed') or body.vertex_groups.new(name='V4_ClothEnclosed')
ids=[]
for i,v in enumerate(body.data.shape_keys.key_blocks[0].data):
    x,y,z=v.co
    arm=sum(g.weight for g in body.data.vertices[i].groups if body.vertex_groups[g.group].name.startswith(('finger','hand','forearm','upperArm')))
    if arm<.15 and (z<.112 or .695<z<.99 or (.985<z<1.405 and abs(x)<.16)):ids.append(i)
group.add(ids,1,'REPLACE')
mod=body.modifiers.get('V4_OutfitCoverage') or body.modifiers.new('V4_OutfitCoverage','MASK');mod.vertex_group=group.name;mod.invert_vertex_group=True;mod.show_render=False;mod.show_viewport=False
bpy.ops.wm.save_as_mainfile(filepath='C:/Users/shota/Documents/BulkLife/assets/blender/bulk-life-athlete-v4-final.blend')
