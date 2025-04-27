"use client";

import React, { useRef, useEffect } from 'react';

// Node type definition
interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const NODE_COUNT = 60;
const LINE_DISTANCE = 120;
const NODE_RADIUS = 2.5;
const NODE_COLOR = 'rgba(165, 243, 252, 0.95)'; // Tailwind cyan-200
const LINE_COLOR = 'rgba(186, 230, 253, 0.35)'; // Tailwind cyan-100
const GLOW_COLOR = 'rgba(165, 243, 252, 0.45)';
const SPEED = 0.4;

const ConstellationBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<Node[]>([]);
  const sizeRef = useRef({ width: 0, height: 0 });

  // Initialize nodes
  const initNodes = (width: number, height: number) => {
    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
      });
    }
    nodesRef.current = nodes;
  };

  // Resize canvas and re-init nodes
  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    sizeRef.current = { width: canvas.width, height: canvas.height };
    initNodes(canvas.width, canvas.height);
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = sizeRef.current;
    ctx.clearRect(0, 0, width, height);
    const nodes = nodesRef.current;

    // Move nodes
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      // Bounce off edges
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));
    }

    // Draw lines
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINE_DISTANCE) {
          ctx.save();
          ctx.strokeStyle = LINE_COLOR;
          ctx.globalAlpha = 1 - dist / LINE_DISTANCE;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS * 2, 0, 2 * Math.PI);
      ctx.shadowColor = GLOW_COLOR;
      ctx.shadowBlur = 8;
      ctx.fillStyle = NODE_COLOR;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none select-none"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
};

export default ConstellationBackground; 