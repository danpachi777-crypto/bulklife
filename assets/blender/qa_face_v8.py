from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
code=(ROOT/'assets/blender/qa_anatomy_v8_character.py').read_text(encoding='utf8');exec(compile(code[:code.index('bodyState(1.2,7,False')],'face-helpers','exec'))
for i,m in enumerate(original):body.data.materials[i]=m
bodyState()
for view,eye in [('FRONT',(0,-.92,1.63)),('THREEQUARTER',(.58,-.72,1.63)),('SIDE',(.92,-.12,1.63))]:render('after-face-'+view,eye,(0,-.03,1.63),True)
render('after-hair-BACK',(0,.84,1.67),(0,0,1.66),True)
body.data.shape_keys.key_blocks['blink'].value=1;render('after-face-BLINK',(0,-.92,1.63),(0,-.03,1.63),True)
