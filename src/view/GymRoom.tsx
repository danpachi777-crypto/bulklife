import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import {
  CanvasTexture,
  DoubleSide,
  FrontSide,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function Box({
  at,
  size,
  color = "#293a35",
  rough = 0.85,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color?: string;
  rough?: number;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}
export function GymRoom() {
  const backdrop = useRef<Group>(null);
  // Inspection cameras can orbit outside the room. Drop the rear furnishings
  // before they pass between camera and athlete; keep the floor and contact.
  useFrame(({ camera }) => {
    if (backdrop.current) backdrop.current.visible = camera.position.z > 0.4;
  });
  const floor = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    let seed = 7419;
    const data = ctx.createImageData(256, 256);
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = 43 + (seed % 13);
      data.data.set([v, v + 4, v + 3, 255], i);
    }
    ctx.putImageData(data, 0, 0);
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(12, 12);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  const equipment = useLoader(GLTFLoader, "/assets/dumbbell-v1.glb");
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.025, 0]}
        receiveShadow
      >
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial map={floor} roughness={0.98} />
      </mesh>
      {[-3, -2, -1, 0, 1, 2, 3].map((x) => (
        <mesh
          key={x}
          position={[x, -0.024, -0.8]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.008, 7]} />
          <meshBasicMaterial color="#222b29" />
        </mesh>
      ))}
      <group ref={backdrop}>
        {/* Back-facing room surfaces disappear when inspecting the athlete from behind. */}
        <mesh position={[0, 1.6, -2.3]}>
          <planeGeometry args={[8, 3.25]} />
          <meshStandardMaterial
            color="#34483f"
            roughness={0.97}
            side={FrontSide}
          />
        </mesh>
        <mesh position={[-0.95, 1.7, -2.285]}>
          <planeGeometry args={[1.5, 1.55]} />
          <meshStandardMaterial
            color="#263f53"
            emissive="#243a50"
            emissiveIntensity={0.5}
          />
        </mesh>
        {[-1.72, -0.95, -0.18].map((x) => (
          <Box
            key={x}
            at={[x, 1.7, -2.25]}
            size={[0.045, 1.65, 0.05]}
            color="#182624"
          />
        ))}
        {[0.9, 1.7, 2.5].map((y) => (
          <Box
            key={y}
            at={[-0.95, y, -2.25]}
            size={[1.6, 0.045, 0.05]}
            color="#182624"
          />
        ))}
        <Box at={[1.2, 1.15, -2.17]} size={[1.2, 2.2, 0.18]} color="#2c4036" />
        <Box
          at={[1.2, 1.15, -2.06]}
          size={[0.012, 2.1, 0.015]}
          color="#14281e"
        />
        {[1.05, 1.35].map((x) => (
          <Box
            key={x}
            at={[x, 1.2, -2.04]}
            size={[0.025, 0.17, 0.025]}
            color="#88948a"
            rough={0.5}
          />
        ))}
        <Box at={[0, 0.06, -2.28]} size={[8, 0.12, 0.05]} color="#1b2a26" />
        {/* The same bench remains behind the player from title through the first day. */}
        <Box
          at={[0, 0.435, -0.48]}
          size={[1.18, 0.095, 0.36]}
          color="#172624"
          rough={0.76}
        />
        <Box
          at={[-0.43, 0.21, -0.48]}
          size={[0.055, 0.4, 0.065]}
          color="#505958"
          rough={0.58}
        />
        <Box
          at={[0.43, 0.21, -0.48]}
          size={[0.055, 0.4, 0.065]}
          color="#505958"
          rough={0.58}
        />
        <Box
          at={[0, 0.12, -0.48]}
          size={[0.92, 0.045, 0.045]}
          color="#434e4b"
          rough={0.65}
        />
        <Box at={[-1.2, 0.65, -1.2]} size={[0.9, 0.06, 0.4]} color="#1d2925" />
        <Box at={[-1.2, 0.33, -1.2]} size={[0.9, 0.06, 0.4]} color="#1d2925" />
        {[-1.57, -0.83].map((x) => (
          <Box
            key={x}
            at={[x, 0.37, -1.2]}
            size={[0.045, 0.7, 0.05]}
            color="#53615b"
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <primitive
            key={i}
            object={equipment.scene.clone(true)}
            position={[-1.5 + i * 0.2, 0.7, -1.2]}
            scale={0.65}
          />
        ))}
        <Box at={[1.5, 2.8, -0.8]} size={[1.6, 0.035, 0.08]} color="#cecec1" />
        <mesh position={[1.5, 2.77, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 0.055]} />
          <meshBasicMaterial color="#ffdfac" side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
export function ContactShade() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 5, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,.58)");
    g.addColorStop(0.5, "rgba(0,0,0,.23)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.022, 0.02]}>
      <planeGeometry args={[0.8, 0.6]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
