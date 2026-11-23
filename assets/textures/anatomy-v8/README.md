# anatomy-v8 skin

`skin-albedo.png` is an actual UV/material bake made with Blender by
`assets/blender/bake_skin_v8.py`. It derives from the existing protected
`BL_V6_SkinAlbedo`, itself derived from MakeHuman's CC0 skin assets.
See `assets/sources/makehuman-system-v3/provenance.json` and the retained licenses.

The original images were not overwritten. The bake modestly reduces saturation
on legs/arms, does not paint muscle boundaries or veins, and disables outfit
coverage so that feet/hidden thigh UVs are baked. The resulting packed image is
embedded in each actual v8 GLB. `docs/qa/anatomy-v8/skin-bake.json` records its hash
and the checks for unbaked black skin regions.
