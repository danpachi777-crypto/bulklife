import bpy,json
from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
assert bpy.data.filepath.endswith('bulk-life-athlete-v5-work.blend')
bpy.ops.file.pack_all()
report={'images':[{ 'name':i.name,'packed':bool(i.packed_file),'bytes':i.packed_file.size if i.packed_file else 0} for i in bpy.data.images if i.source=='FILE'],'source':'v5 working duplicate only'}
(ROOT/'docs/qa/consistency-v5/packed-images.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v5-work.blend'))
