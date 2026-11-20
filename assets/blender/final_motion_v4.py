from pathlib import Path
ROOT=Path('C:/Users/shota/Documents/BulkLife')
exec(compile((ROOT/'assets/blender/motion_v4.py').read_text(encoding='utf-8'),'motion_v4.py','exec'))
exec(compile((ROOT/'assets/blender/export_portrait_v4.py').read_text(encoding='utf-8'),'export_portrait_v4.py','exec'))
