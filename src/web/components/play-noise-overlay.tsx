'use client';

import React, { useEffect, useRef } from 'react';
import { useSettings } from './settings-context';

const TILE_SIZE = 256;
const FRAME_COUNT = 10;
const FPS = 22;
const FRAME_INTERVAL = 1000 / FPS;

/**
 * Cria um padrão de ruído granulado procedural simulando filme fotográfico / analógico clássico
 * (pontos prateados e sombras da emulsão com distribuição microscópica e orgânica).
 * Sem listras, sem scanlines, sem barras VHS ou distorções de TV antiga.
 */
function createNoisePattern(ctx: CanvasRenderingContext2D, size: number): CanvasPattern | null {
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return null;

  const imgData = offCtx.createImageData(size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = Math.random();
    if (r < 0.28) {
      // Grão claro (pontos prateados / haletos iluminados de foto antiga)
      const isClump = Math.random() < 0.04;
      const val = Math.floor(215 + Math.random() * 40);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = isClump
        ? Math.floor(70 + Math.random() * 45) // pontos com leve saliência física
        : Math.floor(30 + Math.random() * 55); // pontos finos e sutis
    } else if (r < 0.56) {
      // Grão escuro (textura de densidade da emulsão)
      const isClump = Math.random() < 0.04;
      const val = Math.floor(Math.random() * 40);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = isClump
        ? Math.floor(70 + Math.random() * 45)
        : Math.floor(30 + Math.random() * 55);
    } else {
      // Ponto transparente (preserva 100% da nitidez de textos e contrastes)
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  offCtx.putImageData(imgData, 0, 0);
  return ctx.createPattern(offscreen, 'repeat');
}

export function PlayNoiseOverlay() {
  const { theme } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Efeito de ruído/granulado ativo exclusivamente no tema play
    if (theme !== 'play') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resizeCanvas();

    // Pré-gera os quadros de padrões com distribuições de pontos independentes
    const patterns: CanvasPattern[] = [];
    for (let f = 0; f < FRAME_COUNT; f++) {
      const pattern = createNoisePattern(ctx, TILE_SIZE);
      if (pattern) patterns.push(pattern);
    }
    if (patterns.length === 0) return;

    let animId: number | null = null;
    let lastTime = performance.now();
    let frameIdx = 0;

    // Respeita acessibilidade para usuários com preferência de movimento reduzido
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = patterns[0];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      const elapsed = now - lastTime;
      if (elapsed < FRAME_INTERVAL) return;
      lastTime = now - (elapsed % FRAME_INTERVAL);

      // Alterna sequencialmente entre os padrões para que os pontos mudem de posição
      frameIdx = (frameIdx + 1) % patterns.length;

      // Deslocamento espacial aleatório para eliminar qualquer repetição de grade
      const offsetX = Math.floor(Math.random() * TILE_SIZE);
      const offsetY = Math.floor(Math.random() * TILE_SIZE);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.fillStyle = patterns[frameIdx];
      // Preenche a tela toda garantindo cobertura total sobre o deslocamento
      ctx.fillRect(-offsetX, -offsetY, canvas.width + TILE_SIZE, canvas.height + TILE_SIZE);
      ctx.restore();
    };

    animId = requestAnimationFrame(render);

    const handleResize = () => {
      resizeCanvas();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else {
        lastTime = performance.now();
        if (!animId) {
          animId = requestAnimationFrame(render);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme]);

  // Se o tema não for play, nenhum elemento existe no DOM
  if (theme !== 'play') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[99999] w-full h-full select-none"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
}
