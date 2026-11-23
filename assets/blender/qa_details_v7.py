import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
text=(ROOT/'assets/blender/qa_portrait_v7.py').read_text(encoding='utf8')
exec(compile(text[:text.index("state();render(prefix+'-face-front'")],'v7-detail-helpers','exec'))
state(wear=True);render(prefix+'-cloth-neck',(0,-1.6,1.42),(0,0,1.38),True);render(prefix+'-cloth-hem',(0,-1.25,1.12),(0,0,1.02),True)
state();body.data.shape_keys.key_blocks['blink'].value=1;render(prefix+'-blink',(0,-.92,1.63),(0,-.03,1.63),True)
print('V7 cloth edge and blink details complete',flush=True)
