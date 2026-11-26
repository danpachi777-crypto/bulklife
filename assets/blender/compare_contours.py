"""Matched neutral views of the released and revised standard frame. Render from the GLBs."""
import bpy, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'assets/blender/render_exported_v8.py'
text=source.read_text(encoding='utf8').split("for frame in ['standard','tall','broad']:\n scene,rig=")[0]
previous=Path(tempfile.gettempdir())/'bulk-calendar-before.glb'
with previous.open('wb') as f:
    subprocess.run(['git','show','f89514d:public/assets/athlete-v8-standard.glb'],cwd=ROOT,stdout=f,check=True)
for version,path in [('before',previous),('after',ROOT/'public/assets/athlete-v8-standard.glb')]:
    scope={'__file__':str(source),'path':path}
    exec(text.replace("str(ROOT/f'public/assets/athlete-v8-{frame}.glb')","str(path)"),scope)
    scene,rig=scope['resetScene']('standard')
    out=ROOT/'docs/qa/season'/version
    out.mkdir(parents=True,exist_ok=True)
    scope['OUT']=out
    render=scope['capture']
    def capture(label,*args):
        import sys
        if '--resume-comparison' in sys.argv and (out/(label+'.png')).exists():
            return
        render(label,*args)
    scope['capture']=capture
    scene.render.engine='CYCLES'
    scene.cycles.samples=2
    scene.render.threads_mode='FIXED'
    scene.render.threads=3
    scene.render.resolution_percentage=45
    morph=next(c for c in scope['cases'] if c['frame']=='standard' and c['stage']==5)['morphs']
    for clip,eye,label in [('GymIdle',(0,-4.3,1.2),'front'),('GymIdle',(4.3,0,1.2),'side'),('GymIdle',(0,4.3,1.2),'back'),('FrontDoubleBiceps',(0,-4.3,1.2),'raised'),('SeatedPrepare',(2,-3.8,1.2),'seated')]:
        scope['pose'](rig,clip,193 if clip=='SeatedPrepare' else 25,morph)
        scope['outfit'](clip=='SeatedPrepare')
        scope['capture'](label,eye)
    if version=='after':
        for stage in [1,2,3,4]:
            case=next(c for c in scope['cases'] if c['frame']=='standard' and c['stage']==stage)
            scope['pose'](rig,'GymIdle',1,case['morphs'])
            scope['outfit'](False)
            scope['capture']('growth-'+str(stage),(0,-4.3,1.2))
        for group,names in [('chest',['chest','upperChest']),('delts',['frontDelts','sideDelts','rearDelts']),('legs',['quads','hamstrings','calves']),('high-fat',list(morph))]:
            values={name:float(name in names) for name in morph}
            if group=='high-fat':values.update(bodyFat=.9,leanDefinition=0,fatSoftening=.9)
            scope['pose'](rig,'FrontDoubleBiceps',25,values)
            scope['capture'](group,(.65,-4.1,1.2))
        scope['pose'](rig,'GymIdle',1,morph)
        scope['outfit'](True)
        for label,eye in [('face-front',(0,-.92,1.63)),('face-profile',(.92,-.12,1.63)),('face-quarter',(.58,-.72,1.63))]:
            scope['capture'](label,eye,(0,-.03,1.63),True)
