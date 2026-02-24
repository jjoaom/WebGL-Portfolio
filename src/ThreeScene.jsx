import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { WebGPURenderer } from "three/webgpu";
import gsap from "gsap";

export default function ThreeScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    // verificação de useEffect duplicado devido ao react StrictMode
    if (mountRef.current.childNodes.length > 0) return;
    let renderer;
    let composer;
    let scene, camera;
    let campus;

    const keys = {};
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clock = new THREE.Clock();

    async function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color("#87CEFA");

      camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );
      camera.position.set(0, 2, 10);

      // WebGPU → WebGL fallback
      if ("gpu" in navigator) {
        try {
          renderer = new WebGPURenderer({ antialias: true });
          await renderer.init();
          console.log("Using WebGPU");
        } catch {
          renderer = new THREE.WebGLRenderer({ antialias: true });
          console.log("WebGPU failed → using WebGL");
        }
      } else {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        console.log("Using WebGL");
      }

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setSize(window.innerWidth, window.innerHeight);

      mountRef.current.innerHTML = "";
      mountRef.current.appendChild(renderer.domElement);

      // Luz
      const dirLight = new THREE.DirectionalLight(0xffffff, 3);
      dirLight.position.set(20, 40, 20);
      scene.add(dirLight);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);

      // GLB
      const loader = new GLTFLoader();
      loader.load("/campus.glb", (gltf) => {
        campus = gltf.scene;
        scene.add(campus);
      });

      // Bloom apenas WebGL
      if (renderer instanceof THREE.WebGLRenderer) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));

        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.8,
          0.4,
          0.85,
        );

        composer.addPass(bloomPass);
      }

      animate();
    }

    function handleClick(event) {
      if (!controls.isLocked && !isFocusing) {
        controls.lock();
        return;
      }

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        focusOnObject(intersects[0].object);
      }
    }

    function handleKeyDown(e) {
      keys[e.key.toLowerCase()] = true;
    }

    function handleKeyUp(e) {
      keys[e.key.toLowerCase()] = false;
    }

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);

      if (composer) {
        composer.render();
      } else {
        renderer?.render(scene, camera);
      }
    }

    init();

    return () => {
      renderer?.dispose();
      composer?.dispose();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      renderer?.domElement?.removeEventListener("click", handleClick);
    };
  }, []);

  return <div ref={mountRef} />;
}
