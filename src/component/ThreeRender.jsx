import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Essa função é responsável pela geração da cena, gráficos, céu, e terreno

export function createScene(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.5,
    300,
  );
  camera.position.set(42, 1.7, 0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.physicallyCorrectLights = true;

  // Terreno 

  // Carregar texturas 
  const loader = new THREE.TextureLoader();
  /*
  Textura da grama: https://aitextured.com/textures/grass/realistic-grass-seamless-texture.html
  Texturas albedo, normal, ao, heigh, orm, roughness, heigh feitas através de https://aitextured.com/pbr-texture-generator/
  */
  const albedo = loader.load("/texture/grass__Png_albedo.png");
  const normalMap = loader.load("/texture/grass__Png_normal.png");
  const aoMap = loader.load("/texture/grass__Png_ao.png");
  const heightMap = loader.load("/texture/grass__Png_height.png");

  // Ajuste de repetição da textura
  [albedo, normalMap, aoMap, heightMap].forEach((tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(512, 512); // ajuste para cobrir o terreno
  });

  // Geometria do terreno 
  const size = 500;
  const segments = 256;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  // UV2 necessário para AO
  geometry.attributes.uv2 = geometry.attributes.uv;
  // Ondulações suaves do terreno
  const pos = geometry.attributes.position;
  const flatRadius = 40;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const distance = Math.sqrt(x * x + z * z);

    let height = 0;
    height = Math.max(0, Math.min(height, 0.158));
    if (distance > flatRadius) {
      const t = Math.min((distance - flatRadius) / 120, 1);
      const smooth = t * t * (3 - 2 * t);
      const large =
        Math.sin(x * 0.004) * 5 + 
        Math.sin(z * 0.004) * 4 +
        Math.sin((x + z) * 0.003) * 3;
      height = large * smooth;
    }
    pos.setY(i, height);
  }

  geometry.computeVertexNormals();
  pos.needsUpdate = true;

  // Material estilo Vista 
  const material = new THREE.MeshPhysicalMaterial({
    map: albedo,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.3, 0.3), // normal map leve
    aoMap: aoMap,
    aoMapIntensity: 0.15, // sombra leve
    displacementMap: heightMap,
    displacementScale: 0.03, // ondulação mínima
    color: new THREE.Color(0x6edc5a),
    roughness: 0.7, // suave, sem brilho forte
    metalness: 0, // grama não metálica
    clearcoat: 0, // sem brilho extra
    envMapIntensity: 0, // sem reflexo do ambiente
  });

  albedo.minFilter = THREE.LinearMipMapLinearFilter;
  albedo.magFilter = THREE.LinearFilter;

  // Mesh 
  const ground = new THREE.Mesh(geometry, material);
  ground.position.y = 0.14;
  scene.add(ground);

  // Fog suave para horizonte infinito 
  scene.fog = new THREE.FogExp2(0xcfeeff, 0.0015);
  // cor próxima ao céu, densidade baixa para desaparecer gradualmente

  // Plano de água ao redor do terreno 
  const waterGeometry = new THREE.PlaneGeometry(2000, 2000);
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x5ea7c4,
    roughness: 0.6, // ondulações suaves
    metalness: 0.1, // leve reflexo
    transparent: true,
    opacity: 0.5, // translúcido
    reflectivity: 0.3,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotateX(-Math.PI / 2);
  water.position.y = -1;
  scene.add(water);

  //Texturas
  const textureLoader = new THREE.TextureLoader();

  const texturaGotasNormal = textureLoader.load("/texture/water_drops_normal.png");
  const texturaPiso = textureLoader.load("/texture/shiny_marble.png");
  const texturaMetalEscovado = textureLoader.load("/texture/brushed_metal_normal.jpg");

  texturaGotasNormal.colorSpace = THREE.NoColorSpace;
  texturaMetalEscovado.colorSpace = THREE.NoColorSpace;

  // Configuração para a textura se repetir corretamente

  texturaGotasNormal.wrapS = THREE.RepeatWrapping;
  texturaGotasNormal.wrapT = THREE.RepeatWrapping;
  texturaGotasNormal.repeat.set(32, 32); // Repete a imagem 4x para as gotas ficarem menores

  texturaPiso.wrapS = THREE.RepeatWrapping;
  texturaPiso.wrapT = THREE.RepeatWrapping;
  texturaPiso.repeat.set(10, 10); // Repete a imagem 4x para as gotas ficarem menores

  // Carregamento via JSON exportado do Three.js Editor
  // Vantagem contra GLB por velocidade e customização via JSON(apesar de ser verbosa)
  fetch("/app.json")
    .then((response) => response.json())
    .then((json) => {
      const objeto = new THREE.ObjectLoader().parse(json.scene);

      // ARREDONDANDO PISOS 

      const nomePisos = ["caminho_1", "caminho_2", "caminho_3", "caminho_4"];

      nomePisos.forEach((nome) => {
        const piso = objeto.getObjectByName(nome);

        if (piso && piso.material) {
          piso.geometry.computeBoundingBox();
          const box = piso.geometry.boundingBox;
          const largura = box.max.x - box.min.x;
          const comprimento = box.max.y - box.min.y;

          const espessuraPlaca = 0.2;

          const raioBorda = 0.6;
          const geometriaArredondada = new RoundedBoxGeometry(
            largura,
            comprimento,
            espessuraPlaca,
            4,
            raioBorda,
          );
          piso.geometry.dispose();
          piso.geometry = geometriaArredondada;

          piso.material.needsUpdate = true;
        }
      });
      // MELHORANDO O PISO E PREDIOS 
      const nomePisosePredios = [
        "plataform_start",
        "caminho_2",
        "caminho_1",
        "caminho_3",
        "caminho_4",
        "platform_1",
        "platform_3",
        "platform_4",
      ];

      nomePisosePredios.forEach((nome) => {
        const pisoPredio = objeto.getObjectByName(nome);

        if (pisoPredio && pisoPredio.material) {
          pisoPredio.material.normalMap = texturaPiso;
          pisoPredio.material.normalScale.set(0.5, 0.5);

          pisoPredio.material.color.setHex(0xf4fbff);

          pisoPredio.material.roughness = 0.09;
          pisoPredio.material.metalness = 0.1;
          pisoPredio.material.clearcoat = 1.0;
          pisoPredio.material.clearcoatRoughness = 0.0;
          pisoPredio.material.envMapIntensity = 0.7;
          pisoPredio.material.needsUpdate = true;
        }
      });

      // MELHORANDO A BOLHA DE ÁGUA 
      const nomesBolhas = ["bolha_flutuante", "plataform_2", "topo_predio_4"];

      nomesBolhas.forEach((nome) => {
        const painel = objeto.getObjectByName(nome);
        if (painel && painel.material) {
          painel.material.normalMap = texturaGotasNormal; // Aplica o relevo das gotas
          painel.material.normalScale.set(0.5, 0.5);
          painel.material.color.setHex(0xd4f0ff); 
          painel.material.transmission = 0.85; 
          painel.material.opacity = 1.0;
          painel.material.iridescence = 0.7; 
          painel.material.iridescenceIOR = 1.3;
          painel.material.iridescenceThicknessRange = [100, 400]; 
          painel.material.roughness = 0.0;
          painel.material.clearcoat = 1.0;
          painel.material.clearcoatRoughness = 0.0;
          painel.material.ior = 1.5; 
        }
      });

      // MELHORANDO OS PAINÉIS PRATEADOS (verificar se ainda serão utilizados)
      const nomesPainel = ["panel_1", "panel_2", "panel_3", "panel_4"];

      nomesPainel.forEach((nome) => {
        const painel = objeto.getObjectByName(nome);
        if (painel && painel.material) {
          painel.material.normalMap = texturaMetalEscovado;
          painel.material.normalScale.set(0.2, 0.2);
        }
      });

      scene.add(objeto);
    });

  // Luz principal (sol)
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(300, 500, 200); // posição do sol
  // Sombra do sol
  sun.castShadow = true;
  sun.shadow.mapSize.width = 4096;
  sun.shadow.mapSize.height = 4096;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 1000;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);

  scene.add(sun);
  scene.add(ambient);

  // Fog para efeito de raios de sol visíveis
  scene.fog = new THREE.FogExp2(0xcfeeff, 0.005);

  // Skybox e ambiente
  new EXRLoader().load("/texture/sky2.exr", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.background = texture;

    // Environment map para reflexos
    scene.environment = texture;

    // Ajuste de intensidade do reflexo
    scene.traverse((obj) => {
      if (obj.isMesh && obj.material.envMap) {
        obj.material.envMapIntensity = 0.3; // reduz reflexo do skybox
        obj.material.needsUpdate = true;
      }
    });
  });

  // GLB 
  //new GLTFLoader().load("/campus_nofloor.glb", (gltf) => scene.add(gltf.scene));

  // Composer / Bloom 
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.1,
    0.2,
    0.4,
  );
  composer.addPass(bloomPass);

  return { scene, camera, renderer, composer, ground };
}
