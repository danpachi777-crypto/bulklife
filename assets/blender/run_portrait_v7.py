"""Capture background Blender diagnostics; launcher exit status alone is not proof."""
import sys,traceback
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
log=open(ROOT/'tmp/portrait-v7-process.log','w',encoding='utf8',buffering=1)
sys.stdout=log;sys.stderr=log
args=sys.argv[sys.argv.index('--')+1:]
prefix=next((a for a in args if not a.endswith('.py')),'after');sys.argv=[sys.argv[0],'--',prefix]
for name in args:
 if not name.endswith('.py'):continue
 path=ROOT/'assets/blender'/name
 try:
  print('RUN',path,flush=True)
  exec(compile(path.read_text(encoding='utf8'),str(path),'exec'),{'__file__':str(path),'__name__':'__main__'})
 except Exception:
  traceback.print_exc();raise
print('PIPELINE COMPLETE',flush=True)
