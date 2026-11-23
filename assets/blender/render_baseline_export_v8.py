"""Actual protected v7 GLB, matched renderer/cameras, for export-path comparison."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
code=(ROOT/'assets/blender/render_exported_v8.py').read_text(encoding='utf8');code=code[:code.index("for frame in ['standard','tall','broad']:\n scene,rig=")];code=code.replace("f'public/assets/athlete-v8-{frame}.glb'","'public/assets/athlete-v7.glb'")
exec(compile(code,'v7-export-helpers','exec'))
scene,rig=resetScene('standard');setState({})
for view,eye in [('FRONT',(0,-.92,1.63)),('THREEQUARTER',(.58,-.72,1.63)),('SIDE',(.92,-.12,1.63)),('HAIR-BACK',(0,.84,1.67))]:capture('before-export-face-'+view,eye,(0,-.03,1.63),True)
for view,eye in [('FRONT',(0,-4.3,1.2)),('SIDE',(4.3,0,1.2)),('BACK',(0,4.3,1.2))]:capture('before-export-body-'+view,eye)
print('Protected v7 actual GLB comparison rendered',flush=True)
