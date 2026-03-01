import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

/**
 * CONTROLES:
 * - WASD: anda (auto-trava quando tenta andar)
 * - E: alterna entre JOGAR (lock) e INTERAGIR (unlock)
 * - Clique: se estiver travado, destrava (pra permitir clicar nos botões)
 *
 * - T: alterna modo EDITAR telas
 * - 1/2/3/4: seleciona tela
 * - Tab: próxima tela
 *
 * - (EDITAR) Setas: move X/Z
 * - (EDITAR) PgUp/PgDn: move Y
 * - (EDITAR) Q/E: rotaciona Y
 * - (EDITAR) + / -: escala
 *
 * Layout:
 * - Ctrl+S: exporta layout.json
 * - Ctrl+O: importa layout.json
 */

export function setupPlayerControls(camera, renderer, composer, ground, scene, cssLayer) {
  // =========================
  // PointerLock / Player
  // =========================
  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = new Set();

  // sempre que destravar, limpa teclas (evita “W preso”)
  controls.addEventListener("unlock", () => keys.clear());

  // =========================
  // CSS3D Renderer (overlay layer)
  // =========================
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);

  cssRenderer.domElement.style.position = "absolute";
  cssRenderer.domElement.style.top = "0";
  cssRenderer.domElement.style.left = "0";
  cssRenderer.domElement.style.width = "100%";
  cssRenderer.domElement.style.height = "100%";
  cssRenderer.domElement.style.pointerEvents = "auto";
  cssRenderer.domElement.style.zIndex = "10";

  cssLayer.appendChild(cssRenderer.domElement);

  // =========================
  // Telas (iframes)
  // =========================
  const SCREEN_SOURCES = [
    { id: "tela1", url: "/pages/sobre.html", title: "Tela 1" },
    { id: "tela2", url: "/pages/projetos.html", title: "Tela 2" },
    { id: "tela3", url: "/pages/experiencias.html", title: "Tela 3" },
    { id: "tela4", url: "/pages/contato.html", title: "Tela 4" },
  ];

  const onUiWantsFocus = () => {
    if (controls.isLocked) controls.unlock();
  };

  const screens = SCREEN_SOURCES.map((s, i) =>
    createCssScreen({
      id: s.id,
      title: s.title,
      url: s.url,
      scene,
      position: new THREE.Vector3(0, 2.2, i * 6),
      rotationY: Math.PI / 2,
      scale: 0.01,
      onUiWantsFocus,
    })
  );

  let selectedIndex = 0;
  let editMode = false;

  function refreshSelectionVisual() {
    screens.forEach((scr, i) => {
      scr.el.style.outline = i === selectedIndex ? "2px solid rgba(255,255,255,0.75)" : "none";
      scr.el.style.boxShadow = i === selectedIndex ? "0 0 24px rgba(255,255,255,0.18)" : "none";
      scr.el.dataset.selected = i === selectedIndex ? "true" : "false";

      const badge = scr.el.querySelector('[data-badge="mode"]');
      if (badge) badge.textContent = editMode ? "EDITAR" : (controls.isLocked ? "PLAYER" : "UI");

      const sel = scr.el.querySelector('[data-badge="sel"]');
      if (sel) sel.textContent = i === selectedIndex ? "SELECIONADA" : "";
    });
  }
  refreshSelectionVisual();

  // =========================
  // Layout: carregar ao iniciar (se existir)
  // =========================
  (async () => {
    try {
      const layout = await fetchLayoutJson("/config/layout.json");
      applyScreensLayout(screens, layout);
      refreshSelectionVisual();
    } catch {
      // sem layout default
    }
  })();

  // =========================
  // CLIQUE: se estiver travado, destrava (pra UI funcionar)
  // (capture global = pega antes de qualquer coisa)
  // =========================
  const onAnyMouseDownCapture = (e) => {
    if (!controls.isLocked) return;

    controls.unlock();
    keys.clear();
    refreshSelectionVisual();

    // esse clique serve só pra destravar
    e.preventDefault();
    e.stopPropagation();
  };

  window.addEventListener("mousedown", onAnyMouseDownCapture, true);

  // =========================
  // Teclado
  // =========================
  const preventScrollKeys = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "PageUp",
    "PageDown",
    "Space",
  ]);

  const onKeyDown = (e) => {
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

    // Tecla E: alterna lock/unlock (jogar <-> interagir)
    if (e.code === "KeyE" && !e.repeat) {
      e.preventDefault();
      if (controls.isLocked) controls.unlock();
      else controls.lock();
      refreshSelectionVisual();
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

    // Só previne scroll quando está no modo EDITAR
    if (editMode && preventScrollKeys.has(e.code)) e.preventDefault();

    keys.add(e.code);
  };

  const onKeyUp = (e) => keys.delete(e.code);

  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });

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

    if (!editMode) {
      const speed = 5;

      const forward = (keys.has("KeyW") ? 1 : 0) + (keys.has("KeyS") ? -1 : 0);
      const strafe  = (keys.has("KeyD") ? 1 : 0) + (keys.has("KeyA") ? -1 : 0);

      if (forward !== 0 || strafe !== 0) {
        // auto-lock quando tenta andar
        if (!controls.isLocked) {
          controls.lock();
          refreshSelectionVisual();
        }

        // move mesmo frame (não depende do isLocked atualizar)
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
    } else if (selected) {
      // ===== Modo editar
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

    window.removeEventListener("mousedown", onAnyMouseDownCapture, true);
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
  };
}

/*
  Cria uma tela CSS3D com iframe.
  Obs: o iframe só recebe clique quando o pointerlock estiver destravado.
 */
function createCssScreen({ id, title, url, scene, position, rotationY, scale, onUiWantsFocus }) {
  const el = document.createElement("div");
  el.classList.add("css3d-ui");

  el.style.position = "relative";
  el.style.width = "900px";
  el.style.height = "520px";
  el.style.borderRadius = "28px";
  el.style.overflow = "hidden";
  el.style.pointerEvents = "auto";
  el.style.background = "transparent";
  el.style.userSelect = "auto";

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.background = "transparent";
  iframe.setAttribute("scrolling", "yes");

  // Qualquer tentativa de interagir com a tela destrava
  iframe.addEventListener("load", () => {
    try {
      const w = iframe.contentWindow;
      w.addEventListener("mousedown", () => onUiWantsFocus?.(), { passive: true });
      w.addEventListener("wheel", () => onUiWantsFocus?.(), { passive: true });
      w.addEventListener("touchstart", () => onUiWantsFocus?.(), { passive: true });
    } catch {
      // cross-origin etc
    }
  });

  el.appendChild(iframe);

  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.top = "10px";
  hud.style.right = "12px";
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

  const s = scale ?? 0.01;
  obj.scale.set(s, s, s);

  scene.add(obj);

  // wrapper também destrava
  el.addEventListener("mouseenter", () => onUiWantsFocus?.(), { passive: true });
  el.addEventListener("mousedown", () => onUiWantsFocus?.(), { passive: true });
  el.addEventListener("wheel", () => onUiWantsFocus?.(), { passive: true });

  return { id, title, el, obj };
}

/* =========================================================
   Layout (export/import/load)
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