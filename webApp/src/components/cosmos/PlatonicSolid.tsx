"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type SolidType = "tetrahedron" | "cube" | "octahedron" | "dodecahedron" | "icosahedron";

interface Props {
  solid: SolidType;
  size?: number;
}

function buildGeometry(solid: SolidType, size: number): THREE.BufferGeometry {
  switch (solid) {
    case "tetrahedron":  return new THREE.TetrahedronGeometry(size);
    case "cube":         return new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
    case "octahedron":   return new THREE.OctahedronGeometry(size);
    case "dodecahedron": return new THREE.DodecahedronGeometry(size);
    case "icosahedron":  return new THREE.IcosahedronGeometry(size);
  }
}

const SPEEDS: Record<SolidType, { x: number; y: number; ix: number; iy: number }> = {
  tetrahedron:  { x: 0.18, y: 0.24, ix:  0.10, iy: -0.18 },
  cube:         { x: 0.10, y: 0.14, ix:  0.07, iy: -0.10 },
  octahedron:   { x: 0.15, y: 0.20, ix:  0.09, iy: -0.15 },
  dodecahedron: { x: 0.12, y: 0.18, ix:  0.08, iy: -0.14 },
  icosahedron:  { x: 0.09, y: 0.16, ix:  0.06, iy: -0.12 },
};

export default function PlatonicSolid({ solid, size = 1.3 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Scene ─────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 4;

    // Pass the existing canvas element — no DOM append/remove needed
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ── Geometry ──────────────────────────────────────────────────────
    const geo      = buildGeometry(solid, size);
    const innerGeo = buildGeometry(solid, size * 0.55);

    const wireGeo = new THREE.WireframeGeometry(geo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.55 });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    scene.add(wireframe);

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xc4b5fd, transparent: true, opacity: 0.04,
      side: THREE.FrontSide, depthWrite: false,
    });
    scene.add(new THREE.Mesh(geo, fillMat));

    const innerWireGeo = new THREE.WireframeGeometry(innerGeo);
    const innerMat = new THREE.LineBasicMaterial({ color: 0xf5d76e, transparent: true, opacity: 0.28 });
    const innerWire = new THREE.LineSegments(innerWireGeo, innerMat);
    scene.add(innerWire);

    const sp    = SPEEDS[solid];
    const clock = new THREE.Clock();
    let animId: number;

    // ── Resize — reads CSS dimensions, updates pixel buffer ───────────
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      // false = don't touch canvas style, only update pixel buffer
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // ── Animation loop ────────────────────────────────────────────────
    function animate() {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      wireframe.rotation.x = t * sp.x;
      wireframe.rotation.y = t * sp.y;
      innerWire.rotation.x = t * sp.ix;
      innerWire.rotation.y = t * sp.iy;
      wireMat.opacity = 0.42 + Math.sin(t * 0.65) * 0.15;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animId);
      renderer.dispose();
      geo.dispose(); wireGeo.dispose(); wireMat.dispose(); fillMat.dispose();
      innerGeo.dispose(); innerWireGeo.dispose(); innerMat.dispose();
    };
  }, [solid, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}
