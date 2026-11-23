from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];code=(ROOT/'assets/blender/render_exported_v8.py').read_text();code=code[:code.index("for frame in ['standard','tall','broad']:\n scene,rig=")];exec(compile(code,'cutout-qa','exec'))
scene,rig=resetScene('standard');setState({});capture('diagnostic-runtime-cutout-face',(0,-.92,1.63),(0,-.03,1.63),True)
