"""Same neutral setup as the captured v3 baseline; browser evidence is separate."""
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
exec(compile((ROOT/'assets/blender/coverage_v4.py').read_text(encoding='utf-8'),'coverage_v4.py','exec'))
exec(compile((ROOT/'assets/blender/qa_portrait_v4.py').read_text(encoding='utf-8'),'qa_portrait_v4.py','exec'))
render_cases('after',True)
state();body.data.shape_keys.key_blocks['blink'].value=1
render('after-face-blink',(0,-.92,1.63),(0,-.03,1.63),True)
state(wear=True);body.data.shape_keys.key_blocks['blink'].value=0
for m,f,name in [(-.45,-.45,'slim'),(.45,.15,'middle'),(1,.75,'muscular-fat')]:
    state(m,f,True);render('after-wear-'+name)
