import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

/**
 * CONTROLES:
 * - WASD: anda (auto-trava quando tenta andar)
 * - E: alterna PLAYER (lock) e UI (unlock)
 * - T: alterna modo EDITAR telas
 * - 1/2/3/4: seleciona tela
 * - Tab: próxima tela
 * - (EDITAR) setas/PgUp/PgDn/Q/E/+/-: ajusta tela 3D
 *
 * ✅ NOVO (UI 2D real):
 * - Aproximou de uma tela -> abre painel 2D automaticamente
 * - F: força abrir painel 2D da tela selecionada
 * - Esc: fecha painel 2D
 */

export function setupPlayerControls(camera, renderer, composer, ground, scene, cssLayer) {
  // =========================
  // Player / PointerLock
  // =========================
  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = new Set();
  controls.addEventListener("unlock", () => keys.clear());

  // =========================
  // Stacking básico
  // =========================
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.zIndex = "0";
  renderer.domElement.style.pointerEvents = "auto";

  cssLayer.style.position = "fixed";
  cssLayer.style.inset = "0";
  cssLayer.style.zIndex = "10";
  cssLayer.style.pointerEvents = "none"; // ✅ CSS3D não recebe clique (só visual)

  // =========================
  // CSS3D Renderer (preview 3D)
  // =========================
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);

  cssRenderer.domElement.style.position = "fixed";
  cssRenderer.domElement.style.inset = "0";
  cssRenderer.domElement.style.width = "100vw";
  cssRenderer.domElement.style.height = "100vh";
  cssRenderer.domElement.style.zIndex = "10";
  cssRenderer.domElement.style.pointerEvents = "none"; // ✅ chave: não tenta clicar no CSS3D

  cssLayer.appendChild(cssRenderer.domElement);

  // =========================
  // Fontes das telas
  // =========================
  const SCREEN_SOURCES = [
    { id: "tela1", url: "/pages/sobre.html",        title: "Tela 1" },
    { id: "tela2", url: "/pages/projetos.html",     title: "Tela 2" },
    { id: "tela3", url: "/pages/experiencias.html", title: "Tela 3" },
    { id: "tela4", url: "/pages/contato.html",      title: "Tela 4" },
  ];

  const screens = SCREEN_SOURCES.map((s, i) =>
    createCssPreviewScreen({
      id: s.id,
      title: s.title,
      url: s.url,
      scene,
      position: new THREE.Vector3(0, 2.2, i * 6),
      rotationY: Math.PI / 2,
      scale: 0.01,
    })
  );

  // =========================
  // UI 2D clicável
  // =========================
  const ui2d = document.createElement("div");
  ui2d.dataset.ui2d = "true";
  ui2d.style.position = "fixed";
  ui2d.style.inset = "0";
  ui2d.style.zIndex = "999999";
  ui2d.style.display = "none";
  ui2d.style.pointerEvents = "auto"; 
  ui2d.style.background = "rgba(0,0,0,0.25)";
  ui2d.style.backdropFilter = "blur(2px)";

  ui2d.innerHTML = `
    <div data-ui2d-panel style="
      position:absolute; left:50%; top:50%;
      transform:translate(-50%,-50%);
      width:min(980px, 92vw);
      height:min(620px, 86vh);
      border-radius:24px;
      overflow:hidden;
      box-shadow: 0 18px 60px rgba(0,0,0,.35);
      border: 2px solid rgba(255,255,255,.25);
      background: rgba(255,255,255,.08);
    ">
      <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding:10px 12px;
        background: rgba(0,0,0,.35);
        color: white; font: 600 13px/1 system-ui;
      ">
        <div data-ui2d-title>Preview</div>
        <button data-ui2d-close style="
          all:unset; cursor:pointer; padding:6px 10px;
          border-radius:10px; background: rgba(255,255,255,.12);
        ">Fechar (Esc)</button>
      </div>
      <iframe data-ui2d-iframe
        style="width:100%; height:calc(100% - 44px); border:0; display:block; background:white;"
      ></iframe>
    </div>
  `;

  document.body.appendChild(ui2d);

  const ui2dPanel = ui2d.querySelector("[data-ui2d-panel]");
  const ui2dIframe = ui2d.querySelector("[data-ui2d-iframe]");
  const ui2dTitle = ui2d.querySelector("[data-ui2d-title]");
  const ui2dClose = ui2d.querySelector("[data-ui2d-close]");

  let ui2dOpen = false;
  let ui2dForced = false;      // F força abrir
  let selectedIndex = 0;
  let editMode = false;
let autoBlocked = false;
let autoBlockUntilFar = false;
  function open2DFor(index) {
    const scr = screens[index];
    if (!scr) return;

    ui2dTitle.textContent = `${scr.title} • ${scr.url}`;
    ui2dIframe.src = scr.url;

    ui2d.style.display = "block";
    ui2dOpen = true;

    if (controls.isLocked) controls.unlock();
    renderer.domElement.style.pointerEvents = "none";
  }

  function close2D(manual = true) {
  ui2d.style.display = "none";
  ui2dOpen = false;
  ui2dForced = false;

  renderer.domElement.style.pointerEvents = "auto";

  if (manual) {
    autoBlocked = true;
    autoBlockUntilFar = true; // só libera quando se afastar
  }
}

  ui2dClose.addEventListener("click", close2D);
  ui2d.addEventListener("mousedown", (e) => {
    if (e.target === ui2d) close2D();
  });

  // =========================
  // Visual seleção (tela 3D)
  // =========================
  function refreshSelectionVisual() {
    screens.forEach((scr, i) => {
      scr.el.style.outline = i === selectedIndex ? "2px solid rgba(255,255,255,0.75)" : "none";
      scr.el.style.boxShadow = i === selectedIndex ? "0 0 24px rgba(255,255,255,0.18)" : "none";

      const badge = scr.el.querySelector('[data-badge="mode"]');
      if (badge) badge.textContent = editMode ? "EDITAR" : (controls.isLocked ? "PLAYER" : "UI");

      const sel = scr.el.querySelector('[data-badge="sel"]');
      if (sel) sel.textContent = i === selectedIndex ? "SELECIONADA" : "";
    });
  }
  refreshSelectionVisual();

  // =========================
  // Layout load
  // =========================
  (async () => {
    try {
      const layout = await fetchLayoutJson("/config/layout.json");
      applyScreensLayout(screens, layout);
      refreshSelectionVisual();
    } catch {}
  })();

  // =========================
  // Teclado
  // =========================
  const preventScrollKeys = new Set([
    "ArrowUp","ArrowDown","ArrowLeft","ArrowRight","PageUp","PageDown","Space"
  ]);

  const onKeyDown = (e) => {
    // fechar UI 2D
    if (e.code === "Escape" && !e.repeat && ui2dOpen) {
      e.preventDefault();
      close2D();
      return;
    }

    // Exportar layout (Ctrl+S)
    if (e.ctrlKey && e.code === "KeyS" && !e.repeat) {
      e.preventDefault();
      const layout = serializeScreensLayout(screens);
      downloadJsonFile("layout.json", layout);
      return;
    }

    // Importar layout (Ctrl+O)
    if (e.ctrlKey && e.code === "KeyO" && !e.repeat) {
      e.preventDefault();
      openJsonFilePicker((json) => {
        applyScreensLayout(screens, json);
        refreshSelectionVisual();
      });
      return;
    }

    // Alterna modo EDITAR
    if (e.code === "KeyT" && !e.repeat) {
      editMode = !editMode;
      if (editMode && controls.isLocked) controls.unlock();
      refreshSelectionVisual();
      return;
    }

    // E: alterna lock/unlock (jogar <-> interagir)
    if (e.code === "KeyE" && !e.repeat) {
      e.preventDefault();
      if (controls.isLocked) controls.unlock();
      else controls.lock();
      refreshSelectionVisual();
      return;
    }

    // F: força abrir UI 2D da tela selecionada
    if (e.code === "KeyF" && !e.repeat) {
      e.preventDefault();
      ui2dForced = !ui2dForced;
      if (ui2dForced) open2DFor(selectedIndex);
      else close2D();
      return;
    }

    // seleção por número / Tab
    if (!e.repeat) {
      if (e.code === "Digit1") selectedIndex = 0;
      if (e.code === "Digit2") selectedIndex = 1;
      if (e.code === "Digit3") selectedIndex = 2;
      if (e.code === "Digit4") selectedIndex = 3;

      if (e.code === "Tab") {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % screens.length;
      }
      refreshSelectionVisual();
    }

    if (editMode && preventScrollKeys.has(e.code)) e.preventDefault();
    keys.add(e.code);
  };

  const onKeyUp = (e) => keys.delete(e.code);

  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });

  // =========================
  // Auto-open por proximidade
  // =========================
  const AUTO_OPEN_DIST = 3.2;   
  const LOOK_DOT = 0.55;        

  function shouldAutoOpen(scrObj) {
    const camPos = camera.position;
    const scrPos = scrObj.position;

    const dist = camPos.distanceTo(scrPos);
    if (dist > AUTO_OPEN_DIST) return false;

    // olhar: compara direção da câmera com direção até a tela
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const toScreen = new THREE.Vector3().subVectors(scrPos, camPos).normalize();
    const dot = forward.dot(toScreen);

    return dot > LOOK_DOT;
  }

  // =========================
  // Loop
  // =========================
  const raycaster = new THREE.Raycaster();
  let bobTime = 0;
  const clock = new THREE.Clock();

  let rafId = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    const selected = screens[selectedIndex]?.obj;

    // --- auto abrir UI2D (se não estiver forçado manualmente)
    if (!ui2dForced) {
  const nearIndex = screens.findIndex((s) => shouldAutoOpen(s.obj));

  // Se estiver bloqueado, só libera quando sair da área
  if (autoBlocked) {
    if (nearIndex < 0) {
      autoBlocked = false;
      autoBlockUntilFar = false;
    }
  } else {
    if (nearIndex >= 0) {
      if (!ui2dOpen) open2DFor(nearIndex);
    } else {
      if (ui2dOpen) close2D(false);
    }
  }
}

    if (!editMode && !ui2dOpen) {
      const speed = 5;

      const forward =
        (keys.has("KeyW") ? 1 : 0) + (keys.has("KeyS") ? -1 : 0);
      const strafe =
        (keys.has("KeyD") ? 1 : 0) + (keys.has("KeyA") ? -1 : 0);

      if (forward !== 0 || strafe !== 0) {
        if (!controls.isLocked) {
          controls.lock();
          refreshSelectionVisual();
        }

        controls.moveForward(forward * speed * delta);
        controls.moveRight(strafe * speed * delta);

        raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
          camera.position.y =
            intersects[0].point.y + 1.7 + Math.sin(bobTime) * 0.04;
          bobTime += delta * 8;
        }
      } else {
        bobTime = 0;
      }
    } else if (editMode && selected) {
      const moveStep = 6 * delta;
      const rotStep = 1.8 * delta;
      const scaleStep = 0.6 * delta;

      if (keys.has("ArrowLeft")) selected.position.x -= moveStep;
      if (keys.has("ArrowRight")) selected.position.x += moveStep;
      if (keys.has("ArrowUp")) selected.position.z -= moveStep;
      if (keys.has("ArrowDown")) selected.position.z += moveStep;

      if (keys.has("PageUp")) selected.position.y += moveStep;
      if (keys.has("PageDown")) selected.position.y -= moveStep;

      if (keys.has("KeyQ")) selected.rotation.y += rotStep;
      if (keys.has("KeyE")) selected.rotation.y -= rotStep;

      if (keys.has("Equal") || keys.has("NumpadAdd")) {
        const s = selected.scale.x + scaleStep;
        selected.scale.set(s, s, s);
      }
      if (keys.has("Minus") || keys.has("NumpadSubtract")) {
        const s = Math.max(0.001, selected.scale.x - scaleStep);
        selected.scale.set(s, s, s);
      }
    }

    composer.render();
    cssRenderer.render(scene, camera);
  };

  animate();

  // =========================
  // Resize
  // =========================
  const onResize = () => cssRenderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", onResize);

  // =========================
  // Cleanup
  // =========================
  return () => {
    cancelAnimationFrame(rafId);

    window.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("keyup", onKeyUp, { capture: true });
    window.removeEventListener("resize", onResize);

    screens.forEach((scr) => {
      scene.remove(scr.obj);
      scr.el.replaceChildren();
    });

    if (cssRenderer.domElement?.parentNode) {
      cssRenderer.domElement.parentNode.removeChild(cssRenderer.domElement);
    }

    ui2d.remove();
  };
}

/**
 * Preview 3D (CSS3D) - só visual
 * Pointer-events sempre NONE para não depender de hit-test.
 */
function createCssPreviewScreen({ id, title, url, scene, position, rotationY, scale }) {
  const el = document.createElement("div");
  el.classList.add("css3d-ui");

  el.style.position = "relative";
  el.style.width = "900px";
  el.style.height = "520px";
  el.style.borderRadius = "28px";
  el.style.overflow = "hidden";
  el.style.background = "transparent";
  el.style.userSelect = "none";

  el.style.pointerEvents = "none";

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.background = "white";

  iframe.style.pointerEvents = "none";

  el.appendChild(iframe);

  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.top = "10px";
  hud.style.left = "12px";
  hud.style.display = "flex";
  hud.style.gap = "8px";
  hud.style.zIndex = "9999";
  hud.style.pointerEvents = "none";

  hud.innerHTML = `
    <div data-badge="mode" style="font: 12px/1.2 system-ui; padding:6px 10px; border-radius:999px; background:rgba(0,0,0,.35); color:white;">PLAYER</div>
    <div data-badge="sel"  style="font: 12px/1.2 system-ui; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.18); color:white;"></div>
  `;
  el.appendChild(hud);

  const obj = new CSS3DObject(el);
  obj.position.copy(position);
  obj.rotation.y = rotationY ?? 0;
  obj.scale.setScalar(scale ?? 0.01);

  scene.add(obj);

  return { id, title, url, el, obj };
}

/* =========================================================
   Layout helpers
   ========================================================= */
function serializeScreensLayout(screens) {
  const layout = {};
  screens.forEach((scr) => {
    const o = scr.obj;
    layout[scr.id] = {
      position: { x: o.position.x, y: o.position.y, z: o.position.z },
      rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
      scale: o.scale.x,
    };
  });
  return layout;
}

function applyScreensLayout(screens, layout) {
  screens.forEach((scr) => {
    const d = layout?.[scr.id];
    if (!d) return;

    scr.obj.position.set(d.position.x, d.position.y, d.position.z);
    scr.obj.rotation.set(d.rotation.x, d.rotation.y, d.rotation.z);
    scr.obj.scale.setScalar(d.scale ?? scr.obj.scale.x);
  });
}

function downloadJsonFile(filename, dataObj) {
  const json = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

async function fetchLayoutJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar layout: ${res.status}`);
  return res.json();
}

function openJsonFilePicker(onJson) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    const json = JSON.parse(text);
    onJson?.(json);
  });

  input.click();
}