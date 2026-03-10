import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Mantem um container DOM estavel sob controle do React.
 * O Three.js recebe esse mesmo container via CSS3DObject e apenas o posiciona.
 */
export default function ScreenPortal({ id, onMount, children }) {
  const containerRef = useRef(null);
  if (!containerRef.current) {
    const el = document.createElement("div");
    el.id = `screen-portal-${id}`;
    el.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 900px;
      height: 520px;
      border-radius: 28px;
      overflow: hidden;
      background: transparent;
      user-select: none;
      pointer-events: none;
    `;
    containerRef.current = el;
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    if (!container.isConnected) {
      document.body.appendChild(container);
    }

    onMount?.(id, container);

    return () => {
      onMount?.(id, null);
      if (container.isConnected) {
        container.remove();
      }
    };
  }, [id, onMount]);

  return createPortal(children, containerRef.current);
}