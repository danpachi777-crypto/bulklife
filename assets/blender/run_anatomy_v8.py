"""Run small reproducible steps on the v8 duplicate; preserve all prior sources."""
import sys,traceback
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
(ROOT/'tmp').mkdir(exist_ok=True)
log=open(ROOT/'tmp/anatomy-v8-process.log','w',encoding='utf8',buffering=1)
sys.stdout=log;sys.stderr=log
args=sys.argv[sys.argv.index('--')+1:]
for name in args:
 path=ROOT/'assets/blender'/name
 try:
  print('RUN',path,flush=True)
  exec(compile(path.read_text(encoding='utf8'),str(path),'exec'),{'__file__':str(path),'__name__':'__main__'})
 except Exception:
  traceback.print_exc();raise
print('PIPELINE COMPLETE',flush=True)
