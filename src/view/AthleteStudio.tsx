import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  AnimationMixer,
  Mesh,
  SkinnedMesh,
  Color,
  Float32BufferAttribute,
  Vector3,
  SRGBColorSpace,
  Group,
  LoopOnce,
  DoubleSide,
} from "three";
import { GymRoom, ContactShade } from "./GymRoom";
import {coveredSkinIndex} from './clothingCoverage';
import {
  useReducedMotion,
  PRESENTATION_EVENT,
} from "../ui/presentationSettings";
import { linearVertexColors } from "./colorData";
import { PORTRAIT_ASSET_URL } from "./portraitAsset";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  PARTS,
  LABELS,
  clamp,
  weight,
  muscleMass,
  fatPercent,
  type BodyState,
  type Part,
} from "../core/model";
import {
  morphValues,
  BODY_ASSET_URL,
  MAX_CAMERA_DISTANCE,
  STUDIO_WALL_Z,
} from "./bodyMapping";
import { influence, selectedRegion } from "./bodyRegions";
const CLIPS: Record<string, string> = {
  Breathing: "リラックス・呼吸",
  Idle: "待機",
  GymIdle: "自然な待機・呼吸",
  FrontDoubleBiceps: "フロント・ダブルバイセップス",
  FrontLatSpread: "フロント・ラットスプレッド",
  SideChest: "サイドチェスト",
  BackDoubleBiceps: "バック・ダブルバイセップス",
  BackLatSpread: "バック・ラットスプレッド",
  SideTriceps: "サイドトライセップス",
  AbdominalsThigh: "アブドミナル＆サイ",
  MostMuscular: "モストマスキュラー",
  TrainingPress: "立位ダンベル・オーバーヘッドプレス",
  TrainingRow: "前傾ダンベルロウ",
  TrainingSquat: "自重スクワット",
  StageEntry: "登壇",
  ResultCelebrate: "結果・喜び",
  ResultReflect: "結果・振り返り",
};
type Mode = "normal" | "growth" | "recovery" | "load" | "balance" | "condition";
const MODES: Record<Mode, string> = {
  normal: "通常",
  growth: "初日からの成長",
  recovery: "回復",
  load: "一時的なパンプ",
  balance: "成長余地に対する割合",
  condition: "仕上がり",
};
function Controls({
  angle,
  revision,
  capture,
  interactive,
  presentation,
  framing,
}: {
  angle: number;
  revision: number;
  capture: React.MutableRefObject<(() => string) | null>;
  interactive: boolean;
  presentation: string;
  framing: "full" | "face" | "upper";
}) {
  const { camera, gl, scene, invalidate, size } = useThree();
  const controls = useMemo(
    () => new OrbitControls(camera, gl.domElement),
    [camera, gl],
  );
  useEffect(() => {
    controls.target.set(0, 0.95, 0);
    controls.enablePan = false;
    controls.minDistance = 0.6;
    controls.maxDistance = MAX_CAMERA_DISTANCE;
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.48;
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.rotateSpeed = 0.55;
    const changed = () => invalidate();
    controls.addEventListener("change", changed);
    capture.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      controls.dispose();
      controls.removeEventListener("change", changed);
      capture.current = null;
    };
  }, [controls, gl, scene, camera, capture, invalidate]);
  useEffect(() => {
    controls.enabled = interactive;
    gl.domElement.style.touchAction = interactive ? "none" : "pan-y";
  }, [interactive, controls, gl]);
  useEffect(() => {
    controls.enableDamping = false;
    const seated = presentation === "title";
    const distance =
      framing === "face"
        ? 0.82
        : framing==='upper'?1.45:Math.max(seated?2.65:2.85, 1.05 / (size.width / size.height));
    const target = framing === "face" ? 1.63 : framing==='upper'?1.25:seated ? 0.76 : 0.91;
    camera.position.set(
      Math.sin(angle) * distance,
      target + (framing === "face" ? 0.015 : 0.18),
      Math.cos(angle) * distance,
    );
    controls.target.set(0, target, seated ? -0.35 : 0);
    controls.update();
    controls.enableDamping = true;
    invalidate();
  }, [
    angle,
    revision,
    controls,
    camera,
    presentation,
    framing,
    size.width,
    size.height,
    invalidate,
  ]);
  useFrame(() => controls.update());
  return null;
}
function FrameClock({
  active,
  playing,
  mobile,
}: {
  active: boolean;
  playing: boolean;
  mobile: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active || !playing) return;
    const timer = setInterval(invalidate, mobile ? 1000 / 30 : 1000 / 60);
    return () => clearInterval(timer);
  }, [active, playing, mobile, invalidate]);
  return null;
}
function Athlete({
  body,
  baseline,
  selected,
  hair,
  clip,
  playing,
  mode,
  onSelect,
  onReady,
  model,
  wear,
  presentation,
}: {
  body: BodyState;
  baseline?: BodyState;
  selected: Part;
  hair: number;
  clip: string;
  playing: boolean;
  mode: Mode;
  onSelect?: (p: Part) => void;
  onReady: () => void;
  model: string;
  wear: boolean;
  presentation: string;
}) {
  const gltf = useLoader(
    GLTFLoader,
    model === "athlete-v2" ? PORTRAIT_ASSET_URL : BODY_ASSET_URL,
  );
  const invalidate = useThree((s) => s.invalidate);
  const dumbbell = useLoader(GLTFLoader, "/assets/dumbbell-v1.glb");
  const root = useMemo(() => {
    const r = clone(gltf.scene);
    r.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry = o.geometry.clone();
        if(o instanceof SkinnedMesh&&o.name==='BL_V2_AthleteBody'&&r.getObjectByName('BL_V4_TrainingShorts')){
          o.userData.fullSkinIndex=o.geometry.index;
          o.userData.clothedSkinIndex=coveredSkinIndex(o);
        }
        const colorAttribute = o.geometry.getAttribute("color");
        if (colorAttribute) {
          o.userData.baseColors = linearVertexColors(colorAttribute);
        }
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.name === "BL_V3_NaturalHair" || o.name === 'BL_V4_Hair') {
          for (const mat of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if ("color" in mat) {
              if(o.name==='BL_V4_Hair')(mat.color as Color).setRGB(0.45,0.35,0.27);
              else (mat.color as Color).setRGB(0.38,0.34,0.3);
            }
            mat.alphaTest = 0.4;
            mat.alphaToCoverage = true;
            mat.transparent = false;
            mat.side = DoubleSide;
          }
        }
      }
    });
    return r;
  }, [gltf]);
  const equipment = useMemo(
    () => [dumbbell.scene.clone(true), dumbbell.scene.clone(true)],
    [dumbbell],
  );
  useEffect(() => {
    const bones = ["handL", "handR"];
    equipment.forEach((prop, i) => {
      const bone = root.getObjectByName(bones[i]) ?? root.getObjectByName(i===0?'hand.L':'hand.R');
      if (bone) {
        bone.add(prop);
        prop.position.set(0, 0.04, 0);
      }
    });
    return () => equipment.forEach((prop) => prop.removeFromParent());
  }, [root, equipment]);
  useEffect(() => {
    equipment.forEach((prop) => {
      prop.visible = ["TrainingPress", "TrainingRow"].includes(clip);
    });
  }, [equipment, clip]);
  const mixer = useMemo(() => new AnimationMixer(root), [root]);
  const expressionTime=useRef(0);
  const faceParts=useMemo(()=>{const blink:Mesh[]=[],cloth:Mesh[]=[],eyes:{mesh:Mesh;origin:Vector3}[]=[];root.traverse(o=>{if(o instanceof Mesh){if(o.morphTargetDictionary?.blink!==undefined)blink.push(o);if(o.morphTargetDictionary?.seatedCloth!==undefined)cloth.push(o);if(/Iris|Pupil/.test(o.name))eyes.push({mesh:o,origin:o.position.clone()});}});return {blink,cloth,eyes};},[root]);
  useEffect(() => {
    const found =
      gltf.animations.find((a) => a.name === clip) ??
      gltf.animations.find((a) => a.name === "Breathing");
    if (!found) return;
    const action = mixer.clipAction(found);
    action.reset();
    if (clip === "StandUp") {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.play();
    if (!playing && clip === "SeatedPrepare") action.time = 5;
    const finished = () => {
      if (clip !== "StandUp") return;
      action.fadeOut(0.25);
      const idle = gltf.animations.find((a) => a.name === "GymIdle");
      if (idle) mixer.clipAction(idle).reset().fadeIn(0.25).play();
    };
    mixer.addEventListener("finished", finished);
    mixer.update(0);
    invalidate();
    return () => {
      action.stop();
      mixer.removeEventListener("finished", finished);
      mixer.stopAllAction();
    };
  }, [mixer, gltf, clip, invalidate]);
  useEffect(
    () => () => {
      mixer.uncacheRoot(root);
      root.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    },
    [root, mixer],
  );
  useEffect(() => {
    const values = morphValues(body),
      v = new Vector3();
    root.traverse((o) => {
      if(o.name==='BL_V3_Trainers')o.visible=wear;
      if (!(o instanceof Mesh)) return;
      if (o.morphTargetDictionary && o.morphTargetInfluences)
        for (const [name, index] of Object.entries(o.morphTargetDictionary))
          o.morphTargetInfluences[index] =
            values[name as keyof typeof values] ?? 0;
      if (o.name.startsWith("HairSide")) o.visible = hair === 0;
      if (o.name === "Hair") o.scale.y = hair === 1 ? 0.6 : 1;
      if (o.name === "BL_V2_Hair" || o.name === "BL_V3_HairFlow")
        o.visible = hair === 1;
      if (o.name === "BL_V3_NaturalHair") o.visible = hair === 0;
      if (o.name === "BL_V3_TrainingTank" || o.name === "BL_V3_Trainers" || o.name === 'BL_V4_TrainingTank' || o.name === 'BL_V4_TrainingShorts')
        o.visible = wear;
      if(o.name==='BL_V2_Shorts'&&root.getObjectByName('BL_V4_TrainingShorts'))o.visible=!wear;
      if (!["BL_AthleteBody", "BL_V2_AthleteBody"].includes(o.name)) return;
      if(o.userData.fullSkinIndex)o.geometry.setIndex(wear?o.userData.clothedSkinIndex:o.userData.fullSkinIndex);
      const positions = o.geometry.attributes.position,
        colors = new Float32Array(positions.count * 3),
        color = new Color();
      for (let i = 0; i < positions.count; i++) {
        v.fromBufferAttribute(positions, i);
        const region = selectedRegion(v, model);
        const baseColors = o.userData.baseColors as Float32Array | undefined;
        color.setRGB(1, 1, 1);
        if (region) {
          const w = influence(v, region, model);
          let amount = 0;
          if (mode === "normal") {
            if (
              region === selected &&
              onSelect &&
              presentation === "inspection"
            )
              color.setRGB(1, 1, 0.78);
          } else {
            amount =
              mode === "growth"
                ? clamp(
                    (body.muscle[region] /
                      (baseline?.muscle[region] ?? body.muscle[region]) -
                      1) *
                      3,
                    0,
                    1,
                  )
                : mode === "recovery"
                  ? 1 - body.fatigue[region]
                  : mode === "load"
                    ? clamp(body.pump[region] * 5, 0, 1)
                    : mode === "balance"
                      ? clamp(
                          body.muscle[region] /
                            Math.max(0.01, body.capacity[region]),
                          0,
                          1,
                        )
                      : clamp(1 - Math.abs(fatPercent(body) - 6) / 15, 0, 1);
            color.setHSL((1 - amount) * 0.62, 0.55, 0.52);
            color.lerp(new Color(1, 1, 1), 1 - w * 0.85);
          }
        }
        colors[i * 3] = color.r * (baseColors?.[i * 3] ?? 1);
        colors[i * 3 + 1] = color.g * (baseColors?.[i * 3 + 1] ?? 1);
        colors[i * 3 + 2] = color.b * (baseColors?.[i * 3 + 2] ?? 1);
      }
      o.geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
      for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
        if ("vertexColors" in mat) mat.vertexColors = true;
        mat.needsUpdate = true;
      }
    });
    root.scale.set(body.shoulder, body.height / 176.5, 1);
    onReady();
  }, [
    body,
    baseline,
    selected,
    mode,
    root,
    hair,
    onReady,
    model,
    wear,
    presentation,
    onSelect,
  ]);
  useFrame((_, delta) => {
    if(playing)expressionTime.current+=Math.min(delta,.05);
    const time=expressionTime.current;let cycle=time%27.9,blink=0;
    for(const interval of [3.8,6.2,4.9,7.4,5.6]){if(cycle<interval){const t=(cycle-(interval-.18))/.18;if(t>=0&&t<=1)blink=Math.sin(t*Math.PI)**2;break;}cycle-=interval;}
    for(const m of faceParts.blink)m.morphTargetInfluences![m.morphTargetDictionary!.blink]=playing?blink:0;
    for(const {mesh,origin} of faceParts.eyes){mesh.position.copy(origin);if(playing){mesh.position.x+=.0008*Math.sin(time*.37);mesh.position.y+=.0003*Math.sin(time*.21+.7);}}
    const actionData=gltf.animations.find(a=>a.name===clip),actionTime=actionData?mixer.clipAction(actionData).time:0;
    const seated=clip==='SeatedPrepare'?1:clip==='StandUp'&&actionData?1-Math.min(1,actionTime/actionData.duration):0;
    for(const m of faceParts.cloth)m.morphTargetInfluences![m.morphTargetDictionary!.seatedCloth]=seated;
    if (playing) {
      const action = gltf.animations.find((a) => a.name === clip);
      if (clip === "SeatedPrepare" && action) {
        const current = mixer.clipAction(action);
        if (current.time + delta >= action.duration - 0.05) current.time = 5;
      }
      mixer.update(Math.min(delta, 0.05));
      root.position.z +=
        ((presentation === "title" ? -0.48 : 0) - root.position.z) *
        Math.min(1, delta * 4);
    } else root.position.z = presentation === "title" ? -0.48 : 0;
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!onSelect || e.delta > 8 || !e.face || !(e.object instanceof Mesh))
      return;
    const mesh = e.object;
    if (
      ![
        "BL_AthleteBody",
        "BL_FittedShorts",
        "BL_V2_AthleteBody",
        "BL_V2_Shorts",
      ].includes(mesh.name)
    )
      return;
    const pos = mesh.geometry.attributes.position,
      v = new Vector3()
        .fromBufferAttribute(pos, e.face.a)
        .add(new Vector3().fromBufferAttribute(pos, e.face.b))
        .add(new Vector3().fromBufferAttribute(pos, e.face.c))
        .multiplyScalar(1 / 3);
    const part = selectedRegion(v, model);
    if (part) {
      e.stopPropagation();
      onSelect(part);
    }
  };
  return <primitive object={root} onClick={click} />;
}
function Environment({ stage }: { stage: string }) {
  const gltf = useLoader(
    GLTFLoader,
    stage === "gym" ? "/assets/gym-v1.glb" : `/assets/stage-${stage}-v1.glb`,
  );
  const root = useMemo(() => gltf.scene.clone(true), [gltf]);
  useFrame(({ camera }) => {
    root.rotation.y = Math.atan2(camera.position.x, camera.position.z);
  });
  return <primitive object={root} />;
}
function Studio() {
  return (
    <group>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.012, 0]}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#283330" roughness={0.93} />
      </mesh>
      <mesh position={[0, 1.5, STUDIO_WALL_Z]}>
        <boxGeometry args={[16, 3, 0.1]} />
        <meshStandardMaterial color="#34413d" roughness={1} />
      </mesh>
      {[-1.65, -1.52, -1.39, 1.39, 1.52, 1.65].map((x) => (
        <mesh key={x} position={[x, 1.3, STUDIO_WALL_Z + 0.08]}>
          <boxGeometry args={[0.05, 2.6, 0.06]} />
          <meshStandardMaterial color="#6c5a40" roughness={0.8} />
        </mesh>
      ))}
      <mesh
        receiveShadow
        position={[0, 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.64, 64]} />
        <meshStandardMaterial color="#46534b" roughness={1} />
      </mesh>
    </group>
  );
}
class ViewError extends Component<
  { children: ReactNode; onError?: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.error ? (
      <div className="fallback">
        <p>3Dを読み込めませんでした。数値と記録で育成を続けられます。</p>
        <svg viewBox="0 0 200 330" aria-label="身体図">
          <circle cx="100" cy="35" r="20" />
          <path d="M65 65 Q100 55 135 65L145 165 125 175 120 295 103 295 100 185 97 295 80 295 75 175 55 165Z" />
        </svg>
        <button onClick={() => location.reload()}>再読込</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function BodyView({
  body,
  selected,
  hair = 0,
  baseline,
  onSelectPart,
  stage,
  defaultClip = "Breathing",
  title = "身体の記録",
  model = "athlete-v1",
  preview = false,
  presentation = "inspection",
}: {
  body: BodyState;
  selected: Part;
  hair?: number;
  baseline?: BodyState;
  onSelectPart?: (p: Part) => void;
  stage?: string;
  defaultClip?: string;
  title?: string;
  model?: string;
  preview?: boolean;
  presentation?: "inspection" | "home" | "title" | "creation";
}) {
  const studio = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true),
    [foreground, setForeground] = useState(!document.hidden);
  const [covered, setCovered] = useState(false);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:800px)").matches,
  );
  const [touchRotation, setTouchRotation] = useState(false);
  const active = visible && foreground && !covered;
  const opening = presentation === "title" || presentation === "creation";
  const immersive = presentation !== "inspection";
  const interactive = !preview && !opening && (!mobile || touchRotation);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) =>
      setVisible(entries[0]?.isIntersecting ?? false),
    );
    if (studio.current) observer.observe(studio.current);
    const visibility = () => setForeground(!document.hidden);
    const overlay = (e: Event) =>
      setCovered(
        (e as CustomEvent<boolean>).detail &&
          !studio.current?.closest('[aria-modal="true"]'),
      );
    const query = matchMedia("(max-width:800px)");
    const resize = () => setMobile(query.matches);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("bulk-life-overlay", overlay);
    query.addEventListener("change", resize);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("bulk-life-overlay", overlay);
      query.removeEventListener("change", resize);
    };
  }, []);
  const [loadedModel, setLoadedModel] = useState<string | null>(null);
  const loaded = loadedModel === model;
  const [view, setView] = useState({ angle: 0, revision: 0 }),
    [playing, setPlaying] = useState(() => !preview && !reduced),
    [quality, setQuality] = useState(() => {
      try {
        const saved = localStorage.getItem("bulk-life-quality");
        if (saved === "standard" || saved === "light")
          return saved === "standard";
      } catch {}
      return !window.matchMedia("(max-width:800px)").matches;
    }),
    [clip, setClip] = useState(defaultClip),
    [mode, setMode] = useState<Mode>("normal"),
    [framing, setFraming] = useState<"full" | "face" | "upper">("full"),
    [wear, setWear] = useState(immersive);
  const capture = useRef<(() => string) | null>(null);
  useEffect(() => setPlaying(!preview && !reduced), [reduced, preview]);
  useEffect(() => {
    const update = () => {
      try {
        const saved = localStorage.getItem("bulk-life-quality");
        if (saved === "standard" || saved === "light")
          setQuality(saved === "standard");
      } catch {}
    };
    window.addEventListener(PRESENTATION_EVENT, update);
    return () => window.removeEventListener(PRESENTATION_EVENT, update);
  }, []);
  useEffect(() => setClip(defaultClip), [defaultClip]);
  const onReady = useMemo(() => () => setLoadedModel(model), [stage, model]);
  const download = () => {
    const data = capture.current?.();
    if (!data) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#26372d";
      ctx.fillRect(0, 0, 1000, 1200);
      const scale = Math.min(900 / img.width, 950 / img.height);
      ctx.drawImage(
        img,
        (1000 - img.width * scale) / 2,
        50,
        img.width * scale,
        img.height * scale,
      );
      ctx.fillStyle = "#e7eddf";
      ctx.font = "32px sans-serif";
      ctx.fillText("BULK LIFE | " + title, 55, 1060);
      ctx.font = "25px sans-serif";
      ctx.fillText(
        `${weight(body).toFixed(2)}kg / 筋質量 ${muscleMass(body).toFixed(2)}kg / 体脂肪率 ${fatPercent(body).toFixed(1)}%`,
        55,
        1120,
      );
      const link = document.createElement("a");
      link.download = "BULK-LIFE-body.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = data;
  };
  return (
    <div
      ref={studio}
      className={`body-studio presentation-${presentation}${preview ? " studio-preview" : ""}`}
      data-rendering={active ? "visible" : "paused"}
      data-rotation={interactive ? "free" : "locked"}
    >
      <div className="body-view">
        {!loaded && !stage && (
          <img className="scene-poster" src="/assets/gym-loading.jpg" alt="" />
        )}
        {!loaded && (
          <div className="model-loading" role="status">
            3Dモデルを読み込み中…
          </div>
        )}
        <ViewError key={model} onError={() => setLoadedModel(model)}>
          <Canvas
            shadows={quality && !preview}
            dpr={quality && !preview ? [1, 1.5] : 1}
            frameloop={active ? "demand" : "never"}
            camera={{ position: [0, 1.25, 3.35], fov: 38 }}
            gl={{
              antialias: true,
              outputColorSpace: SRGBColorSpace,
              preserveDrawingBuffer: !preview,
            }}
          >
            <color attach="background" args={["#172b27"]} />
            <ambientLight intensity={0.42} />
            <hemisphereLight args={["#e4e8ed", "#555253", 0.85]} />
            <directionalLight
              position={[-1.5, 3.3, 2.2]}
              intensity={2.0}
              color="#fff5eb"
              castShadow={quality && !preview}
              shadow-mapSize={[1024, 1024]}
              shadow-normalBias={0.02}
              shadow-bias={-0.0002}
            />
            <directionalLight
              position={[0, 3, -4]}
              intensity={0.9}
              color="#d8e3f0"
            />
            <directionalLight position={[2, 2, 2.5]} intensity={0.65} />
            <Suspense fallback={null}>
              {stage ? <Environment stage={stage} /> : <GymRoom />}
              <ContactShade />
              <Athlete
                body={body}
                baseline={baseline}
                selected={selected}
                hair={hair}
                clip={clip}
                playing={playing && active}
                mode={mode}
                onSelect={
                  presentation === "inspection" ? onSelectPart : undefined
                }
                onReady={onReady}
                model={model}
                wear={wear || opening}
                presentation={presentation}
              />
            </Suspense>
            <Controls
              angle={view.angle}
              revision={view.revision}
              capture={capture}
              interactive={interactive}
              presentation={presentation}
              framing={framing}
            />
            <FrameClock
              active={active}
              playing={playing}
              mobile={mobile || preview}
            />
          </Canvas>
        </ViewError>
        {!preview && !immersive && (
          <div className="scene-label">
            <span>{stage ? "COMPETITION STAGE" : "BODY STUDIO"}</span>
            <small>
              {mobile
                ? interactive
                  ? "指で回転。スクロールする時は操作をロック。"
                  : "タップで部位選択。上下スワイプでページ移動。"
                : onSelectPart
                  ? "ドラッグで回転・クリックで部位選択"
                  : "ドラッグで回転・スクロールで拡大"}
            </small>
          </div>
        )}
        {!preview && !immersive && (
          <div className="view-controls">
            <div>
              {[
                ["正面", 0],
                ["側面", Math.PI / 2],
                ["背面", Math.PI],
              ].map(([label, n]) => (
                <button
                  key={label}
                  onClick={() =>
                    setView((v) => ({
                      angle: n as number,
                      revision: v.revision + 1,
                    }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <button onClick={() => setPlaying(!playing)}>
                {playing ? "動作：ON" : "動作：OFF"}
              </button>
              <button
                onClick={() => {
                  const next = !quality;
                  setQuality(next);
                  try {
                    localStorage.setItem(
                      "bulk-life-quality",
                      next ? "standard" : "light",
                    );
                  } catch {}
                }}
              >
                {quality ? "標準画質" : "軽量画質"}
              </button>
            </div>
          </div>
        )}
      </div>
      {!preview && !opening && (
        <div className="hero-view-tools" aria-label="人物の見方">
          <button
            onClick={() => {
              setFraming("full");
              setView((v) => ({ angle: 0, revision: v.revision + 1 }));
            }}
          >
            全身・正面
          </button>
          <button onClick={()=>{setFraming('upper');setView(v=>({angle:0,revision:v.revision+1}));}}>上半身</button>
          <button
            onClick={() => {
              setFraming((v) => (v === "face" ? "full" : "face"));
              setView((v) => ({ angle: 0, revision: v.revision + 1 }));
            }}
          >
            {framing === "face" ? "全身" : "顔"}
          </button>
          <button onClick={() => setWear(!wear)}>
            {wear ? "身体を確認" : "ウェアを着る"}
          </button>
        </div>
      )}
      {!preview && mobile && !opening && (
        <button
          className="touch-rotation"
          aria-pressed={touchRotation}
          onClick={() => setTouchRotation(!touchRotation)}
        >
          {touchRotation
            ? "3D操作を終了してスクロール"
            : "指で回転・ピンチで拡大"}
        </button>
      )}
      {!preview && !immersive && (
        <details className="studio-more"><summary>ポーズ・表示・画像保存</summary><div className="body-options">
          <label>
            ポーズ・動作
            <select value={clip} onChange={(e) => setClip(e.target.value)}>
              {Object.entries(CLIPS).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            身体の表示
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              {Object.entries(MODES).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={download}>身体カードを保存</button>
        </div></details>
      )}
      {!preview && !immersive && mode !== "normal" && (
        <p className="heat-legend">
          {MODES[mode]}：青は低い値、赤は高い値。
          {mode === "recovery"
            ? "高い値ほど回復。"
            : mode === "load"
              ? "高い値ほど一時的なパンプが多い。"
              : mode === "growth"
                ? "初日からの筋質量増加を表示。"
                : "数値の詳細は部位記録を確認。"}
          選択中：{LABELS[selected]}
        </p>
      )}
    </div>
  );
}
