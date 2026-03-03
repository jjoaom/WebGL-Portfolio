import { useEffect, useRef } from "react";
import { createScene } from "./ThreeRender";
import { setupPlayerControls } from "./PlayerControls";
import * as THREE from "three";

export default function ThreeScene() {
  const canvasRef = useRef(null);
  const cssLayerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cssLayer = cssLayerRef.current;
    if (!canvas || !cssLayer) return;

    const { scene, camera, renderer, composer, ground } = createScene(canvas);

    const cleanup = setupPlayerControls(
      camera,
      renderer,
      composer,
      ground,
      scene,
      cssLayer
    );

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
      composer?.setSize?.(window.innerWidth, window.innerHeight);

      window.dispatchEvent(new Event("css3d-resize"));
    }

    window.addEventListener("resize", handleResize);


    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.Audio(listener);
    const loader = new THREE.AudioLoader();

    loader.load(
      "/sound/ost.mp3",
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.2);

        // Autoplay só após interação
        document.addEventListener(
          "click",
          () => {
            if (!sound.isPlaying) sound.play();
          },
          { once: true }
        );
      },
      undefined,
      (err) => {
        console.error("Erro ao carregar áudio:", err);
      }
    );

    return () => {
      window.removeEventListener("resize", handleResize);

      if (typeof cleanup === "function") cleanup();

      renderer?.dispose?.();
      composer?.dispose?.();
    };
  }, []);

return (
  <div
    style={{
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      zIndex: 0,

      // ✅ IMPORTANTE: wrapper não pode capturar mouse
      pointerEvents: "none",
    }}
  >
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0,

        // canvas só pega mouse quando o PlayerControls liberar
        pointerEvents: "auto",
      }}
    />

    <div
      ref={cssLayerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,

        // ✅ tapete não pega mouse; quem pega são as telas (.css3d-ui)
        pointerEvents: "none",
      }}
    />
  </div>
);
}