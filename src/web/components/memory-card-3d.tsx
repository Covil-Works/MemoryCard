'use client';

import React, { useEffect, useRef, useContext } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
import { SettingsContext } from './settings-context';

const brandLogoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIsAAABlCAIAAADyNYdaAAAQAElEQVR4AdzcB5RVRdIHcIZ13Qir7C6ruwqKAcyoiGIEc0bADHrMOeecUcyKEUQUcxYDZlFEMSDmrIgiRlQQI8bvh73nbn993xtmhpdGTvtO3759O9S/q+pf1ULLFr+JP3V1dX/4wx/+/ve///Of//zjH//o8TexrRmb+C0g9Lvf/a5Tp07HH3/8qFGjHnnkkQsvvHD55Zf//e9/P2N/zf+/Zo8QJODRv3//fffdd9FFFwVV3759zzzzzJ49e/7pT39q/gC1aN4IwWDttdc+9dRTN9hgg8y4zT777F27dj3hhBN23HHH1q1bN3eL11wRIve//vWvvXr1Ouuss1ZYYQWoxOoy22yzdezY8fDDDz/ggAPmnHPOli2b6zZtqlkuHTwYARUZMGDAQgstBA87SQpU5p577j333POYY45p166dx6RDc3lsfgiR9X/+85/dd9/9uOOOm2eeeaBVTNZeYXc77bQTi7fIIosgFMV61nJ7M0OIlHGBo4466qCDDvrb3/4Gg/qFq8Of//znTTfdlLattNJKaEX9/WvwbXNCiLNB20466aR+/fr95S9/If1YoL/88sv06dO/+eabn3/+OW7XDaFYc8018b3mSPCaB0KkTBV69Ohx4oknbrjhhnl4fvzxx4kTJ55//vm8ziuvvPLDDz8ALMYJ00MojjzyyK222mqOOeYwYPy2VPVyjNMMECLNoARnn332aqutlrdU4Bk/frwYCDxAAsMzzzyTB2m22WZbcsklBbY777xzq1at+LNyCLTkY9Y6QuBp06bNtttuS/Q8ED+UiAA8Tz/99KGHHjpo0CAmjqG766679ttvvxEjRuRBggpycfDBB/NkKh6T0WrwsaYRAs+888574IEHnnbaaQTqMZHgd999d8899wh6Ah7hLczGjh1Lk4YOHfrVV1+Fxvj3H//4BxZ+8sknL7bYYrUPUu0iRHYo8rHHHiudIzhN4OFmvvzyy+uuu26vvfaCx08//aQlg8HjG2+8gY5LN3z++ecFuUOfPn0QvFVWWYX1yz6swUotIgQMiWq07ZRTTtlyyy05IS2x7Ej8448/piKcyqRJkyhNDE/oCaTJkydfcsklyMWECRM8hvbwa0BTrL766kKljTbayBShvQZ/aw4hskPVMALkeL311iM7LbHgyPrdd9+VwCb6d955x2P8Nq4D8pNPPrn00kvB8OKLL3JL8VvDIngrrrgifoHgSQ5piTvUSL22ECIj8IhdLrroou7du6NtWmJJURfmi+06/fTTP/vss/hVsXowhkccccSYMWOAlGgbE7fUUksBWw4JC29Zexm8GkIIGHz49ttvf95553Xo0MFjInTwjBs37rDDDrviiitwhORtPY/ff//9gw8+6MPhw4erJyCZ6N///jc2iFzMN998HusZqvKvagUhciEmbp97l3bLC+Lbb78lZXJEphsFTxgKMGPHjmXurrzySgQvAUkfGTxxEha+xBJL1JQm1QRCopwFFliAIZJty/sD0vz666/vvPPOvffe+7HHHuN4tJBpY4sPX331VSeAjk6dOpWXikdwRISxHJIOSArrF7+tYr36CHE2Qn3XPDxBnheQI0p2+eWXC3reeusthq5p8AQRA+mDDz6Qm0BD0A2jhfbwCyQEz2UgJ7f++uurawmvqvhbTYTsX7ZNRHLOOeesu+66EqNaYlkQKDkOHDjw6KOPfv/992cFm2xYg3z66acSECjcCy+8gDtkr1QswImhQ7gDfZI+r7rFqxpCZMGqSINiw0AiFy1klBXwvP7662gb9ZoyZQrJZq9mvcIV3XDDDcLhxx9/nIuKB7QMJm7xxRcXjbmFclVYXZCqgxAp8MzbbLMN6RekT+wP2oYXDBs2DEeIJViqOmDuvffeQw455I477pDNS4aFylxzzcW0yjlZocekQ8Ueq4PQv/71L25fRgB/y28VVXvooYf233//u+++Wz3foVQtTByCR5OuuuoqYVN+WMdot912Y2Nl8JyqfIcKtFQaoUDbCMXhLUjbSOq2225jXp588kk0odwiMAWCBwMEj39KbClUpAS33npr14ayD0xxudeTH7+iCNkh2uYeYbvttsOUEtNBWB9//PHgwYPdHYRMWiKv/OpDCzkaef75599ss81cvzrvBtcY3s7017wfffQReyvbbV6P8SfGMTgig+DJQjVq5HicJtcrhJB9SufIVIJHUkdCTEu8aLxAku3cc8910QCnRExxz6RuHBdIEqxXX3010nHxxRdLeEuHs5/JCUg+jB8dBSnwyy67DIULt3/xW1PgmV27dmWW6ZPpGj5yPE7T6pVAyA7ZirXWWgsArqIxpWSt/MGbb77pLWIt+iGvpEOx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';

const VALID_CHARS = [
  'M', 'e', 'm', 'o', 'r', 'y', 'C', 'a', 'r', 'd',
  'C', 'o', 'v', 'i', 'l',
  'M', 'E', 'O', 'R', 'Y', 'C', 'A', 'D', 'V', 'I', 'L'
];

function getPlayColors(): string[] {
  if (typeof window !== 'undefined') {
    const s = getComputedStyle(document.documentElement);
    const green = s.getPropertyValue('--play-green').trim() || '#46b48a';
    const pink = s.getPropertyValue('--play-pink').trim() || '#f69dc8';
    const red = s.getPropertyValue('--play-red').trim() || '#df0024';
    const blue = s.getPropertyValue('--play-blue').trim() || '#2e6db4';
    return [green, pink, red, blue];
  }
  return ['#46b48a', '#f69dc8', '#df0024', '#2e6db4'];
}

interface LetterParticle {
  char: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  size: number;
  age: number;
  maxAge: number;
}

export function MemoryCard3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const isHoveredRef = useRef(false);
  const settings = useContext(SettingsContext);
  const currentTheme = settings?.theme || 'default';
  const themeRef = useRef(currentTheme);
  themeRef.current = currentTheme;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Cena, Câmera e Renderizador com fundo transparente
    const scene = new THREE.Scene();

    const initialWidth = container.clientWidth || 360;
    const initialHeight = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(0, -9, 88);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialWidth, initialHeight);
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.position = 'relative';
    renderer.domElement.style.zIndex = '1';
    container.appendChild(renderer.domElement);

    if (particleCanvasRef.current) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pWidth = initialWidth + 128;
      const pHeight = initialHeight + 128;
      particleCanvasRef.current.width = pWidth * dpr;
      particleCanvasRef.current.height = pHeight * dpr;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Preserva o scroll natural da página
    controls.enablePan = false;

    // 2. Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(30, 80, 50);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7da4d4, 0.7);
    fillLight.position.set(-40, 20, -30);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.3);
    backLight.position.set(0, 20, -60);
    scene.add(backLight);

    const bottomBounce = new THREE.DirectionalLight(0x222225, 0.5);
    bottomBounce.position.set(0, -60, 20);
    scene.add(bottomBounce);

    // 3. Material Plástico Fosco (estilo PS2 Memory Card)
    const plasticMaterial = new THREE.MeshStandardMaterial({
      color: 0x222326,
      roughness: 0.58,
      metalness: 0.08,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide
    });

    // 4. Parâmetros da Carcaça e Costela Inferior
    const w = 42;
    const h = 53;
    const hw = w / 2;
    const hh = h / 2;
    const cr = 2.5;

    const ribBaseY = -19.5;
    const ribStep = 4.0;
    const ribCount = 4;
    const ribTopY = ribBaseY + (ribCount * ribStep);

    const shape = new THREE.Shape();
    shape.moveTo(hw - 1.5, -hh);
    shape.lineTo(hw, -hh + 1.5);
    shape.lineTo(hw, ribBaseY);

    for (let i = 0; i < ribCount; i++) {
      const yBase = ribBaseY + (i * ribStep);
      shape.bezierCurveTo(
        hw - 1.6, yBase + 1.1,
        hw - 1.6, yBase + 2.9,
        hw, yBase + ribStep
      );
    }

    shape.lineTo(hw, hh - cr);
    shape.quadraticCurveTo(hw, hh, hw - cr, hh);
    shape.lineTo(-hw + cr, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
    shape.lineTo(-hw, ribTopY);

    for (let i = ribCount - 1; i >= 0; i--) {
      const yBase = ribBaseY + (i * ribStep);
      shape.bezierCurveTo(
        -hw + 1.6, yBase + 2.9,
        -hw + 1.6, yBase + 1.1,
        -hw, yBase
      );
    }

    shape.lineTo(-hw, -hh + 1.5);
    shape.lineTo(-hw + 1.5, -hh);
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 6.8,
      bevelEnabled: true,
      bevelThickness: 1.0,
      bevelSize: 0.9,
      bevelSegments: 4
    };

    const baseGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    baseGeometry.center();

    // 5. Escultura Booleana (CSG)
    const evaluator = new Evaluator();
    evaluator.useGroups = false;

    let bodyBrush = new Brush(baseGeometry, plasticMaterial);
    bodyBrush.updateMatrixWorld();

    // A. Conectores superiores
    const holeWidth = 8.0;
    const holeDepth = 2.8;
    const holeCutHeight = 7.0;
    const dividerGap = 1.0;
    const topYEdge = hh + (holeCutHeight / 2) - 2.8;

    const cutterGeometry = new THREE.BoxGeometry(holeWidth, holeCutHeight, holeDepth);
    const xOffsets = [-(holeWidth + dividerGap), 0, (holeWidth + dividerGap)];

    for (const x of xOffsets) {
      const cutterBrush = new Brush(cutterGeometry, plasticMaterial);
      cutterBrush.position.set(x, topYEdge, 0);
      cutterBrush.updateMatrixWorld();

      bodyBrush = evaluator.evaluate(bodyBrush, cutterBrush, SUBTRACTION);
      bodyBrush.material = plasticMaterial;
      bodyBrush.updateMatrixWorld();
    }

    // B. Furinhos superiores nas quinas
    const pinHoleRadius = 1.35;
    const pinHoleDepth = 0.5;
    const pinHoleGeom = new THREE.CylinderGeometry(pinHoleRadius, pinHoleRadius, pinHoleDepth, 24);
    pinHoleGeom.rotateX(Math.PI / 2);

    const pinCornerPositions = [
      [-15.5, 21.5],
      [15.5, 21.5]
    ];
    const zFront = 4.4 - (pinHoleDepth / 2) + 0.02;
    const zBack = -4.4 + (pinHoleDepth / 2) - 0.02;

    for (const [px, py] of pinCornerPositions) {
      for (const pz of [zFront, zBack]) {
        const pinBrush = new Brush(pinHoleGeom, plasticMaterial);
        pinBrush.position.set(px, py, pz);
        pinBrush.updateMatrixWorld();
        bodyBrush = evaluator.evaluate(bodyBrush, pinBrush, SUBTRACTION);
        bodyBrush.material = plasticMaterial;
        bodyBrush.updateMatrixWorld();
      }
    }

    // C. Rebaixo frontal
    const labelHeight = 15.2;
    const labelCenterY = (ribTopY + ribBaseY) / 2; // -11.5
    const labelWidth = 37.2;
    const labelRecessDepth = 0.45;
    const labelRadius = 1.2;
    const bodyFrontZ = (extrudeSettings.depth / 2) + extrudeSettings.bevelThickness; // 4.4

    const lhw = labelWidth / 2;
    const lhh = labelHeight / 2;
    const cutOverlap = 0.08;
    const cutOutward = 1.20;
    const cutDepth = labelRecessDepth + cutOutward;
    const cutZ = bodyFrontZ + (cutOutward - labelRecessDepth) / 2;

    function subtractLabelPrimitive(geometry: THREE.BufferGeometry, x: number, y: number) {
      const cutter = new Brush(geometry, plasticMaterial);
      cutter.position.set(x, y, cutZ);
      cutter.updateMatrixWorld();
      bodyBrush = evaluator.evaluate(bodyBrush, cutter, SUBTRACTION);
      bodyBrush.material = plasticMaterial;
      bodyBrush.updateMatrixWorld();
    }

    subtractLabelPrimitive(
      new THREE.BoxGeometry(
        labelWidth - (2 * labelRadius) + (2 * cutOverlap),
        labelHeight,
        cutDepth
      ),
      0,
      labelCenterY
    );

    subtractLabelPrimitive(
      new THREE.BoxGeometry(
        labelWidth,
        labelHeight - (2 * labelRadius) + (2 * cutOverlap),
        cutDepth
      ),
      0,
      labelCenterY
    );

    const cornerCutGeom = new THREE.CylinderGeometry(
      labelRadius + cutOverlap,
      labelRadius + cutOverlap,
      cutDepth,
      32
    );
    cornerCutGeom.rotateX(Math.PI / 2);

    const cornerX = lhw - labelRadius;
    const cornerY = lhh - labelRadius;
    for (const [cx, cy] of [
      [-cornerX, -cornerY],
      [cornerX, -cornerY],
      [cornerX, cornerY],
      [-cornerX, cornerY]
    ]) {
      subtractLabelPrimitive(cornerCutGeom, cx, labelCenterY + cy);
    }

    // Fundo do rebaixo
    const labelShape = new THREE.Shape();
    labelShape.moveTo(-lhw + labelRadius, -lhh);
    labelShape.lineTo(lhw - labelRadius, -lhh);
    labelShape.quadraticCurveTo(lhw, -lhh, lhw, -lhh + labelRadius);
    labelShape.lineTo(lhw, lhh - labelRadius);
    labelShape.quadraticCurveTo(lhw, lhh, lhw - labelRadius, lhh);
    labelShape.lineTo(-lhw + labelRadius, lhh);
    labelShape.quadraticCurveTo(-lhw, lhh, -lhw, lhh - labelRadius);
    labelShape.lineTo(-lhw, -lhh + labelRadius);
    labelShape.quadraticCurveTo(-lhw, -lhh, -lhw + labelRadius, -lhh);
    labelShape.closePath();

    const labelFloorGeom = new THREE.ShapeGeometry(labelShape, 24);
    const labelFloor = new THREE.Mesh(labelFloorGeom, plasticMaterial);
    labelFloor.position.set(0, labelCenterY, bodyFrontZ - labelRecessDepth + 0.012);
    labelFloor.renderOrder = 2;

    // Parede de segurança atrás do rebaixo
    const recessBackstopMaterial = new THREE.MeshStandardMaterial({
      color: 0x222326,
      roughness: 0.58,
      metalness: 0.08,
      side: THREE.DoubleSide
    });
    const recessBackstop = new THREE.Mesh(
      new THREE.PlaneGeometry(labelWidth + 3.0, labelHeight + 3.0),
      recessBackstopMaterial
    );
    recessBackstop.position.set(0, labelCenterY, bodyFrontZ - labelRecessDepth - 0.12);
    recessBackstop.renderOrder = 0;

    // 6. Identidade frontal (logo) em textura de canvas
    const brandCanvas = document.createElement('canvas');
    brandCanvas.width = 1800;
    brandCanvas.height = 1300;
    const brandCtx = brandCanvas.getContext('2d');

    const brandTexture = new THREE.CanvasTexture(brandCanvas);
    brandTexture.colorSpace = THREE.SRGBColorSpace;
    brandTexture.minFilter = THREE.LinearFilter;
    brandTexture.magFilter = THREE.LinearFilter;

    const brandMaterial = new THREE.MeshBasicMaterial({
      map: brandTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide
    });

    const brandPlane = new THREE.Mesh(new THREE.PlaneGeometry(33.2, 25.0), brandMaterial);
    brandPlane.position.set(0, 8.0, bodyFrontZ + 0.15);
    brandPlane.renderOrder = 10;

    // Renderiza a logo no canvas
    const logoImage = new Image();
    const renderLogo = () => {
      if (!brandCtx) return;
      brandCtx.clearRect(0, 0, brandCanvas.width, brandCanvas.height);

      const logoMaskCanvas = document.createElement('canvas');
      const origW = logoImage.naturalWidth || logoImage.width || 139;
      const origH = logoImage.naturalHeight || logoImage.height || 101;
      logoMaskCanvas.width = origW;
      logoMaskCanvas.height = origH;
      const logoMaskCtx = logoMaskCanvas.getContext('2d');
      if (!logoMaskCtx) return;

      logoMaskCtx.drawImage(logoImage, 0, 0, origW, origH);
      const logoImageData = logoMaskCtx.getImageData(0, 0, origW, origH);
      const logoPixels = logoImageData.data;

      for (let i = 0; i < logoPixels.length; i += 4) {
        const alphaFromBrightness = Math.max(logoPixels[i], logoPixels[i + 1], logoPixels[i + 2]);
        logoPixels[i] = 255;
        logoPixels[i + 1] = 255;
        logoPixels[i + 2] = 255;
        logoPixels[i + 3] = alphaFromBrightness;
      }

      logoMaskCtx.clearRect(0, 0, origW, origH);
      logoMaskCtx.putImageData(logoImageData, 0, 0);

      const logoMaxWidth = 2016;
      const logoMaxHeight = 1080;
      const logoScale = Math.min(logoMaxWidth / origW, logoMaxHeight / origH);
      const drawLogoWidth = origW * logoScale;
      const drawLogoHeight = origH * logoScale;
      const logoX = (brandCanvas.width - drawLogoWidth) / 2;
      const logoY = 20;
      brandCtx.drawImage(logoMaskCanvas, logoX, logoY, drawLogoWidth, drawLogoHeight);

      brandTexture.needsUpdate = true;
    };

    logoImage.onload = renderLogo;
    logoImage.src = brandLogoDataUrl;
    if (logoImage.complete) {
      renderLogo();
    }

    // 7. Agrupamento para rotação unificada
    const cardGroup = new THREE.Group();
    cardGroup.add(recessBackstop);
    cardGroup.add(bodyBrush);
    cardGroup.add(labelFloor);
    cardGroup.add(brandPlane);

    cardGroup.scale.set(0.95, 0.95, 0.95);
    cardGroup.position.set(0, -1.5, 0);

    scene.add(cardGroup);

    // 8. Raycaster para detecção precisa do mouse sobre o objeto
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(cardGroup.children, true);
      const isHit = intersects.length > 0;
      isHoveredRef.current = isHit;
      renderer.domElement.style.cursor = isHit ? 'grab' : 'default';
    };

    const onPointerLeave = () => {
      isHoveredRef.current = false;
      renderer.domElement.style.cursor = 'default';
    };

    // Física de pressionamento, tremida e partículas exclusivas do tema 'play'
    const BASE_SCALE = 0.95;
    const COMPRESSED_SCALE = BASE_SCALE * 0.86; // ~0.817 (diminui levemente ao pressionar)
    const OVERSHOOT_SCALE = BASE_SCALE * 1.10;  // ~1.045 (aumenta um pouco além do normal ao soltar)
    const BASE_POS_Y = -1.5;
    const SHAKE_START_DELAY = 220; // ms antes de iniciar a tremida acumulativa

    let isCardPressed = false;
    let pressStartTime = 0;
    let cardState: 'IDLE' | 'PRESSING' | 'RELEASING' = 'IDLE';
    let currentCardScale = BASE_SCALE;
    let pressStartScale = BASE_SCALE;
    let releaseStartTime = 0;
    let releaseStartScale = BASE_SCALE;

    let activeParticles: LetterParticle[] = [];
    let lastParticleTime = 0;

    function spawnLetterParticles(holdDuration: number) {
      const pCanvas = particleCanvasRef.current;
      if (!pCanvas) return;

      const colors = getPlayColors();
      let count = 14; // clique rápido padrão
      let speedMult = 1.0;

      if (holdDuration >= SHAKE_START_DELAY) {
        // Quanto mais tempo o usuário segurar, maior a quantidade e intensidade (até 48 letras)
        const p = Math.min(1.0, (holdDuration - SHAKE_START_DELAY) / 1580);
        count = Math.round(14 + p * 34);
        speedMult = 1.0 + p * 0.45;
      }

      const rect = pCanvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      for (let i = 0; i < count; i++) {
        const baseAngle = (i / count) * Math.PI * 2;
        const angle = baseAngle + (Math.random() - 0.5) * 0.42;

        // Surgem de trás do Memory Card (contorno elíptico)
        const rx = 64 + Math.random() * 16;
        const ry = 80 + Math.random() * 20;
        const startX = centerX + Math.cos(angle) * rx;
        const startY = centerY + Math.sin(angle) * ry;

        const speed = (2.6 + Math.random() * 3.4) * speedMult;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        activeParticles.push({
          char: VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          x: startX,
          y: startY,
          vx,
          vy,
          rotation: (Math.random() - 0.5) * 0.7,
          vRot: (Math.random() - 0.5) * 0.08,
          size: 18 + Math.floor(Math.random() * 8),
          age: 0,
          maxAge: 650 + Math.random() * 320,
        });
      }
    }

    function updateLetterParticles(now: number) {
      const pCanvas = particleCanvasRef.current;
      if (!pCanvas) return;
      const pCtx = pCanvas.getContext('2d');
      if (!pCtx) return;

      if (activeParticles.length === 0) {
        lastParticleTime = now;
        return;
      }

      const dt = lastParticleTime ? Math.min(50, now - lastParticleTime) : 16.6;
      lastParticleTime = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      pCtx.save();
      pCtx.scale(dpr, dpr);

      const nextList: LetterParticle[] = [];

      for (const p of activeParticles) {
        p.age += dt;
        if (p.age >= p.maxAge) continue;

        // Desaceleração suave por atrito para percorrer pequena distância
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx * (dt / 16.6);
        p.y += p.vy * (dt / 16.6);
        p.rotation += p.vRot * (dt / 16.6);
        p.vRot *= 0.96;

        // Desaparece gradualmente com fade out
        const progress = p.age / p.maxAge;
        const alpha = progress < 0.2
          ? 1.0
          : Math.max(0, 1.0 - (progress - 0.2) / 0.8);
        const easeAlpha = alpha * alpha;

        pCtx.save();
        pCtx.translate(p.x, p.y);
        pCtx.rotate(p.rotation);
        pCtx.globalAlpha = easeAlpha;
        pCtx.fillStyle = p.color;
        pCtx.font = `bold ${p.size}px 'MinimalHard', monospace`;
        pCtx.textAlign = 'center';
        pCtx.textBaseline = 'middle';
        pCtx.fillText(p.char, 0, 0);
        pCtx.restore();

        nextList.push(p);
      }

      pCtx.restore();
      activeParticles = nextList;

      if (activeParticles.length === 0) {
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      }
    }

    const onPointerDown = () => {
      if (isHoveredRef.current) {
        renderer.domElement.style.cursor = 'grabbing';
        if (themeRef.current === 'play') {
          isCardPressed = true;
          pressStartTime = performance.now();
          pressStartScale = currentCardScale;
          cardState = 'PRESSING';
          controls.enabled = false;
        }
      }
    };

    const onPointerUp = () => {
      renderer.domElement.style.cursor = isHoveredRef.current ? 'grab' : 'default';

      if (themeRef.current === 'play' && isCardPressed) {
        isCardPressed = false;
        controls.enabled = true;

        // Tremida para imediatamente ao soltar
        cardGroup.position.set(0, BASE_POS_Y, 0);
        cardGroup.rotation.z = 0;

        const holdDuration = performance.now() - pressStartTime;
        cardState = 'RELEASING';
        releaseStartTime = performance.now();
        releaseStartScale = currentCardScale;

        // Dispara liberação de partículas/letras de trás do card
        spawnLetterParticles(holdDuration);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // 9. Post-processing Composer para o sticker outline ~4px no tema 'play' (nativamente na GPU a 60fps)
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const renderTarget = new THREE.WebGLRenderTarget(
      initialWidth * pixelRatio,
      initialHeight * pixelRatio,
      {
        type: THREE.HalfFloatType,
        samples: 4
      }
    );
    const composer = new EffectComposer(renderer, renderTarget);
    const renderPass = new RenderPass(scene, camera);
    renderPass.clearAlpha = 0;
    composer.addPass(renderPass);

    const stickerShader = {
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(initialWidth, initialHeight) },
        outlineWidth: { value: 4.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float outlineWidth;
        varying vec2 vUv;

        void main() {
          vec4 center = texture2D(tDiffuse, vUv);

          // Se o pixel pertence ao corpo do modelo 3D (opaco), renderiza diretamente
          if (center.a > 0.95) {
            gl_FragColor = center;
            return;
          }

          vec2 step = 1.0 / resolution;
          float maxFoundAlpha = 0.0;

          // Anel externo: 16 direções radiais a raio = outlineWidth (~4px)
          for (int i = 0; i < 16; i++) {
            float angle = float(i) * 0.39269908169872414;
            vec2 offset = vec2(cos(angle), sin(angle)) * (outlineWidth * step);
            vec2 coord = vUv + offset;
            if (coord.x >= 0.0 && coord.x <= 1.0 && coord.y >= 0.0 && coord.y <= 1.0) {
              if (texture2D(tDiffuse, coord).a > 0.2) {
                maxFoundAlpha = 1.0;
                break;
              }
            }
          }

          // Anel intermediário (raio ~ 2.68px) para garantir cobertura contínua em quinas
          if (maxFoundAlpha < 0.5) {
            for (int i = 0; i < 8; i++) {
              float angle = float(i) * 0.7853981633974483;
              vec2 offset = vec2(cos(angle), sin(angle)) * (outlineWidth * 0.67 * step);
              vec2 coord = vUv + offset;
              if (coord.x >= 0.0 && coord.x <= 1.0 && coord.y >= 0.0 && coord.y <= 1.0) {
                if (texture2D(tDiffuse, coord).a > 0.2) {
                  maxFoundAlpha = 1.0;
                  break;
                }
              }
            }
          }

          // Anel interno (raio ~ 1.33px)
          if (maxFoundAlpha < 0.5) {
            for (int i = 0; i < 8; i++) {
              float angle = float(i) * 0.7853981633974483 + 0.39269908169872414;
              vec2 offset = vec2(cos(angle), sin(angle)) * (outlineWidth * 0.33 * step);
              vec2 coord = vUv + offset;
              if (coord.x >= 0.0 && coord.x <= 1.0 && coord.y >= 0.0 && coord.y <= 1.0) {
                if (texture2D(tDiffuse, coord).a > 0.2) {
                  maxFoundAlpha = 1.0;
                  break;
                }
              }
            }
          }

          if (maxFoundAlpha > 0.5) {
            // Suaviza a transição entre o modelo e a borda branca adesiva
            if (center.a > 0.01) {
              gl_FragColor = vec4(mix(vec3(1.0), center.rgb, center.a), 1.0);
            } else {
              gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
            }
          } else {
            // Fora da silhueta do adesivo: transparente
            gl_FragColor = center;
          }
        }
      `
    };

    const stickerPass = new ShaderPass(stickerShader);
    composer.addPass(stickerPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 10. Loop de animação com aceleração apenas quando o mouse toca o objeto
    let currentSpeed = 0.007;
    let animId = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const targetSpeed = isHoveredRef.current ? 0.038 : 0.007;
      currentSpeed += (targetSpeed - currentSpeed) * 0.08;
      cardGroup.rotation.y += currentSpeed;

      const now = performance.now();

      if (themeRef.current === 'play') {
        if (cardState === 'PRESSING') {
          const elapsed = now - pressStartTime;
          // Primeiro movimento é sempre diminuir de tamanho (compressão suave ~110ms)
          const compressT = Math.min(1.0, elapsed / 110);
          const easeCompress = 1 - Math.pow(1 - compressT, 3);
          currentCardScale = pressStartScale + (COMPRESSED_SCALE - pressStartScale) * easeCompress;

          // Tremida (shake): inicia apenas após pequeno tempo pressionado (> 220ms) e acumula energia
          if (elapsed > SHAKE_START_DELAY) {
            const shakeProgress = Math.min(1.0, (elapsed - SHAKE_START_DELAY) / 1200);
            const shakeAmp = 0.22 + shakeProgress * 0.45;
            cardGroup.position.x = (Math.random() - 0.5) * 2 * shakeAmp;
            cardGroup.position.y = BASE_POS_Y + (Math.random() - 0.5) * 2 * shakeAmp;
            cardGroup.position.z = (Math.random() - 0.5) * (shakeAmp * 0.6);
            cardGroup.rotation.z = (Math.random() - 0.5) * (0.012 + shakeProgress * 0.016);
          } else {
            cardGroup.position.set(0, BASE_POS_Y, 0);
            cardGroup.rotation.z = 0;
          }
        } else if (cardState === 'RELEASING') {
          const elapsed = now - releaseStartTime;
          const OVERSHOOT_TIME = 110; // aumento rápido além do normal
          const SETTLE_TIME = 400;    // retorno suave ao tamanho normal

          if (elapsed <= OVERSHOOT_TIME) {
            const t = elapsed / OVERSHOOT_TIME;
            const easeUp = Math.sin((t * Math.PI) / 2);
            currentCardScale = releaseStartScale + (OVERSHOOT_SCALE - releaseStartScale) * easeUp;
          } else if (elapsed <= SETTLE_TIME) {
            const t = (elapsed - OVERSHOOT_TIME) / (SETTLE_TIME - OVERSHOOT_TIME);
            const easeDown = 1 - Math.pow(1 - t, 3);
            currentCardScale = OVERSHOOT_SCALE + (BASE_SCALE - OVERSHOOT_SCALE) * easeDown;
          } else {
            currentCardScale = BASE_SCALE;
            cardState = 'IDLE';
          }

          cardGroup.position.set(0, BASE_POS_Y, 0);
          cardGroup.rotation.z = 0;
        } else {
          currentCardScale = BASE_SCALE;
          cardGroup.position.set(0, BASE_POS_Y, 0);
          cardGroup.rotation.z = 0;
        }

        cardGroup.scale.set(currentCardScale, currentCardScale, currentCardScale);
        updateLetterParticles(now);
      } else {
        // Tema Default: totalmente intocado
        if (cardGroup.scale.x !== BASE_SCALE) {
          cardGroup.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);
        }
        if (cardGroup.position.x !== 0 || cardGroup.position.y !== BASE_POS_Y || cardGroup.position.z !== 0) {
          cardGroup.position.set(0, BASE_POS_Y, 0);
          cardGroup.rotation.z = 0;
        }
      }

      controls.update();
      if (themeRef.current === 'play') {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    }
    animate();

    // 11. Redimensionamento responsivo
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.setSize(width, height);
        stickerPass.uniforms.resolution.value.set(width, height);

        if (particleCanvasRef.current) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const pWidth = width + 128;
          const pHeight = height + 128;
          particleCanvasRef.current.width = pWidth * dpr;
          particleCanvasRef.current.height = pHeight * dpr;
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      controls.dispose();
      outputPass.dispose();
      stickerPass.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full flex items-center justify-center relative select-none memorycard-3d-sticker overflow-visible"
      title="Passe o mouse sobre o objeto para acelerar a rotação ou arraste para inspecionar em 3D"
    >
      <canvas
        ref={particleCanvasRef}
        className="absolute -inset-16 w-[calc(100%+128px)] h-[calc(100%+128px)] pointer-events-none z-0 overflow-visible"
      />
    </div>
  );
}

export default MemoryCard3D;
