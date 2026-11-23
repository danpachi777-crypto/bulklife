import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
/** Fictional venues share human scale, with a larger rig for the major shows. */
export function LocalStage({ kind }: { kind: string }) {
  const major=kind==='local-national'||kind==='local-world';
  const world=kind==='local-world',back=world?'#14283e':major?'#202c34':'#183f35',accent=world?'#bfaa70':'#a2b9b2';
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const x = c.getContext("2d")!;
    x.fillStyle = kind==='local-world'?"#14283e":kind==='local-national'?"#202c34":"#173a31";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#edf3e9";
    x.textAlign = "center";
    x.font = "bold 52px sans-serif";
    x.fillText("BULK LIFE", 512, 110);
    x.font = "30px sans-serif";
    x.fillText(
      kind === "local-gym"
        ? "GYM CHALLENGE"
        : kind === "local-rookie"
          ? "ROOKIE STAGE"
          : kind==='local-national'?'NATIONAL GRAND PRIX':kind==='local-world'?'WORLD FINAL':"REGIONAL OPEN",
      512,
      172,
    );
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [kind]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <mesh receiveShadow position={[0, major?-0.10:-0.04, 0]}>
        <boxGeometry args={[world?7.6:major?6:4, major?.20:.08, major?4:3]} />
        <meshStandardMaterial color="#30383b" roughness={0.96} />
      </mesh>
      <mesh position={[0, 1.35, -1.4]}>
        <boxGeometry args={[major?6:4, 2.7, 0.08]} />
        <meshStandardMaterial color={back} roughness={0.98} />
      </mesh>
      <mesh position={[0, major?2.15:1.95, -1.345]}>
        <planeGeometry args={[2.9, 0.725]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {major && <group>
        <mesh position={[0,2.58,-1.17]} rotation={[0,0,Math.PI/2]}>
          <cylinderGeometry args={[.035,.035,5.3,10]}/>
          <meshStandardMaterial color="#7b8589" metalness={.8} roughness={.38}/>
        </mesh>
        {[-2.15,-1.25,1.25,2.15].map(x=><group key={x} position={[x,0,-1.29]}>
          <mesh position={[0,1.05,0]}><boxGeometry args={[.045,1.85,.035]}/><meshBasicMaterial color={accent}/></mesh>
          {[.25,.65,1.05,1.45].map(y=><mesh key={y} position={[0,y,.025]}><boxGeometry args={[.19,.008,.02]}/><meshStandardMaterial color={accent} metalness={.5} roughness={.5}/></mesh>)}
        </group>)}
        <mesh position={[0,.045,1.48]}><boxGeometry args={[world?6.7:5.2,.012,.025]}/><meshBasicMaterial color={accent}/></mesh>
      </group>}
      {(major?[-2.5,-1.7,1.7,2.5]:[-1.65, 1.65]).map((x) => (
        <group key={x} position={[x, 0, -1.2]}>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 2.6, 8]} />
            <meshStandardMaterial
              color="#737d7d"
              metalness={0.7}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 2.45, 0.16]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.09, 0.19, 16]} />
            <meshStandardMaterial
              color="#151c20"
              metalness={0.45}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
      <spotLight
        position={[-1.4, 2.7, 1.1]}
        intensity={18}
        angle={0.65}
        penumbra={0.7}
        color="#fff0da"
      />
      <spotLight
        position={[1.4, 2.7, 0.5]}
        intensity={12}
        angle={0.7}
        penumbra={0.8}
        color="#e0ebff"
      />
      {(major?[-1.65,1.65]:[-1.3, 1.3]).map((x) => (
        <group key={x} position={[x, 0, 0.8]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.55, 0.06, 0.35]} />
            <meshStandardMaterial color="#4b3f33" roughness={0.8} />
          </mesh>
          {[-0.2, 0.2].map((l) => (
            <mesh key={l} position={[l, 0.17, 0]}>
              <boxGeometry args={[0.035, 0.34, 0.25]} />
              <meshStandardMaterial
                color="#384042"
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.4, 0.08]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.18, 0.01, 0.23]} />
            <meshStandardMaterial color="#dfdfce" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
