import { useEffect, useRef } from "react";
import { createScene } from "./ThreeRender";
import { setupPlayerControls } from "./PlayerControls";

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
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      <div
        ref={cssLayerRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10,
          pointerEvents: "auto", 
        }}
      />
    </div>
  );
}