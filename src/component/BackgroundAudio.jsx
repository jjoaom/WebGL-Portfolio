import { useEffect } from "react";
import * as THREE from "three";

export function BackgroundAudio({ src = "/sound/ost.mp3", volume = 0.2, loop = true }) {
  useEffect(() => {
    // Cria listener global
    const listener = new THREE.AudioListener();
    const camera = new THREE.PerspectiveCamera();
    camera.add(listener);

    const ambientSound = new THREE.Audio(listener);

    // Carrega o áudio
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(src, (buffer) => {
      ambientSound.setBuffer(buffer);
      ambientSound.setLoop(loop);
      ambientSound.setVolume(volume);
      ambientSound.play().catch(() => {});
    });

    return () => {
      ambientSound.stop();
    };
  }, [src, volume, loop]);

  return null;
}