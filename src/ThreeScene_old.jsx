import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

export default function ThreeScene_old() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || mountRef.current.childNodes.length > 0) return;

    let scene, camera, renderer, composer, controls;
    const clock = new THREE.Clock();

    //  Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#0x9fd4ff");

    // Terreno
    const size = 300;
    const segments = 300; // quanto maior, mais suave

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;

    const flatRadius = 40;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const distance = Math.sqrt(x * x + z * z);

      let height = 0;

      if (distance > flatRadius) {
        // transição suave tipo smoothstep
        const t = Math.min((distance - flatRadius) / 120, 1);
        const smooth = t * t * (3 - 2 * t); // curva suave

        // ondas largas (não radiais puras)
        const large =
          Math.sin(x * 0.004) * 25 +
          Math.sin(z * 0.004) * 20 +
          Math.sin((x + z) * 0.003) * 15;

        height = large * smooth;
      }

      pos.setY(i, height);
    }

    geometry.computeVertexNormals();
    pos.needsUpdate = true;

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x6edc5a,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    });

    const chao = new THREE.Mesh(geometry, material);

    chao.position.y = 0.15;

    scene.add(chao);

    //  Câmera
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      300,
    );
    camera.position.set(42, 1.6, 0);

    //  Renderer (WebGL obrigatório para bloom estável)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Tone mapping ESSENCIAL para bloom funcionar direito
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyCorrectLights = true;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Skybox usa EXRLoader para carregar
    new EXRLoader().load("/sky1.exr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;

      // Fundo visível
      scene.background = texture;

      // Iluminação ambiental física (reflexos)
      scene.environment = texture;
    });

    //  Luzes
    scene.add(new THREE.AmbientLight(0xfff8c4, 0.1));
    scene.environmentIntensity = 0.4;

    const dirLight = new THREE.DirectionalLight(0xfff8c4, 1);
    dirLight.position.set(100, 80, 0);
    scene.add(dirLight);

    //  Sol visual (com emissive forte)
    /* Removido por inserção de iluminação via skybox
    const sunGeometry = new THREE.SphereGeometry(4, 64, 64);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3,
      metalness: 0,
      roughness: 0.2,
    });
    

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(20, 80, 80);
    scene.add(sun);
    */

    // Fog
    scene.fog = new THREE.Fog(0xcfeeff, 80, 350);

    //  Carregar GLB
    new GLTFLoader().load(
      "/campus_nofloor.glb",
      (gltf) => scene.add(gltf.scene),
      undefined,
      (err) => console.error("Erro ao carregar GLB:", err),
    );

    //  Composer / Bloom
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, // strength
      0.55, // radius
      0.55, // threshold
    );

    composer.addPass(bloomPass);

    // ---------------------- //

    // --- Controles ---
    controls = new PointerLockControls(camera, renderer.domElement);
    renderer.domElement.addEventListener("click", () => {
      if (!controls.isLocked) controls.lock();
    });

    // --- Movimento via mouse click ---
    let moving = false;
    renderer.domElement.addEventListener("mousedown", () => (moving = true));
    renderer.domElement.addEventListener("mouseup", () => (moving = false));

    const raycaster = new THREE.Raycaster();

    // --- Head bobbing ---
    let bobTime = 0;

    // --- Resize ---
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);

    // --- Animate ---
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // --- Movimento ---
      if (moving) {
        const speed = 5;

        // moveForward automático, respeitando direção da câmera
        controls.moveForward(speed * delta);

        // --- Raycaster para altura ---
        raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(chao);
        if (intersects.length > 0) {
          camera.position.y =
            intersects[0].point.y + 1.7 + Math.sin(bobTime) * 0.02; // altura + head bob leve
          bobTime += delta * 8;
        }
      } else {
        bobTime = 0;
      }

      composer.render();
    }

    animate();

    return () => {
      renderer.dispose();
      composer.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
