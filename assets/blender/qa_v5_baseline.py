"""Read-only comparison images from the protected v4 production file."""
import bpy
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
assert bpy.data.filepath.endswith('bulk-life-athlete-v4-final.blend')
qa=(ROOT/'assets/blender/qa_portrait_v4.py').read_text().replace("OUT=ROOT/'docs/qa/coach-portrait-v4'","OUT=ROOT/'docs/qa/consistency-v5'")
exec(qa);setup()
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
state();render('before-face-front',(0,-.92,1.63),(0,-.03,1.63),True);render('before-face-side',(.92,-.12,1.63),(0,-.03,1.63),True);render('before-hair-back',(0,.84,1.67),(0,0,1.66),True)
state(wear=True);render('before-wear-stand')
print('Protected v4 baseline rendered; source file not saved',flush=True)
