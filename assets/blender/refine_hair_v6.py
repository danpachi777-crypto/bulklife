"""Fit the licensed feathered card groom; reject the opaque-shell iteration."""
source=bpy.data.objects['BL_V3_NaturalHair'];hair=bpy.data.objects['BL_V4_Hair'];hair.data=source.data.copy()
hair.data.update();tree=BVHTree.FromPolygons([v.co for v in basis.data],[list(p.vertices) for p in body.data.polygons])
for v in hair.data.vertices:
    p,n,_,dist=tree.find_nearest(v.co);x,y,z=v.co
    # Shorter temples/nape, directed longer top and a restrained side part.
    top=smooth((z-1.686)/.055);factor=.57+.13*top
    q=p+(v.co-p)*factor
    q.z+=.0035*top*smooth((x+.05)/.10)
    q.x+=.0025*top*smooth((-y+.02)/.08)
    # Feathered UV edges remain intact; no rectangular clipping of cards.
    v.co=q
hair.data.update();mat=source.data.materials[0].copy();mat.name='V6_FittedDirectionalCards';hair.data.materials.clear();hair.data.materials.append(mat)
pr=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');pr.inputs['Roughness'].default_value=.76;pr.inputs['Specular IOR Level'].default_value=.25
base=pr.inputs['Base Color'];links=list(base.links)
if links:
    socket=links[0].from_socket;mat.node_tree.links.remove(links[0]);mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.30,.235,.18,1);mat.node_tree.links.new(socket,mix.inputs[1]);mat.node_tree.links.new(mix.outputs[0],base)
vg=hair.vertex_groups.get('head') or hair.vertex_groups.new(name='head');vg.add(list(range(len(hair.data.vertices))),1,'REPLACE')
for mod in hair.modifiers:
    if mod.type=='ARMATURE':mod.object=rig
hair['v6Groom']='licensed card flow; fitted tapered temples and nape; asymmetric top volume'
