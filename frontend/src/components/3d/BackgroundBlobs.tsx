import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function AnimatedBlob({ position, color, speed, distort, radius }: any) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = position[1] + Math.sin(t * speed) * 0.5;
    meshRef.current.rotation.x = Math.cos(t * speed * 0.5) * 0.5;
    meshRef.current.rotation.y = Math.sin(t * speed * 0.5) * 0.5;
  });

  return (
    <Sphere ref={meshRef} args={[radius, 64, 64]} position={position}>
      <MeshDistortMaterial
        color={color}
        envMapIntensity={0.5}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={0.1}
        roughness={0.2}
        distort={distort}
        speed={speed * 2}
        transparent={true}
        opacity={0.6}
      />
    </Sphere>
  );
}

export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-60 mix-blend-screen transition-opacity duration-1000">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#8b5cf6" />
        
        {/* Violet Front */}
        <AnimatedBlob radius={2.5} position={[-4, 2, 0]} color="#8b5cf6" speed={0.4} distort={0.4} />
        {/* Blue Back */}
        <AnimatedBlob radius={3.5} position={[5, -1, -2]} color="#4ade80" speed={0.3} distort={0.3} />
        {/* Pink Middle */}
        <AnimatedBlob radius={1.5} position={[1, 3, 1]} color="#f472b6" speed={0.5} distort={0.5} />
      </Canvas>
    </div>
  );
}
