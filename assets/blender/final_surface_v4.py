"""Final controlled-review corrections, on the recovered v4 duplicate only."""
import bpy,math,random
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path('C:/Users/shota/Documents/BulkLife')
body=bpy.data.objects['BL_V2_AthleteBody'];rig=bpy.data.objects['BL_V2_Rig']
tree=BVHTree.FromPolygons([v.co for v in body.data.shape_keys.key_blocks[0].data],[list(p.vertices) for p in body.data.polygons])
for side in [-1,1]:
    o=bpy.data.objects['BL_V4_Brow_'+str(side)];vs=[];faces=[];random.seed(901+side)
    for i in range(980):
        t=random.random();x=side*(.012+.041*t)
        # Several rows with a soft taper; project toward the real forehead surface.
        width=.0018*math.sin(math.pi*t)**.4
        z=1.6665+.0019*math.sin(t*math.pi)-.0012*t+random.uniform(-width,width)
        q,n,_,_=tree.ray_cast(Vector((x,-.35,z)),Vector((0,1,0)))
        if q is None:continue
        q+=n*.00042;d=Vector((side*(.25+.65*t),0,1-.78*t)).normalized()
        across=d.cross(n).normalized()*(.00007+.00004*random.random());length=.0017+random.random()*.0013
        j=len(vs);vs.extend([q-across,q+across,q+d*length+n*.00010]);faces.append((j,j+1,j+2))
    me=bpy.data.meshes.new('V4_BrowDensity');me.from_pydata(vs,[],faces);me.materials.append(o.data.materials[0]);o.data=me
    vg=o.vertex_groups.get('head') or o.vertex_groups.new(name='head');vg.add(list(range(len(vs))),1,'REPLACE')
    o.hide_render=False
for n in ['BL_V2_Eyebrow.L','BL_V2_Eyebrow.R']:bpy.data.objects[n].hide_render=True;bpy.data.objects[n].hide_viewport=True
skin=body.data.materials[0]
for n in skin.node_tree.nodes:
    if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.14
# Preserve the established baseline render engine, not a different renderer.
scene=bpy.data.scenes['BULK_LIFE_Studio_v2']
probe=ROOT/'tmp/baseline-renderer.txt'
engine=probe.read_text().strip() if probe.exists() else 'BLENDER_EEVEE';scene.render.engine=engine
(ROOT/'docs/qa/coach-portrait-v4/renderer.json').write_text(__import__('json').dumps({'beforeAfterEngine':engine,'source':'protected v3 authoring scene','cameraLighting':'qa_portrait_v4.py unchanged'}))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend'))
exec(compile((ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf-8'),'export_portrait_v4.py','exec'))
