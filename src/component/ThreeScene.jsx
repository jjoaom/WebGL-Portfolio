import { useEffect, useRef } from "react";
import { createScene } from "./ThreeRender";
import { setupPlayerControls } from "./PlayerControls";

// Essa função é a função principal de renderização do Threejs

export default function ThreeScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const { camera, renderer, composer, ground } = createScene(
      mountRef.current
    );

    setupPlayerControls(camera, renderer, composer, ground);

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      renderer.dispose();
      composer.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}