import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createScene } from "./ThreeRender";
import { setupPlayerControls, ScreenOverlays } from "./PlayerControls";
import ScreenPortal from "./ScreenPortal";
import * as THREE from "three";

import { About } from "../pages/About";
import { Projects } from "../pages/Projects";
import { Experience } from "../pages/Experience";
import { Contact } from "../pages/Contact";

//Posição das telas flutuantes em CSS3D
const SCREEN_CONFIGS = [
  {
    id: "tela1", title: "Sobre",
    component: About,
    position: new THREE.Vector3(-23, 3, 0),
    rotationY: Math.PI / 2,
    scale: 0.01,
  },
  {
    id: "tela2", title: "Projetos",
    component: Projects,
    position: new THREE.Vector3(-30, 3, -7),
    rotationY: Math.PI,
    scale: 0.01,
  },
  {
    id: "tela3", title: "Experiências",
    component: Experience,
    position: new THREE.Vector3(-37, 3, 0),
    rotationY: -Math.PI / 2,
    scale: 0.01,
  },
  {
    id: "tela4", title: "Contato",
    component: Contact,
    position: new THREE.Vector3(-30, 3, 7),
    rotationY: 0,
    scale: 0.01,
  },
];

//  Painel 2D 
function Panel2D({ screenIndex, onClose }) {
  const cfg = SCREEN_CONFIGS[screenIndex];
  if (!cfg) return null;
  const PageComponent = cfg.component;

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        pointerEvents: "auto",
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div style={{
        width: "min(980px, 92vw)", height: "min(620px, 86vh)",
        borderRadius: 24, overflow: "hidden",
        boxShadow: "0 18px 60px rgba(0,0,0,.35)",
        border: "2px solid rgba(255,255,255,.25)",
        background: "rgba(255,255,255,.08)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "rgba(0,0,0,.35)",
          color: "white", font: "600 13px/1 system-ui", flexShrink: 0,
        }}>
          <span>{cfg.title}</span>
          <button onClick={onClose} style={{
            all: "unset", cursor: "pointer",
            padding: "6px 12px", borderRadius: 10,
            background: "rgba(255,255,255,.12)",
            color: "white", font: "600 12px system-ui",
          }}>
            Fechar (Esc)
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "white", pointerEvents: "auto" }}>
          <PageComponent />
        </div>
      </div>
    </div>
  );
}

//  ThreeScene 
export default function ThreeScene() {
  const canvasRef = useRef(null);
  const cssLayerRef = useRef(null);

  const [screenElements, setScreenElements] = useState({});
  const [panel2D, setPanel2D] = useState(null);

  // Ref que o loop imperativo usa para atualizar os overlays JSX
  const notifyRef = useRef(null);

  const handleOpen2D = useCallback((index) => setPanel2D(index), []);
  const handleClose2D = useCallback(() => setPanel2D(null), []);

  const closeFromReact = useCallback(() => {
    setPanel2D(null);
    window.__portfolioClose2D?.();
  }, []);

  const handleScreenMount = useCallback((id, element) => {
    setScreenElements((prev) => {
      if (prev[id] === element) return prev;

      const next = { ...prev };
      if (element) next[id] = element;
      else delete next[id];
      return next;
    });
  }, []);

  const screenDefs = useMemo(() => {
    const allMounted = SCREEN_CONFIGS.every((cfg) => screenElements[cfg.id]);
    if (!allMounted) return null;

    return SCREEN_CONFIGS.map((cfg) => ({
      id: cfg.id,
      title: cfg.title,
      element: screenElements[cfg.id],
      position: cfg.position,
      rotationY: cfg.rotationY,
      scale: cfg.scale,
    }));
  }, [screenElements]);

  useEffect(() => {
    if (!screenDefs) return;
    const canvas = canvasRef.current;
    const cssLayer = cssLayerRef.current;
    if (!canvas || !cssLayer) return;

    const { scene, camera, renderer, composer, ground, tickWater } = createScene(canvas);

    const cleanup = setupPlayerControls({
      camera, renderer, composer, ground, scene, cssLayer,
      screenDefs,
      onOpen2D: handleOpen2D,
      tickWater,
      onClose2D: handleClose2D,
      notifyRef,
    });

    // Áudio
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    new THREE.AudioLoader().load("/sound/ost.mp3",
      (buffer) => {
        sound.setBuffer(buffer); sound.setLoop(true); sound.setVolume(0.2);
        document.addEventListener("click",
          () => { if (!sound.isPlaying) sound.play(); },
          { once: true }
        );
      },
      undefined,
      (err) => console.error("Áudio:", err),
    );

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer?.setSize?.(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cleanup?.();
      renderer?.dispose?.();
      composer?.dispose?.();
    };
  }, [screenDefs, handleOpen2D, handleClose2D]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Escape" && panel2D !== null) {
        e.preventDefault(); closeFromReact();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [panel2D, closeFromReact]);

  return (
    <>
      {/* Portais: componentes de página montados fora da tela para o CSS3D usar */}
      {SCREEN_CONFIGS.map((cfg) => (
        <ScreenPortal key={cfg.id} id={cfg.id} onMount={handleScreenMount}>
          <cfg.component />
        </ScreenPortal>
      ))}

      {/* Overlays JSX (HUD + hint F) via portal nos wrappers CSS3D */}
      <ScreenOverlays notifyRef={notifyRef} />

      {/* Canvas 3D + layer CSS3D */}
      <div style={{
        position: "fixed", inset: 0,
        width: "100vw", height: "100vh",
        overflow: "hidden", zIndex: 0, pointerEvents: "none",
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", pointerEvents: "auto" }}
        />
        <div
          ref={cssLayerRef}
          style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" }}
        />
      </div>

      {/* Painel 2D clicável */}
      {panel2D !== null && (
        <Panel2D screenIndex={panel2D} onClose={closeFromReact} />
      )}
    </>
  );
}