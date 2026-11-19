# Athlete v2 anatomical asset

This version replaces the v1 sphere-union body with a continuous anatomical mesh. The rib cage, pelvis, shoulder girdle, elbows, knees, nose, ears, individual fingers and toes are actual geometry. Regional growth uses fan-shaped pectoral/lat fields and fusiform limb bellies, retaining thinner tendon transitions at elbows, wrists, knees and ankles. The 16 game regions, fat and pump still change stored vertex coordinates; the change is not just subdivision or a material effect.

## Provenance

The base topology, adult male target, muscle/fat targets and anatomical joint/weight data are CC0 graphical assets from [MakeHuman Community](https://github.com/makehumancommunity/makehuman), pinned to `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. The official repository separates its CC0 data license from its AGPL application code. No MakeHuman application code is incorporated. Download URLs, checksums and the full upstream licenses are retained in `assets/sources/makehuman/provenance.json`, `LICENSE.md` and `LICENSE.ASSETS.md`. No purchased asset or photographic skin image is used. Game-specific surface fields, rig reduction, animations, garments, vertex pigmentation and procedural micro-normal/roughness images are authored in the supplied scripts.

## Integration

| Property | Value |
|---|---|
| GLB | `/assets/athlete-v2.glb` |
| Mapping | `/assets/regions-v2.json` |
| Blender source | `assets/blender/bulk-life-athlete-v2.blend` |
| Scene / collection | `BULK_LIFE_Studio_v2` / `BULK_LIFE_Athlete_v2` |
| Body / garment / rig | `BL_V2_AthleteBody` / `BL_V2_Shorts` / `BL_V2_Rig` |
| Rest height | 1.77 metres |
| Front | Blender -Y, glTF +Z |
| Base skin | 13,380 vertices, 13,378 quads, UV seam duplicates added on export |
| Garment | 675 vertices, 628 polygons, opaque fitted shorts |
| Entire export | 36,328 triangles, 6,633,436 bytes (6.63 MB) |
| Exported geometry | 19,934 vertices after UV splits; 11 primitives; 6 materials |
| Morph attribute payload | 6,562,944 bytes before GPU allocation |
| GLB SHA256 | 3b4ff1ed7253368c09d4d6b1e593f6c46a2d84ae31686a584098cf67979543b6 |
| Rig | 50 bones: legacy 17 major names plus neck, clavicles and 30 finger segments |
| Morphs | 18, on both skin and shorts |
| Skin images | Original 1024 × 1024 normal and roughness PNGs, packed in GLB |

Use named clips, not animation index. Bind geometry is an A-pose; play `Idle` or `Breathing` for the relaxed display. Three.js sanitizes hand bone names to `handL` / `handR`. Existing handheld equipment can attach to those nodes. Region Gaussian coordinates and radii use Blender X/right, Y/back, Z/up. The exported bind vertices use glTF X/right, Y/up, Z/front. For picking/highlights, transform each exported bind vertex (x,y,z) to (x,-z,y) before evaluating these fields; src/view/bodyRegions.ts and the real-mesh raycast regression tests implement this conversion. Preserve the authored `COLOR_0` vertex pigmentation and multiply it for region heatmaps.

Morph names remain `upperChest`, `chest`, `frontDelts`, `sideDelts`, `rearDelts`, `lats`, `upperBack`, `erectors`, `biceps`, `triceps`, `forearms`, `quads`, `hamstrings`, `glutes`, `calves`, `abs`, `bodyFat`, `pump`. Bone clips do not contain morph weight channels.

The 16 clip names remain `Breathing`, `Idle`, `FrontDoubleBiceps`, `FrontLatSpread`, `SideChest`, `BackDoubleBiceps`, `BackLatSpread`, `SideTriceps`, `AbdominalsThigh`, `MostMuscular`, `TrainingPress`, `TrainingRow`, `TrainingSquat`, `StageEntry`, `ResultCelebrate`, `ResultReflect`. TrainingPress is the standing overhead press; TrainingRow is a bent-over dumbbell row. TrainingSquat is a bodyweight squat. Equipment/competition movement remains an application concern.

## Reproduction

Open the preserved v1 source as the environment donor, then run the following inside Blender 5.3. The scripts resolve this workspace at `C:/Users/shota/Documents/BulkLife`.

1. `node assets/blender/fetch_makehuman_sources.mjs` restores the pinned CC0 inputs (already vendored).
2. In Blender: `create_athlete_v2.py`. It refuses to create a duplicate v2 scene. It copies the studio environment and never saves over v1.
3. `sculpt_athlete_v2.py` adds the anatomical surface and regional targets. It refuses repeated application.
4. `refine_skinning_v2.py` keeps the shoulder field primarily on the clavicle instead of pulling the upper pectorals with the humerus. `sculpt_fat_v2.py` adds independent abdominal, flank, lumbar, hip and modest limb/cheek adipose volume to `bodyFat`.
5. `animate_athlete_v2.py`, `texture_athlete_v2.py`, `finish_face_v2.py`, `fit_shorts_v2.py`.
6. `export_athlete_v2.py` selects only the v2 collection and active scene. The output includes the 16 filtered actions and packed images.
7. `qa_athlete_v2.py`, `qa_extremes_v2.py`, then `node scripts/verify-athlete-v2.mjs`.

`protect_groin_v2.py` is a one-time migration of the prototype made before the midline mask was added to the sculpt script. Do not run it on a fresh build with the current sculpt script. The shipped blend already includes that correction. It prevents expanding thigh bellies from crossing the pelvis midline.

Existing v2 blends can be re-exported using only step 6. Re-running anatomical sculpt/weight migration scripts is deliberately rejected. Re-running the shorts fitter archives its previous garment outside the exported collection. The v1 `.blend`, `.glb` and mappings remain separate, permitting old saves to retain their previous appearance.

## QA and limits

The existing v1 model was observed through the live Blender connection from front, side, back and raised-arm/training poses before the rebuild. Its rounded chest/deltoid masses, rudimentary face/hands and axillary stretching motivated the topology replacement.

`docs/qa/athlete-v2/` contains direct Eevee renders of front, side, back, three-quarter, developed front/back, double-biceps/front/back, side chest, overhead press, squat, face close-up, six height/adiposity profile silhouettes and two combined extremes. Six profile renders are asset silhouette checks; game-state muscle/capacity arithmetic remains in the application. The dark scalp follows a clipped hairline, eyebrows taper, and skin color varies at lips, knees and ears. The normal/roughness textures supply fine grain rather than a glossy surface.

The independent GLTFLoader/AnimationMixer check loads the exported GLB, checks 50 bones and all 18 target names, verifies bone-only clips, packed PNG data, vertex colors and texture references, and evaluates 6 heights × 3 body states × 16 clips × 5 times. It also evaluates each of 18 individual targets at -0.6 and 1.5 in idle, raised-arm and squat poses, for 1,548 total frames. The report records finite bounds, grounding, unchanged growth values, nonzero underlying morph geometry and v1 hash preservation. CPU texture decoding is a dimension/data stub, so it does not claim a browser rendering or FPS result. Browser integration is tested by the main application task.

`blender-extremes.json` also records corresponding skin-to-garment normal gaps for 48 deformed garment cases. This is a diagnostic at sampled vertices, not an exhaustive triangle collision proof. Small concave crotch folds can reverse interpolated normals, so visual coverage is checked in the PNGs as well. V2 uses shared body targets and bone weights for its opaque shorts. As with a game mesh of this size, extreme shoulder/elbow flexion remains an approximation; this asset does not claim scanned anatomy, medical measurement, or exact real-life physique prediction.
