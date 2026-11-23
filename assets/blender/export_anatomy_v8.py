"""Export the actual v8 working copy; versions and references are content hashed."""
import bpy,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
assert Path(bpy.data.filepath).name.startswith('bulk-life-athlete-v8')
body=bpy.data.objects['BL_V2_AthleteBody'];frame=body.get('frameV8','standard');authoring=bpy.data.filepath
for modifier in body.modifiers:
 if modifier.type=='MASK':modifier.show_render=False;modifier.show_viewport=False
code=(ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf8').replace("ROOT=Path('C:/Users/shota/Documents/BulkLife')","ROOT=Path(__file__).resolve().parents[2]").replace('athlete-v4.glb',f'athlete-v8-{frame}.glb').replace('portrait-v4.json',f'portrait-v8-{frame}.json').replace("'portrait-v4'","'anatomy-v8'").replace("str(ROOT/'assets/blender/bulk-life-athlete-v4-final.blend')",'authoring')
exec(compile(code,'export-anatomy-v8','exec'))
path=ROOT/f'public/assets/portrait-v8-{frame}.json';meta=json.loads(path.read_text())
helper=ROOT/'assets/blender/gltf_materials_v8.py';scope={};exec(compile(helper.read_text(),str(helper),'exec'),scope);glb=ROOT/f'public/assets/athlete-v8-{frame}.glb';scope['preserve_materials'](glb)
meta.update({'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'glbBytes':glb.stat().st_size,'hairAlphaMode':'MASK','hairAlphaCutoff':.18,'exportMaterialCorrection':'licensed hair RGB multiply(.30,.235,.18) retained as standard glTF baseColorFactor; MASK alpha.18 matches the game; checked again after import'})
meta.update({'revision':'anatomy-v8','frame':frame,'groomRevision':bpy.data.objects['BL_V4_Hair'].get('v8FeatheredHairline','pre-fringe'),'authoring':str(Path(authoring).relative_to(ROOT)).replace('\\','/'),'morphs':[k.name for k in body.data.shape_keys.key_blocks if k.name!='Basis'],'poseMorphs':['shoulderRaise','shoulderRaiseMuscle','elbowFlexL','elbowFlexR','elbowMuscleL','elbowMuscleR','seatedHandsMuscle','seatedHandsFat']+[k.name for k in body.data.shape_keys.key_blocks if k.name.startswith('seatedSeat')],'fatMapping':'positive bodyFat + independent leanDefinition; no negative obese extrapolation','referencePack':'docs/qa/anatomy-v8/reference/02_IMAGE_INDEX.csv','simulationVersionChanged':False})
path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf8')
print('EXPORTED V8 '+frame,flush=True)
