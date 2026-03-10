import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";


// ScreenOverlay: HUD + hint badge via React portal

function ScreenOverlay({ wrapperEl, isHovered, isSelected, mode }) {
  if (!wrapperEl) return null;
  return createPortal(
    <>
      <div style={{
        position: "absolute", top: 10, left: 12,
        display: "flex", gap: 8, zIndex: 9999, pointerEvents: "none",
      }}>
        <span style={{
          background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)",
          color: "white", fontSize: 11, fontWeight: 600,
          padding: "5px 10px", borderRadius: 999, letterSpacing: "0.5px",
        }}>{mode}</span>
        {isSelected && (
          <span style={{
            background: "rgba(120,210,255,0.18)", border: "1px solid rgba(120,210,255,0.45)",
            color: "#7dd3fc", fontSize: 11, fontWeight: 600,
            padding: "5px 10px", borderRadius: 999,
          }}>SELECIONADA</span>
        )}
      </div>

      <div
        className={`position-absolute start-50 translate-middle-x d-flex align-items-center gap-2 px-3 py-2 rounded-pill border text-nowrap ${isHovered ? "opacity-100" : "opacity-0"
          }`}
        style={{
          bottom: 24,
          borderColor: "rgb(88, 220, 253)",
          backdropFilter: "blur(14px)",
          background:
            "linear-gradient(180deg, rgba(160,220,255,0.18), rgba(90,180,255,0.08))",
          boxShadow:
            "0 6px 30px rgba(60,193,255,0.25), inset 0 1px 0 rgba(255,255,255,0.25)",
          pointerEvents: "none",
          zIndex: 9999,
          transition: "opacity .35s ease",
        }}
      >
        <span
          className="d-inline-flex align-items-center justify-content-center fw-bold"
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            fontSize: 12,
            color: "#ffffff",
            background:
              "linear-gradient(180deg, rgba(139, 220, 250, 0.35), rgba(92, 184, 255, 0.18))",
            border: "1.5px solid rgba(120,220,255,0.65)",
            boxShadow:
              "0 0 14px rgba(159, 228, 253, 0.58), inset 0 1px 2px rgba(255, 255, 255, 0.91)",
          }}
        >
          F
        </span>

        <span className="fw-semibold small text-info">
          Pressione para visualizar
        </span>
      </div>
    </>,
    wrapperEl
  );
}


// ScreenOverlays: componente React que o ThreeScene renderiza

export function ScreenOverlays({ notifyRef }) {
  const [state, setState] = useState({
    screens: [], hoveredIndex: -1, selectedIndex: 0,
    editMode: false, isLocked: false,
  });

  useEffect(() => {
    notifyRef.current = (patch) => setState((prev) => ({ ...prev, ...patch }));
    return () => { notifyRef.current = null; };
  }, [notifyRef]);

  const { screens, hoveredIndex, selectedIndex, editMode, isLocked } = state;
  const mode = editMode ? "EDITAR" : isLocked ? "PLAYER" : "UI";

  return screens.map((scr, i) => (
    <ScreenOverlay
      key={scr.id}
      wrapperEl={scr.el}
      isHovered={i === hoveredIndex}
      isSelected={i === selectedIndex}
      mode={mode}
    />
  ));
}


// setupPlayerControls função imperativa, chamada no useEffect
//
// Mouse look MANUAL: sem PointerLockControls:
//   - Clique no canvas: solicita pointer lock
//   - mousemove com pointer locked: atualiza yaw/pitch da câmera
//   - Yaw/pitch aplicados diretamente ao quaternion da câmera
//   - Sem acumulação de delta, sem jitter de lock

export function setupPlayerControls({
  camera, renderer, composer, ground, scene, cssLayer,
  screenDefs, onOpen2D, onClose2D, notifyRef, tickWater,
}) {
  // CSS3D Renderer
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;z-index:10;pointer-events:none;";
  cssLayer.appendChild(cssRenderer.domElement);

  renderer.domElement.style.cssText += "position:fixed;inset:0;z-index:0;pointer-events:auto;";
  cssLayer.style.cssText += "position:fixed;inset:0;z-index:10;pointer-events:none;";

  //Montar telas CSS3D
  const screens = screenDefs.map(({ id, title, element, position, rotationY, scale }) => {
    Object.assign(element.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "900px",
      height: "520px",
      borderRadius: "28px",
      overflow: "hidden",
      background: "transparent",
      userSelect: "none",
      pointerEvents: "none",
    });

    const obj = new CSS3DObject(element);
    obj.position.copy(position);
    obj.rotation.y = rotationY ?? 0;
    obj.scale.setScalar(scale ?? 0.01);
    scene.add(obj);

    return { id, title, el: element, obj };
  });

  function notify(patch) { notifyRef.current?.(patch); }
  notify({ screens });

  // Mouse look manual
  // Yaw = rotação horizontal (em torno de Y global)
  // Pitch = rotação vertical (limitada a ±89°)
  let yaw = 0;  // radianos
  let pitch = 0;
  let isLocked = false;

  // Inicializa yaw/pitch a partir da orientação atual da câmera
  // para não dar salto ao ativar o look
  {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yaw = euler.y;
    pitch = euler.x;
  }

  function applyLook() {
    // Aplica yaw e pitch diretamente ao quaternion, ordem YXZ (FPS padrão)
    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    camera.quaternion.multiplyQuaternions(qY, qX);
  }

  applyLook();

  const SENSITIVITY = 0.0018; // rad por pixel, ajuste ao gosto

  const onMouseMove = (e) => {
    if (!isLocked) return;
    yaw -= e.movementX * SENSITIVITY;
    pitch -= e.movementY * SENSITIVITY;
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    applyLook();
  };

  const onPointerLockChange = () => {
    isLocked = document.pointerLockElement === renderer.domElement;
    notify({ isLocked });
    if (!isLocked) keys.clear();
  };

  const requestLock = () => {
    if (!isLocked && !ui2dOpen) renderer.domElement.requestPointerLock();
  };

  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("click", requestLock);
  document.addEventListener("pointerlockchange", onPointerLockChange);

  // Estado
  const keys = new Set();
  let ui2dOpen = false;
  let ui2dForced = false;
  let autoBlocked = false;
  let hoveredIndex = -1;
  let selectedIndex = 0;
  let editMode = false;

  // Abrir / fechar painel 2D 
  function open2DFor(index) {
    if (!screens[index]) return;
    ui2dOpen = true;
    onOpen2D?.(index);
    if (isLocked) document.exitPointerLock();
    renderer.domElement.style.pointerEvents = "none";
  }

  function close2D(manual = true) {
    ui2dOpen = false;
    ui2dForced = false;
    renderer.domElement.style.pointerEvents = "auto";
    onClose2D?.();
    if (manual) autoBlocked = true;
  }

  window.__portfolioClose2D = close2D;

  // Hover
  const HOVER_DIST = 12.0;
  const HOVER_DOT = 0.92;

  function getHoveredIndex() {
    if (ui2dOpen) return -1;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    let best = -1, bestDot = HOVER_DOT;
    screens.forEach((scr, i) => {
      if (camera.position.distanceTo(scr.obj.position) > HOVER_DIST) return;
      const dot = fwd.dot(
        new THREE.Vector3().subVectors(scr.obj.position, camera.position).normalize()
      );
      if (dot > bestDot) { bestDot = dot; best = i; }
    });
    return best;
  }

  function applyHoverVisual(index) {
    screens.forEach((scr, i) => {
      const on = i === index;
      scr.el.style.outline = on ? "2.5px solid rgba(120,210,255,0.90)" : "none";
      scr.el.style.boxShadow = on
        ? "0 0 0 4px rgba(80,190,255,0.18), 0 0 40px rgba(80,190,255,0.22)" : "none";
    });
    hoveredIndex = index;
    notify({ hoveredIndex });
  }

  // Auto-open
  const AUTO_OPEN_DIST = 3.2;
  const LOOK_DOT = 0.55;

  function shouldAutoOpen(scrObj) {
    if (camera.position.distanceTo(scrObj.position) > AUTO_OPEN_DIST) return false;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    return fwd.dot(
      new THREE.Vector3().subVectors(scrObj.position, camera.position).normalize()
    ) > LOOK_DOT;
  }

  function refreshSelection() {
    notify({ selectedIndex, editMode, isLocked });
  }

  // Teclado
  const preventKeys = new Set([
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "PageUp", "PageDown", "Space", "ShiftLeft", "ShiftRight",
  ]);

  // Retorna true se o foco atual está num campo de texto editável.
  // Nesse caso, todos os atalhos de teclado devem ser ignorados para
  // não engolir caracteres digitados pelo usuário.
  function isTypingInField() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  const onKeyDown = (e) => {
    // Se o usuário está digitando num campo de texto, não intercepta nada
    if (isTypingInField()) return;

    if (e.code === "Escape" && !e.repeat && ui2dOpen) {
      e.preventDefault(); close2D(); return;
    }
    if (e.code === "KeyT" && !e.repeat) {
      editMode = !editMode;
      if (editMode && isLocked) document.exitPointerLock();
      refreshSelection(); return;
    }
    if (e.code === "KeyE" && !e.repeat) {
      e.preventDefault();
      if (isLocked) document.exitPointerLock();
      else requestLock();
      return;
    }
    if (e.code === "KeyF" && !e.repeat) {
      e.preventDefault();
      const target = hoveredIndex >= 0 ? hoveredIndex : selectedIndex;
      ui2dForced = !ui2dForced;
      ui2dForced ? open2DFor(target) : close2D(); return;
    }
    if (!e.repeat) {
      if (e.code === "Digit1") selectedIndex = 0;
      if (e.code === "Digit2") selectedIndex = 1;
      if (e.code === "Digit3") selectedIndex = 2;
      if (e.code === "Digit4") selectedIndex = 3;
      if (e.code === "Tab") { e.preventDefault(); selectedIndex = (selectedIndex + 1) % screens.length; }
      refreshSelection();
    }
    if (editMode && preventKeys.has(e.code)) e.preventDefault();
    keys.add(e.code);
  };

  const onKeyUp = (e) => keys.delete(e.code);
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });


  // Loop de animação
  let bobTime = 0;
  let rafId = 0;
  let prevTime = performance.now();

  // Vetores reutilizáveis:  evita alocação por frame
  const _fwd = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);

  const animate = (timestamp) => {
    rafId = requestAnimationFrame(animate);

    const now = timestamp ?? performance.now();
    const delta = Math.min((now - prevTime) / 1000, 0.1);
    prevTime = now;

    tickWater?.(timestamp);

    const selected = screens[selectedIndex]?.obj;

    // Auto-open
    if (!ui2dForced) {
      const nearIdx = screens.findIndex((s) => shouldAutoOpen(s.obj));
      if (autoBlocked) { if (nearIdx < 0) autoBlocked = false; }
      else {
        if (nearIdx >= 0) { if (!ui2dOpen) open2DFor(nearIdx); }
        else { if (ui2dOpen) close2D(false); }
      }
    }

    // Hover
    if (!editMode) {
      const newH = getHoveredIndex();
      if (newH !== hoveredIndex) applyHoverVisual(newH);
    }

    // WASD + Sprint, move na direção que a câmera está apontando (sem componente Y)
    if (!editMode && !ui2dOpen && isLocked) {
      const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const speed = sprint ? 12 : 5;
      const fwdAmt = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
      const strAmt = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);

      if (fwdAmt !== 0 || strAmt !== 0) {
        // Direção forward projetada no plano Y=0
        camera.getWorldDirection(_fwd);
        _fwd.y = 0;
        _fwd.normalize();

        // Direção right perpendicular no plano
        _right.crossVectors(_fwd, _up).normalize();

        camera.position.addScaledVector(_fwd, fwdAmt * speed * delta);
        camera.position.addScaledVector(_right, strAmt * speed * delta);

        // Altura fixa, displacementMap impede raycaster de funcionar corretamente
        camera.position.y = 1.7 + Math.sin(bobTime) * (sprint ? 0.07 : 0.04);
        bobTime += delta * (sprint ? 14 : 8);
      } else {
        bobTime = 0;
      }
    }

    // Modo EDITAR
    if (editMode && selected) {
      const mv = 6 * delta, rot = 1.8 * delta, sc = 0.6 * delta;
      if (keys.has("ArrowLeft")) selected.position.x -= mv;
      if (keys.has("ArrowRight")) selected.position.x += mv;
      if (keys.has("ArrowUp")) selected.position.z -= mv;
      if (keys.has("ArrowDown")) selected.position.z += mv;
      if (keys.has("PageUp")) selected.position.y += mv;
      if (keys.has("PageDown")) selected.position.y -= mv;
      if (keys.has("KeyQ")) selected.rotation.y += rot;
      if (keys.has("KeyE")) selected.rotation.y -= rot;
      if (keys.has("Equal") || keys.has("NumpadAdd"))
        selected.scale.setScalar(selected.scale.x + sc);
      if (keys.has("Minus") || keys.has("NumpadSubtract"))
        selected.scale.setScalar(Math.max(0.001, selected.scale.x - sc));
    }

    composer.render();
    cssRenderer.render(scene, camera);
  };

  animate();

  const onResize = () => cssRenderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", onResize);

  // Cleanup
  return () => {
    cancelAnimationFrame(rafId);
    renderer.domElement.removeEventListener("mousemove", onMouseMove);
    renderer.domElement.removeEventListener("click", requestLock);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("keyup", onKeyUp, { capture: true });
    window.removeEventListener("resize", onResize);
    delete window.__portfolioClose2D;
    if (isLocked) document.exitPointerLock();
    screens.forEach((scr) => scene.remove(scr.obj));
    if (cssRenderer.domElement?.parentNode)
      cssRenderer.domElement.parentNode.removeChild(cssRenderer.domElement);
  };
}




