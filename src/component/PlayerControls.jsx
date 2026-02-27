import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";

// Função voltada para controle do player

export function setupPlayerControls(camera, renderer, composer, ground) {
  const controls = new PointerLockControls(camera, renderer.domElement);

  renderer.domElement.addEventListener("click", () => {
    if (!controls.isLocked) controls.lock();
  });

  let moving = false;
  renderer.domElement.addEventListener("mousedown", () => (moving = true));
  renderer.domElement.addEventListener("mouseup", () => (moving = false));

  const raycaster = new THREE.Raycaster();
  let bobTime = 0;

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (moving) {
      const speed = 5;
      controls.moveForward(speed * delta);

      // Altura sobre o chão
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

    composer.render();
  }

  animate();
  return controls;
}