"""Calibrate the inconsistent photographed leg albedo on a new image copy.
Retains local variation; never paints muscle lines or overwrites source textures.
"""
import bpy,numpy as np,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];body=bpy.data.objects['BL_V2_AthleteBody'];basis=body.data.shape_keys.key_blocks[0]
mat=body.data.materials[0];pr=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
def upstream_images(socket,seen=None):
    seen=set() if seen is None else seen;result=[]
    for link in socket.links:
        node=link.from_node
        if node in seen:continue
        seen.add(node)
        if node.type=='TEX_IMAGE' and node.image:result.append(node)
        for inp in node.inputs:result+=upstream_images(inp,seen)
    return result
nodes=upstream_images(pr.inputs['Base Color']);assert nodes,'No skin albedo image'
source=nodes[0].image;image=source.copy();image.name='BL_V6_SkinAlbedo';w,h=image.size[:];pixels=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4);mask=np.zeros((h,w),dtype=np.float32);upper=np.zeros((h,w),dtype=np.float32)
uv=body.data.uv_layers.active
for poly in body.data.polygons:
    ids=list(poly.loop_indices)
    for j in range(1,len(ids)-1):
        loops=[ids[0],ids[j],ids[j+1]];coords=np.array([[uv.data[k].uv.x*(w-1),uv.data[k].uv.y*(h-1)] for k in loops]);zs=np.array([basis.data[body.data.loops[k].vertex_index].co.z for k in loops]);a,b,c=coords
        lo=np.maximum(np.floor(coords.min(axis=0)).astype(int),0);hi=np.minimum(np.ceil(coords.max(axis=0)).astype(int),[w-1,h-1])
        if np.any(hi<lo):continue
        xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-6:continue
        u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;v=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;t=1-u-v;inside=(u>=-.01)&(v>=-.01)&(t>=-.01);z=u*zs[0]+v*zs[1]+t*zs[2]
        blend=np.clip((1.05-z)/.20,0,1)*inside;region=mask[lo[1]:hi[1]+1,lo[0]:hi[0]+1];np.maximum(region,blend,out=region)
        region=upper[lo[1]:hi[1]+1,lo[0]:hi[0]+1];np.maximum(region,inside*(z>1.12)*(z<1.40),out=region)
leg_rgb=np.median(pixels[mask>.9,:3],axis=0);upper_rgb=np.median(pixels[upper>.9,:3],axis=0);gain=np.clip(upper_rgb/np.maximum(leg_rgb,.01),.92,1.16)
pixels[:,:,:3]*=1+mask[:,:,None]*(gain-1);pixels[:,:,:3]=np.clip(pixels[:,:,:3],0,1)
image.pixels.foreach_set(pixels.ravel());image.pack();nodes[0].image=image
color=body.data.color_attributes.get('SkinTone')
if color:
    for v in color.data:v.color=(.96,.96,.96,1)
for node in mat.node_tree.nodes:
    if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.10
report={'sourceImage':source.name,'newImage':image.name,'legMedianBefore':leg_rgb.tolist(),'upperMedian':upper_rgb.tolist(),'boundedGain':gain.tolist(),'method':'UV raster mask, continuous lower-body blend. Local texture variation retained; no painted muscle shadows.'}
(ROOT/'docs/qa/decisions-v6/surface-calibration.json').write_text(json.dumps(report,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v6-work.blend'))
export=(ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf8').replace('athlete-v4.glb','athlete-v6.glb').replace('portrait-v4.json','portrait-v6.json').replace("'portrait-v4'","'portrait-v6'").replace('bulk-life-athlete-v4-final.blend','bulk-life-athlete-v6-work.blend')
exec(compile(export,'export_portrait_v6','exec'))
path=ROOT/'public/assets/portrait-v6.json';meta=json.loads(path.read_text());meta['poseMorphs']=['shoulderRaise'];path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8')
print('V6 independent albedo copy calibrated and exported',flush=True)
