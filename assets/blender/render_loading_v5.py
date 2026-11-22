import bpy
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
assert bpy.data.filepath.endswith('bulk-life-athlete-v5-work.blend')
source=(ROOT/'assets/blender/render_loading_v4.py').read_text().replace('bulk-life-athlete-v4-final.blend','bulk-life-athlete-v5-work.blend')
exec(compile(source,'render_loading_v5','exec'))
