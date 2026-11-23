"""Read-only rendering of the protected v7 checkpoint, with v8 QA conditions."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v8-work.blend'))
script=ROOT/'assets/blender/qa_anatomy_v8_character.py';exec(compile(script.read_text(),str(script),'exec'),{'__file__':str(script),'__name__':'__main__'})
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/bulk-life-athlete-v7-work.blend'))
script=ROOT/'assets/blender/qa_contact_comparison_v8.py';exec(compile(script.read_text(),str(script),'exec'),{'__file__':str(script),'__name__':'__main__'})
# Deliberately no save. The v7 file must remain byte-identical.
script=ROOT/'assets/blender/render_baseline_export_v8.py';exec(compile(script.read_text(),str(script),'exec'),{'__file__':str(script),'__name__':'__main__'})
