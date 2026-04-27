import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Zone-specific landmarks that give each area of the plaza a distinct identity.
 * Placed at the same coordinates used by PlayerController's ZONE_MAP:
 *   study  (-18, -15)   social (18, -15)
 *   dating (-18,  18)   cafe   (18,  18)
 *
 * Each landmark is rotated to "face" the plaza centre (0,0) so players
 * approaching from the middle see the front of it.
 */

interface PosProps {
  position: [number, number, number];
}

// ─────────────────────────────────────────────────────────────
// STUDY ZONE — Wooden pergola with a study table, stack of books
// ─────────────────────────────────────────────────────────────
function StudyPergola() {
  // Post positions — wider, rectangular pergola
  const posts: Array<[number, number]> = [[-3, -2], [0, -2], [3, -2], [-3, 2], [0, 2], [3, 2]];

  return (
    <group>
      {/* 6 corner/mid posts — thicker, warmer wood */}
      {posts.map(([x, z], i) => (
        <group key={`post-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[0.28, 3, 0.28]} />
            <meshStandardMaterial color="#8B6F47" roughness={0.85} />
          </mesh>
          {/* Base stone footing */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[0.42, 0.3, 0.42]} />
            <meshStandardMaterial color="#B0A390" roughness={0.95} />
          </mesh>
          {/* Top cap */}
          <mesh position={[0, 3.05, 0]}>
            <boxGeometry args={[0.36, 0.1, 0.36]} />
            <meshStandardMaterial color="#6B5335" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Long side beams */}
      <mesh position={[0, 3.15, -2]} castShadow>
        <boxGeometry args={[6.6, 0.16, 0.2]} />
        <meshStandardMaterial color="#6B5335" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.15, 2]} castShadow>
        <boxGeometry args={[6.6, 0.16, 0.2]} />
        <meshStandardMaterial color="#6B5335" roughness={0.85} />
      </mesh>
      {/* Cross-beams (front-to-back) */}
      {[-2.7, 0, 2.7].map((x, i) => (
        <mesh key={`cb-${i}`} position={[x, 3.15, 0]} castShadow>
          <boxGeometry args={[0.16, 0.16, 4.2]} />
          <meshStandardMaterial color="#6B5335" roughness={0.85} />
        </mesh>
      ))}

      {/* Roof slats — denser, alternating light/dark wood */}
      {Array.from({ length: 13 }).map((_, i) => {
        const z = -2 + i * (4 / 12);
        const col = i % 2 === 0 ? '#A67B4E' : '#8B6538';
        return (
          <mesh key={`slat-${i}`} position={[0, 3.3, z]} castShadow>
            <boxGeometry args={[6.4, 0.08, 0.18]} />
            <meshStandardMaterial color={col} roughness={0.85} />
          </mesh>
        );
      })}

      {/* Flowering vines draped over top — instanced spheres */}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = -3 + (i / 17) * 6;
        const y = 3.1 + Math.sin(i * 1.3) * 0.05;
        const z = -2 + (i % 2 === 0 ? -0.15 : 0.15);
        const flowerColor = i % 3 === 0 ? '#F8BBD0' : i % 3 === 1 ? '#E1BEE7' : '#FFFFFF';
        return (
          <group key={`vine-${i}`} position={[x, y, z]}>
            {/* Green leaves */}
            <mesh>
              <sphereGeometry args={[0.18, 8, 6]} />
              <meshStandardMaterial color="#558B2F" roughness={0.8} />
            </mesh>
            {/* Flower cluster */}
            {i % 2 === 0 && (
              <mesh position={[0, -0.12, 0]}>
                <sphereGeometry args={[0.09, 8, 6]} />
                <meshStandardMaterial color={flowerColor} roughness={0.7} emissive={flowerColor} emissiveIntensity={0.08} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ── TWO STUDY DESKS ── */}
      {[-1.5, 1.5].map((desknX, di) => (
        <group key={`desk-${di}`} position={[desknX, 0, 0]}>
          {/* Desktop */}
          <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.1, 1.2]} />
            <meshStandardMaterial color="#D4AF7F" roughness={0.75} />
          </mesh>
          {/* Desk trim (edge) */}
          <mesh position={[0, 0.78, 0]}>
            <boxGeometry args={[2.02, 0.02, 1.22]} />
            <meshStandardMaterial color="#8B6538" roughness={0.8} />
          </mesh>
          {/* Desk legs */}
          {[[-0.9, 0.5], [0.9, 0.5], [-0.9, -0.5], [0.9, -0.5]].map(([lx, lz], li) => (
            <mesh key={`leg-${li}`} position={[lx, 0.36, lz]} castShadow>
              <boxGeometry args={[0.1, 0.72, 0.1]} />
              <meshStandardMaterial color="#6B4E2A" roughness={0.85} />
            </mesh>
          ))}

          {/* Stack of books — varied colors */}
          <group position={[-0.65, 0.78, 0.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.52, 0.1, 0.38]} />
              <meshStandardMaterial color="#C62828" roughness={0.6} />
            </mesh>
            <mesh position={[0.01, 0.1, 0]} castShadow>
              <boxGeometry args={[0.5, 0.09, 0.36]} />
              <meshStandardMaterial color="#1565C0" roughness={0.6} />
            </mesh>
            <mesh position={[-0.02, 0.19, 0.01]} castShadow>
              <boxGeometry args={[0.48, 0.09, 0.34]} />
              <meshStandardMaterial color="#F9A825" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.27, 0]} castShadow>
              <boxGeometry args={[0.46, 0.08, 0.32]} />
              <meshStandardMaterial color="#2E7D32" roughness={0.6} />
            </mesh>
          </group>

          {/* Open book with pages */}
          <group position={[0.4, 0.8, -0.1]} rotation={[-0.12, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.03, 0.5]} />
              <meshStandardMaterial color="#FAFAFA" roughness={0.5} />
            </mesh>
            {/* Page spine */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.02, 0.04, 0.5]} />
              <meshStandardMaterial color="#7A6146" roughness={0.7} />
            </mesh>
          </group>

          {/* Laptop (closed, on one desk only) */}
          {di === 0 && (
            <group position={[0.3, 0.78, 0.3]} rotation={[0, 0.3, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.55, 0.04, 0.4]} />
                <meshStandardMaterial color="#37474F" roughness={0.5} metalness={0.3} />
              </mesh>
              {/* Apple-style logo dot */}
              <mesh position={[0, 0.025, 0]}>
                <circleGeometry args={[0.05, 16]} />
                <meshStandardMaterial color="#B0BEC5" metalness={0.6} roughness={0.3} />
              </mesh>
            </group>
          )}

          {/* Chair with backrest */}
          <group position={[0, 0, -1.15]}>
            {/* Seat */}
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[0.55, 0.08, 0.5]} />
              <meshStandardMaterial color="#F5DEB3" roughness={0.7} />
            </mesh>
            {/* Backrest */}
            <mesh position={[0, 0.78, -0.22]} castShadow>
              <boxGeometry args={[0.55, 0.7, 0.06]} />
              <meshStandardMaterial color="#F5DEB3" roughness={0.7} />
            </mesh>
            {/* Chair legs */}
            {[[-0.22, 0.22], [0.22, 0.22], [-0.22, -0.22], [0.22, -0.22]].map(([lx, lz], li) => (
              <mesh key={`cl-${li}`} position={[lx, 0.21, lz]} castShadow>
                <boxGeometry args={[0.06, 0.42, 0.06]} />
                <meshStandardMaterial color="#6B4E2A" roughness={0.85} />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* Stone planters at the front corners */}
      {[[-3.2, -2.2], [3.2, -2.2]].map(([px, pz], i) => (
        <group key={`planter-${i}`} position={[px, 0, pz]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.6]} />
            <meshStandardMaterial color="#A89780" roughness={0.95} />
          </mesh>
          {/* Shrub on top */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <sphereGeometry args={[0.32, 10, 8]} />
            <meshStandardMaterial color="#558B2F" roughness={0.85} />
          </mesh>
          {/* Small flower highlights */}
          {[[-0.15, 0.7, 0.05], [0.12, 0.72, -0.1], [0, 0.78, 0.15]].map(([fx, fy, fz], fi) => (
            <mesh key={`fl-${fi}`} position={[fx, fy, fz]}>
              <sphereGeometry args={[0.06, 6, 6]} />
              <meshStandardMaterial color="#FFB74D" roughness={0.6} emissive="#FFB74D" emissiveIntensity={0.15} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// SOCIAL ZONE — Stage with metal truss, spotlights, speakers, curtain
// ─────────────────────────────────────────────────────────────
function SocialStage() {
  const bulbsRef = useRef<THREE.Group>(null);
  const spotlightsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (bulbsRef.current) {
      bulbsRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const pulse = 0.7 + Math.sin(t * 3 + i) * 0.3;
        mat.emissiveIntensity = pulse;
      });
    }
    if (spotlightsRef.current) {
      // Sweep spotlights subtly
      spotlightsRef.current.children.forEach((child, i) => {
        child.rotation.z = Math.sin(t * 0.8 + i * 0.5) * 0.15;
      });
    }
  });

  const bulbColors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#E040FB', '#FF9800', '#00E5FF', '#FFEB3B'];
  const stageWidth = 5.5;
  const stageDepth = 3.5;

  return (
    <group>
      {/* ── STAGE PLATFORM ── */}
      {/* Pink side skirt */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[stageWidth, 0.8, stageDepth]} />
        <meshStandardMaterial color="#E91E63" roughness={0.75} />
      </mesh>
      {/* Stage top — lighter pink */}
      <mesh position={[0, 0.82, 0]} receiveShadow>
        <boxGeometry args={[stageWidth + 0.1, 0.08, stageDepth + 0.1]} />
        <meshStandardMaterial color="#F8BBD0" roughness={0.6} />
      </mesh>
      {/* Darker pink back strip */}
      <mesh position={[0, 0.5, -stageDepth / 2 - 0.05]}>
        <boxGeometry args={[stageWidth, 0.2, 0.08]} />
        <meshStandardMaterial color="#AD1457" roughness={0.7} />
      </mesh>

      {/* ── STAGE STEPS at the front ── */}
      {Array.from({ length: 2 }).map((_, i) => (
        <mesh
          key={`step-${i}`}
          position={[0, 0.15 + i * 0.2, stageDepth / 2 + 0.4 - i * 0.2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.4, 0.18, 0.45 - i * 0.15]} />
          <meshStandardMaterial color="#F48FB1" roughness={0.75} />
        </mesh>
      ))}

      {/* ── METAL TRUSS FRAME ── */}
      {/* 4 vertical corner posts */}
      {[[-stageWidth / 2 + 0.2, stageDepth / 2 - 0.1], [stageWidth / 2 - 0.2, stageDepth / 2 - 0.1], [-stageWidth / 2 + 0.2, -stageDepth / 2 + 0.1], [stageWidth / 2 - 0.2, -stageDepth / 2 + 0.1]].map(([x, z], i) => (
        <group key={`truss-post-${i}`} position={[x, 0, z]}>
          {/* Main pole */}
          <mesh position={[0, 2.3, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 4.0, 8]} />
            <meshStandardMaterial color="#C0C7CE" roughness={0.5} metalness={0.7} />
          </mesh>
          {/* Horizontal cross-braces at 3 heights (X-shape) */}
          {[1.0, 2.0, 3.0].map((y, j) => (
            <group key={`brace-${i}-${j}`} position={[0, y, 0]}>
              {/* Diagonal strut */}
              <mesh rotation={[0, Math.PI / 4, Math.PI / 6]}>
                <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
                <meshStandardMaterial color="#9AA3AB" roughness={0.5} metalness={0.7} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Top horizontal truss (front bar — where spotlights hang) */}
      <group>
        <mesh position={[0, 4.15, stageDepth / 2 - 0.1]}>
          <cylinderGeometry args={[0.1, 0.1, stageWidth - 0.3, 8]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#C0C7CE" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Lattice — zigzag bars */}
        {Array.from({ length: 10 }).map((_, i) => {
          const x = -stageWidth / 2 + 0.3 + i * ((stageWidth - 0.6) / 9);
          return (
            <mesh key={`lattice-${i}`} position={[x, 4.05, stageDepth / 2 - 0.1]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
              <meshStandardMaterial color="#9AA3AB" roughness={0.5} metalness={0.7} />
            </mesh>
          );
        })}
        {/* Back horizontal bar */}
        <mesh position={[0, 4.15, -stageDepth / 2 + 0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, stageWidth - 0.3, 8]} />
          <meshStandardMaterial color="#C0C7CE" roughness={0.5} metalness={0.7} />
        </mesh>
      </group>

      {/* ── PINK CURTAIN BACKDROP ── */}
      <mesh position={[0, 2.2, -stageDepth / 2 + 0.15]} castShadow>
        <boxGeometry args={[stageWidth - 0.5, 3.4, 0.08]} />
        <meshStandardMaterial color="#F06292" roughness={0.95} />
      </mesh>
      {/* Vertical pleat shadows on curtain */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = -stageWidth / 2 + 0.5 + i * ((stageWidth - 1) / 7);
        return (
          <mesh key={`pleat-${i}`} position={[x, 2.2, -stageDepth / 2 + 0.2]}>
            <boxGeometry args={[0.04, 3.2, 0.01]} />
            <meshStandardMaterial color="#AD1457" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Curtain top valance */}
      <mesh position={[0, 3.85, -stageDepth / 2 + 0.2]}>
        <boxGeometry args={[stageWidth - 0.3, 0.4, 0.1]} />
        <meshStandardMaterial color="#C2185B" roughness={0.9} />
      </mesh>

      {/* ── SPOTLIGHTS (hanging from front truss) ── */}
      <group ref={spotlightsRef}>
        {Array.from({ length: 5 }).map((_, i) => {
          const x = -stageWidth / 2 + 0.7 + i * ((stageWidth - 1.4) / 4);
          const colors = ['#FF5252', '#FFEB3B', '#FFFFFF', '#4DB6FF', '#BA68C8'];
          const col = colors[i];
          return (
            <group key={`spot-${i}`} position={[x, 3.95, stageDepth / 2 - 0.1]}>
              {/* Mount bracket */}
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.05, 0.15, 0.05]} />
                <meshStandardMaterial color="#555" roughness={0.6} metalness={0.5} />
              </mesh>
              {/* Lamp body */}
              <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 8, 0, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 0.28, 10]} />
                <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.6} />
              </mesh>
              {/* Colored bulb face */}
              <mesh position={[0, -0.22, 0.04]} rotation={[Math.PI / 8, 0, 0]}>
                <circleGeometry args={[0.12, 16]} />
                <meshStandardMaterial
                  color={col}
                  emissive={col}
                  emissiveIntensity={0.9}
                  roughness={0.3}
                />
              </mesh>
              {/* Glow sprite effect */}
              <mesh position={[0, -0.22, 0.05]} rotation={[Math.PI / 8, 0, 0]}>
                <circleGeometry args={[0.2, 16]} />
                <meshBasicMaterial color={col} transparent opacity={0.25} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ── MIC ON STAND ── */}
      <group position={[0, 0.82, 0.3]}>
        {/* Base */}
        <mesh>
          <cylinderGeometry args={[0.18, 0.22, 0.05, 12]} />
          <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Stand pole */}
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 1.25, 8]} />
          <meshStandardMaterial color="#37474F" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Mic clip */}
        <mesh position={[0, 1.28, 0]}>
          <boxGeometry args={[0.08, 0.12, 0.08]} />
          <meshStandardMaterial color="#455A64" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Mic head */}
        <group position={[0, 1.4, 0]} rotation={[0.2, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.4} />
          </mesh>
          {/* Grille highlight */}
          <mesh position={[0, 0.02, 0.08]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#607D8B" roughness={0.5} metalness={0.7} />
          </mesh>
        </group>
      </group>

      {/* ── STAGE SPEAKERS (corner positions) ── */}
      {[[-stageWidth / 2 + 0.6, stageDepth / 2 - 0.4], [stageWidth / 2 - 0.6, stageDepth / 2 - 0.4]].map(([x, z], i) => (
        <group key={`spk-${i}`} position={[x, 1.4, z]}>
          {/* Main cabinet */}
          <mesh castShadow>
            <boxGeometry args={[0.7, 1.2, 0.55]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.5} />
          </mesh>
          {/* Large driver */}
          <mesh position={[0, 0.2, 0.28]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 20]} rotation={[Math.PI / 2, 0, 0]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.6} />
          </mesh>
          {/* Inner cone */}
          <mesh position={[0, 0.2, 0.3]}>
            <circleGeometry args={[0.17, 20]} />
            <meshStandardMaterial color="#4A4A4A" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Small tweeter */}
          <mesh position={[0, -0.25, 0.28]}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial color="#5D5D5D" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Brand strip */}
          <mesh position={[0, -0.5, 0.28]}>
            <planeGeometry args={[0.4, 0.06]} />
            <meshBasicMaterial color="#E91E63" />
          </mesh>
        </group>
      ))}

      {/* ── STRING LIGHTS (fairy lights out in front of stage) ── */}
      <mesh position={[-3.5, 1.9, stageDepth / 2 + 1.5]}>
        <cylinderGeometry args={[0.05, 0.05, 3.8, 8]} />
        <meshStandardMaterial color="#444" roughness={0.7} />
      </mesh>
      <mesh position={[3.5, 1.9, stageDepth / 2 + 1.5]}>
        <cylinderGeometry args={[0.05, 0.05, 3.8, 8]} />
        <meshStandardMaterial color="#444" roughness={0.7} />
      </mesh>
      <group ref={bulbsRef}>
        {Array.from({ length: 8 }).map((_, i) => {
          const t = i / 7;
          const x = -3.5 + t * 7.0;
          const y = 3.7 - 0.5 * Math.sin(t * Math.PI);
          const col = bulbColors[i];
          return (
            <mesh key={`bulb-${i}`} position={[x, y, stageDepth / 2 + 1.5]}>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={0.8}
                roughness={0.4}
              />
            </mesh>
          );
        })}
      </group>

      {/* Floor-edge accent lighting (LED strip) */}
      <mesh position={[0, 0.08, stageDepth / 2]}>
        <boxGeometry args={[stageWidth - 0.2, 0.04, 0.04]} />
        <meshStandardMaterial color="#FF4081" emissive="#FF4081" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// DATING CORNER — Rose arch with floating heart and swing bench
// ─────────────────────────────────────────────────────────────
function DatingArch() {
  const heartRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (heartRef.current) {
      heartRef.current.position.y = 4.5 + Math.sin(t * 2) * 0.1;
      heartRef.current.rotation.y += 0.008;
    }
  });

  // Rose colors — dense variety along arch
  const roseColors = ['#F06292', '#FFFFFF', '#E91E63', '#FFCDD2', '#C62828', '#F8BBD0'];

  return (
    <group>
      {/* Stone base platform */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.6, 2.8, 0.2, 24]} />
        <meshStandardMaterial color="#E0D5BE" roughness={0.9} />
      </mesh>
      {/* Platform border ring */}
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 2.6, 32]} />
        <meshStandardMaterial color="#B8A988" roughness={0.9} />
      </mesh>

      {/* ── ARCH POSTS (white lattice) ── */}
      {[-1.9, 1.9].map((x, i) => (
        <group key={`post-${i}`} position={[x, 0, 0]}>
          {/* Main post */}
          <mesh position={[0, 1.9, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.18, 3.8, 12]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.6} />
          </mesh>
          {/* Decorative top finial */}
          <mesh position={[0, 3.85, 0]}>
            <sphereGeometry args={[0.18, 12, 10]} />
            <meshStandardMaterial color="#F5F5F5" roughness={0.6} />
          </mesh>
          {/* Stone footing */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.36, 0.2, 8]} />
            <meshStandardMaterial color="#B0A390" roughness={0.95} />
          </mesh>
          {/* Lattice cross-pieces (decorative) */}
          {[1.0, 1.8, 2.6].map((y, j) => (
            <mesh key={`deco-${i}-${j}`} position={[0, y, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.32, 0.04, 0.04]} />
              <meshStandardMaterial color="#FAFAFA" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── ARCH TOP (half torus) ── */}
      <mesh position={[0, 3.7, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.95, 0.13, 12, 26, Math.PI]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.6} />
      </mesh>
      {/* Secondary inner ring for lattice effect */}
      <mesh position={[0, 3.7, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.06, 8, 22, Math.PI]} />
        <meshStandardMaterial color="#F0F0F0" roughness={0.6} />
      </mesh>

      {/* ── DENSE ROSE CLUSTERS along the arch ── */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 31) * Math.PI;
        const radiusJitter = (i % 3) * 0.1;
        const r = 1.95 + radiusJitter;
        const zOffset = ((i % 4) - 2) * 0.12;
        const col = roseColors[i % roseColors.length];
        const size = 0.15 + (i % 3) * 0.04;
        return (
          <group
            key={`rose-${i}`}
            position={[Math.cos(angle) * r, 3.7 + Math.sin(angle) * r, zOffset]}
          >
            {/* Rose petals — central sphere + 4 small petals */}
            <mesh castShadow>
              <sphereGeometry args={[size, 10, 8]} />
              <meshStandardMaterial color={col} roughness={0.7} emissive={col} emissiveIntensity={0.06} />
            </mesh>
            {i % 2 === 0 && (
              <>
                {[[0.08, 0.02, 0], [-0.08, 0.02, 0], [0, 0.02, 0.08], [0, 0.02, -0.08]].map(
                  ([px, py, pz], pi) => (
                    <mesh key={`petal-${pi}`} position={[px, py, pz]} scale={[1, 0.4, 1]}>
                      <sphereGeometry args={[size * 0.6, 8, 6]} />
                      <meshStandardMaterial color={col} roughness={0.7} />
                    </mesh>
                  ),
                )}
              </>
            )}
          </group>
        );
      })}

      {/* ── GREEN LEAVES interspersed ── */}
      {Array.from({ length: 22 }).map((_, i) => {
        const angle = (i / 22) * Math.PI + 0.08;
        const col = i % 2 === 0 ? '#66BB6A' : '#4CAF50';
        const zOff = ((i % 3) - 1) * 0.15;
        return (
          <mesh
            key={`leaf-${i}`}
            position={[Math.cos(angle) * 1.88, 3.7 + Math.sin(angle) * 1.88, zOff]}
            rotation={[0, i * 0.4, i * 0.3]}
            scale={[1.2, 0.4, 0.6]}
          >
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshStandardMaterial color={col} roughness={0.8} />
          </mesh>
        );
      })}

      {/* ── FLOATING HEART ── */}
      <group ref={heartRef} position={[0, 4.5, 0]}>
        <mesh position={[-0.22, 0.1, 0]} castShadow>
          <sphereGeometry args={[0.3, 14, 14]} />
          <meshStandardMaterial color="#E91E63" emissive="#E91E63" emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0.22, 0.1, 0]} castShadow>
          <sphereGeometry args={[0.3, 14, 14]} />
          <meshStandardMaterial color="#E91E63" emissive="#E91E63" emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.15, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.42, 0.42, 0.42]} />
          <meshStandardMaterial color="#E91E63" emissive="#E91E63" emissiveIntensity={0.3} roughness={0.5} />
        </mesh>
      </group>

      {/* ── GARDEN BENCH underneath arch ── */}
      <group position={[0, 0, -0.2]}>
        {/* Seat */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[2.2, 0.1, 0.55]} />
          <meshStandardMaterial color="#F5F5F5" roughness={0.7} />
        </mesh>
        {/* Backrest - three vertical slats */}
        {[-0.8, 0, 0.8].map((x, i) => (
          <mesh key={`bs-${i}`} position={[x, 0.95, -0.24]} castShadow>
            <boxGeometry args={[0.18, 0.85, 0.06]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.7} />
          </mesh>
        ))}
        {/* Backrest top rail */}
        <mesh position={[0, 1.3, -0.24]} castShadow>
          <boxGeometry args={[2.2, 0.1, 0.08]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.7} />
        </mesh>
        {/* Armrests */}
        {[-1.05, 1.05].map((x, i) => (
          <mesh key={`arm-${i}`} position={[x, 0.7, 0]} castShadow>
            <boxGeometry args={[0.12, 0.35, 0.5]} />
            <meshStandardMaterial color="#FAFAFA" roughness={0.7} />
          </mesh>
        ))}
        {/* Curved wrought-iron legs */}
        {[[-0.95, 0.23], [0.95, 0.23], [-0.95, -0.23], [0.95, -0.23]].map(([x, z], i) => (
          <mesh key={`bl-${i}`} position={[x, 0.28, z]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.55, 6]} />
            <meshStandardMaterial color="#2E2E2E" roughness={0.4} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* ── FLANKING ROSE BUSHES (denser, larger) ── */}
      <RoseBush position={[-2.4, 0, 0.9]} />
      <RoseBush position={[2.4, 0, 0.9]} />
      <RoseBush position={[-2.8, 0, -0.2]} />
      <RoseBush position={[2.8, 0, -0.2]} />
    </group>
  );
}

function RoseBush({ position }: PosProps) {
  const flowerColors = ['#F06292', '#FFFFFF', '#E91E63', '#FFCDD2', '#C62828'];
  const flowers = Array.from({ length: 10 }, (_, i) => ({
    x: (Math.sin(i * 2.3) * 0.45),
    y: 0.45 + (i % 3) * 0.12,
    z: (Math.cos(i * 1.7) * 0.4),
    col: flowerColors[i % flowerColors.length],
    size: 0.1 + (i % 3) * 0.03,
  }));

  return (
    <group position={position}>
      {/* Foliage base */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.58, 10, 10]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.85} />
      </mesh>
      {/* Dense flowers across the bush */}
      {flowers.map((f, i) => (
        <mesh key={`flower-${i}`} position={[f.x, f.y, f.z]} castShadow>
          <sphereGeometry args={[f.size, 8, 8]} />
          <meshStandardMaterial color={f.col} roughness={0.7} emissive={f.col} emissiveIntensity={0.08} />
        </mesh>
      ))}
      {/* Lighter foliage highlights */}
      {[[0.2, 0.55, 0.1], [-0.25, 0.48, -0.15]].map(([x, y, z], i) => (
        <mesh key={`hl-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color="#66BB6A" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// CAFÉ — Coffee kiosk with striped awning + outdoor tables & umbrellas
// ─────────────────────────────────────────────────────────────
function CafeKiosk() {
  const steam1 = useRef<THREE.Mesh>(null);
  const steam2 = useRef<THREE.Mesh>(null);
  const steamMachine = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    [steam1, steam2, steamMachine].forEach((ref, i) => {
      if (!ref.current) return;
      const phase = (t * 0.4 + i * 0.3) % 1;
      const baseY = i === 2 ? 1.85 : 1.35;
      ref.current.position.y = baseY + phase * 0.7;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.5 - phase * 0.45;
      ref.current.scale.setScalar(0.7 + phase * 0.6);
    });
  });

  return (
    <group>
      {/* ── KIOSK MAIN STRUCTURE ── */}
      {/* Main wooden body */}
      <mesh position={[0, 1.0, -1.1]} castShadow>
        <boxGeometry args={[3.2, 2.0, 1.5]} />
        <meshStandardMaterial color="#8B6538" roughness={0.88} />
      </mesh>
      {/* Vertical wooden planks (grain effect) */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = -1.5 + i * 0.5;
        return (
          <mesh key={`plank-${i}`} position={[x, 1.0, -0.355]}>
            <boxGeometry args={[0.04, 1.9, 0.04]} />
            <meshStandardMaterial color="#6B4E2A" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Darker base plinth */}
      <mesh position={[0, 0.15, -1.1]}>
        <boxGeometry args={[3.3, 0.3, 1.6]} />
        <meshStandardMaterial color="#4E342E" roughness={0.95} />
      </mesh>

      {/* Roof beam (top of kiosk) */}
      <mesh position={[0, 2.05, -1.1]}>
        <boxGeometry args={[3.4, 0.15, 1.6]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>

      {/* ── STRIPED AWNING — proper red/white vertical stripes like concept ── */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = -1.625 + i * 0.25;
        const isRed = i % 2 === 0;
        return (
          <group key={`stripe-${i}`}>
            {/* Front angled edge */}
            <mesh position={[x, 2.25, -0.3]} rotation={[0.3, 0, 0]} castShadow>
              <boxGeometry args={[0.24, 0.08, 1.3]} />
              <meshStandardMaterial color={isRed ? '#D32F2F' : '#FAFAFA'} roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Awning front scalloped edge (decorative trim) */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = -1.625 + i * 0.25;
        const isRed = i % 2 === 0;
        return (
          <mesh
            key={`scallop-${i}`}
            position={[x, 1.97, 0.28]}
            rotation={[0.3, 0, 0]}
          >
            <coneGeometry args={[0.08, 0.15, 4]} rotation={[Math.PI, 0, 0]} />
            <meshStandardMaterial color={isRed ? '#B71C1C' : '#EEEEEE'} roughness={0.9} />
          </mesh>
        );
      })}

      {/* Awning support poles */}
      <mesh position={[-1.6, 2.15, -0.3]} rotation={[0, 0, -0.12]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
        <meshStandardMaterial color="#6B4E2A" roughness={0.8} />
      </mesh>
      <mesh position={[1.6, 2.15, -0.3]} rotation={[0, 0, 0.12]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
        <meshStandardMaterial color="#6B4E2A" roughness={0.8} />
      </mesh>

      {/* ── COUNTER with marble/wood top ── */}
      <mesh position={[0, 1.25, -0.3]} castShadow>
        <boxGeometry args={[2.9, 0.12, 0.55]} />
        <meshStandardMaterial color="#3E2723" roughness={0.7} />
      </mesh>
      {/* Counter edge highlight */}
      <mesh position={[0, 1.32, -0.02]}>
        <boxGeometry args={[2.9, 0.03, 0.03]} />
        <meshStandardMaterial color="#8B6538" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* ── MENU CHALKBOARD (back wall, inside kiosk) ── */}
      <group position={[0, 1.5, -1.84]}>
        {/* Wooden frame */}
        <mesh>
          <planeGeometry args={[2.2, 0.95]} />
          <meshStandardMaterial color="#5D4037" roughness={0.9} />
        </mesh>
        {/* Chalkboard */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[2.0, 0.8]} />
          <meshStandardMaterial color="#1B1B1B" roughness={0.95} />
        </mesh>
        {/* "MENU" header */}
        <mesh position={[0, 0.3, 0.02]}>
          <planeGeometry args={[0.5, 0.08]} />
          <meshBasicMaterial color="#FFEB3B" />
        </mesh>
        {/* Menu item lines — left column */}
        {[-0.1, -0.22, -0.34].map((y, i) => (
          <mesh key={`ml-${i}`} position={[-0.5, y + 0.1, 0.02]}>
            <planeGeometry args={[0.65, 0.055]} />
            <meshBasicMaterial color="#FFECB3" />
          </mesh>
        ))}
        {/* Right column prices */}
        {[-0.1, -0.22, -0.34].map((y, i) => (
          <mesh key={`mp-${i}`} position={[0.55, y + 0.1, 0.02]}>
            <planeGeometry args={[0.3, 0.055]} />
            <meshBasicMaterial color="#FF8A65" />
          </mesh>
        ))}
      </group>

      {/* ── ESPRESSO MACHINE (back counter, left side) ── */}
      <group position={[-0.9, 1.35, -1.1]}>
        {/* Main body */}
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.4, 0.4]} />
          <meshStandardMaterial color="#ECEFF1" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Top steam wand area */}
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.5, 0.1, 0.35]} />
          <meshStandardMaterial color="#37474F" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Brass group head (left and right spouts) */}
        {[-0.13, 0.13].map((x, i) => (
          <mesh key={`spout-${i}`} position={[x, -0.12, 0.18]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.1, 8]} />
            <meshStandardMaterial color="#FFB300" roughness={0.3} metalness={0.8} />
          </mesh>
        ))}
        {/* Small portafilter handles (black) */}
        {[-0.13, 0.13].map((x, i) => (
          <mesh key={`pf-${i}`} position={[x, -0.2, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.18, 6]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.4} />
          </mesh>
        ))}
        {/* Control button (red) */}
        <mesh position={[0, 0.05, 0.205]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#F44336" emissive="#F44336" emissiveIntensity={0.4} />
        </mesh>
        {/* Steam from machine top */}
        <mesh ref={steamMachine} position={[0.15, 0.5, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* ── PASTRY DISPLAY CASE (right side of counter) ── */}
      <group position={[1.0, 1.4, -0.9]}>
        {/* Glass case (transparent) */}
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.5, 0.45]} />
          <meshStandardMaterial
            color="#B3E5FC"
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
        {/* Case frame */}
        {[
          [-0.4, 0, 0], [0.4, 0, 0],
          [0, 0.25, -0.225], [0, -0.25, -0.225],
          [0, 0.25, 0.225], [0, -0.25, 0.225],
        ].map(([fx, fy, fz], i) => (
          <mesh key={`f-${i}`} position={[fx, fy, fz]}>
            <boxGeometry args={fx !== 0 ? [0.02, 0.52, 0.47] : [0.82, 0.02, 0.02]} />
            <meshStandardMaterial color="#455A64" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
        {/* Pastries inside — small colored balls on 2 shelves */}
        {[-0.15, 0.15].map((y, shelf) =>
          [-0.2, 0, 0.2].map((x, i) => {
            const colors = ['#D7A86E', '#C27F39', '#F4C571', '#E91E63', '#8B4513'];
            const col = colors[(shelf * 3 + i) % colors.length];
            return (
              <mesh key={`pastry-${shelf}-${i}`} position={[x, y - 0.1, 0]} castShadow>
                <sphereGeometry args={[0.07, 8, 6]} />
                <meshStandardMaterial color={col} roughness={0.8} />
              </mesh>
            );
          })
        )}
      </group>

      {/* ── COFFEE CUPS on counter ── */}
      <group position={[-0.2, 1.32, -0.3]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.08, 0.18, 14]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.4} />
        </mesh>
        {/* Coffee surface */}
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.095, 0.095, 0.015, 14]} />
          <meshStandardMaterial color="#6F4E37" roughness={0.3} />
        </mesh>
        {/* Handle */}
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.06, 0.015, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.4} />
        </mesh>
        {/* Steam */}
        <mesh ref={steam1} position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
        </mesh>
      </group>
      <group position={[0.5, 1.32, -0.3]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.07, 0.16, 14]} />
          <meshStandardMaterial color="#FFCCBC" roughness={0.4} />
        </mesh>
        {/* Coffee surface */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.015, 14]} />
          <meshStandardMaterial color="#8D6E63" roughness={0.3} />
        </mesh>
        {/* Steam */}
        <mesh ref={steam2} position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* ── CAFÉ SIGNAGE (above awning) ── */}
      <group position={[0, 2.4, -0.4]} rotation={[0.3, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.3, 0.35, 0.08]} />
          <meshStandardMaterial color="#F5DEB3" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[1.1, 0.2]} />
          <meshBasicMaterial color="#5D4037" />
        </mesh>
        {/* "COFFEE" text stripe */}
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[0.9, 0.08]} />
          <meshBasicMaterial color="#FAFAFA" />
        </mesh>
      </group>

      {/* ── OUTDOOR TABLES with umbrellas ── */}
      <CafeTable position={[-2.2, 0, 1.8]} umbrellaColor="#D32F2F" />
      <CafeTable position={[2.2, 0, 1.8]} umbrellaColor="#FBC02D" />
      <CafeTable position={[0, 0, 3]} umbrellaColor="#5D4037" />
    </group>
  );
}

function CafeTable({ position, umbrellaColor }: PosProps & { umbrellaColor: string }) {
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 18]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 14]} />
        <meshToonMaterial color="#616161" />
      </mesh>

      {/* Umbrella pole */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2.1, 6]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      {/* Umbrella canopy — 6-gore cone */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[1.3, 0.55, 12]} />
        <meshToonMaterial color={umbrellaColor} />
      </mesh>
      <mesh position={[0, 2.78, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshToonMaterial color="#FFD54F" />
      </mesh>

      {/* Two chairs */}
      <CafeChair position={[0.92, 0, 0]} rotation={-Math.PI / 2} />
      <CafeChair position={[-0.92, 0, 0]} rotation={Math.PI / 2} />
    </group>
  );
}

function CafeChair({ position, rotation = 0 }: PosProps & { rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 14]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.42, 6]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 12]} />
        <meshToonMaterial color="#616161" />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.68, -0.18]}>
        <boxGeometry args={[0.38, 0.32, 0.04]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Flower patches — decorative grass-level colour pops
// ─────────────────────────────────────────────────────────────
function FlowerPatch({ position, color = '#FFEB3B' }: PosProps & { color?: string }) {
  return (
    <group position={position}>
      {[[0, 0], [0.3, 0.2], [-0.25, 0.15], [0.1, -0.25], [-0.2, -0.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Stem */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 4]} />
            <meshToonMaterial color="#388E3C" />
          </mesh>
          {/* Flower head */}
          <mesh position={[0, 0.33, 0]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Centre */}
          <mesh position={[0, 0.33, 0.03]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshToonMaterial color="#FF9800" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export: places every landmark + flowers at correct positions
// Rotations face each zone's "front" toward the plaza centre (0,0).
// ─────────────────────────────────────────────────────────────
export default function ZoneLandmarks() {
  return (
    <group>
      {/* Study Zone — at (-18, -15), facing centre (SE) */}
      <group position={[-18, 0, -15]} rotation={[0, Math.atan2(18, -15), 0]}>
        <StudyPergola />
      </group>

      {/* Social Zone — at (18, -15), facing centre (SW) */}
      <group position={[18, 0, -15]} rotation={[0, Math.atan2(-18, -15), 0]}>
        <SocialStage />
      </group>

      {/* Dating Corner — at (-18, 18), facing centre (NE) */}
      <group position={[-18, 0, 18]} rotation={[0, Math.atan2(18, 15), 0]}>
        <DatingArch />
      </group>

      {/* Café — at (18, 18), facing centre (NW) */}
      <group position={[18, 0, 18]} rotation={[0, Math.atan2(-18, 15), 0]}>
        <CafeKiosk />
      </group>

      {/* Flower patches scattered around the plaza */}
      <FlowerPatch position={[-6, 0, 2]} color="#FFEB3B" />
      <FlowerPatch position={[6, 0, -2]} color="#E91E63" />
      <FlowerPatch position={[-4, 0, -6]} color="#FFFFFF" />
      <FlowerPatch position={[4, 0, 6]} color="#FF9800" />
      <FlowerPatch position={[-10, 0, 0]} color="#9C27B0" />
      <FlowerPatch position={[10, 0, 0]} color="#FFEB3B" />
      <FlowerPatch position={[0, 0, -12]} color="#E91E63" />
      <FlowerPatch position={[0, 0, 12]} color="#FFFFFF" />
      <FlowerPatch position={[-24, 0, 0]} color="#FF5722" />
      <FlowerPatch position={[24, 0, 0]} color="#03A9F4" />
    </group>
  );
}
