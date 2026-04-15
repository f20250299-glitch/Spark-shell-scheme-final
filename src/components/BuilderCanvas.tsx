import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Environment, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useBuilderStore, Item, ItemType } from '../store';

function BuilderItem({ item }: { item: Item }) {
  const { selectedItemIds, selectItem, updateItem, viewMode, artworks } = useBuilderStore();
  const { gl } = useThree();
  const isSelected = selectedItemIds.includes(item.id);
  const transformRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);

  const artwork = artworks.find(a => a.id === item.artworkId);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    if (artwork?.dataUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(artwork.dataUrl, (tex) => {
        if (active) {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = gl.capabilities.getMaxAnisotropy();
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          setTexture(tex);
        } else {
          tex.dispose();
        }
      });
    } else {
      setTexture(null);
    }
    return () => {
      active = false;
    };
  }, [artwork?.dataUrl, gl]);

  useEffect(() => {
    if (texture) {
      if (item.textureOffset) {
        texture.offset.set(item.textureOffset[0], item.textureOffset[1]);
      } else {
        texture.offset.set(0, 0);
      }
      if (item.textureRepeat) {
        texture.repeat.set(item.textureRepeat[0], item.textureRepeat[1]);
      } else {
        texture.repeat.set(1, 1);
      }
      texture.needsUpdate = true;
    }
  }, [texture, item.textureOffset, item.textureRepeat]);

  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current;
      const callback = () => {
        if (groupRef.current) {
          updateItem(item.id, {
            position: [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z],
            rotation: [groupRef.current.rotation.x, groupRef.current.rotation.y, groupRef.current.rotation.z]
          });
        }
      };
      controls.addEventListener('change', callback);
      return () => {
        controls.removeEventListener('change', callback);
      };
    }
  }, [item.id, updateItem]);

  const renderGeometry = () => {
    let currentDimensions = [...item.dimensions] as [number, number, number];
    let zOffset = 0;
    
    const isSeamless = item.printType === 'seamless';
    const showFront = item.artworkSide === 'front' || item.artworkSide === 'both' || !item.artworkSide;
    const showBack = item.artworkSide === 'back' || item.artworkSide === 'both';

    if (item.type === 'sheet' || item.type === 'fascia') {
      if (isSeamless) {
        if (item.artworkSide === 'back') {
          zOffset = -0.022;
        } else if (item.artworkSide === 'both') {
          zOffset = 0;
          currentDimensions[2] = 0.045; // Make it thick enough to cover extrusions on both sides
        } else {
          zOffset = 0.022; // front
        }
      }
    }

    const edges = (
      <lineSegments raycast={() => null}>
        <edgesGeometry args={[new THREE.BoxGeometry(...currentDimensions)]} />
        <lineBasicMaterial color="#000000" linewidth={1} opacity={0.3} transparent />
      </lineSegments>
    );

    const is2DSheet = viewMode === '2d' && item.type === 'sheet';
    const materialColor = is2DSheet ? '#3b82f6' : item.color;

    switch (item.type) {
      case 'sheet':
      case 'fascia':
        return (
          <mesh castShadow receiveShadow position={[0, 0, zOffset]}>
            <boxGeometry args={currentDimensions} />
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const hasTexture = (index === 4 && showFront) || (index === 5 && showBack);
              return (
                <meshStandardMaterial 
                  key={`${index}-${texture ? texture.uuid : 'no-tex'}`}
                  attach={`material-${index}`}
                  color={materialColor} 
                  map={hasTexture ? (texture || null) : null}
                  roughness={0.2} 
                  metalness={0.1} 
                  side={THREE.DoubleSide} 
                  transparent={hasTexture ? !!texture : false}
                />
              );
            })}
            {!isSeamless && edges}
          </mesh>
        );
      case 'extrusion':
      case 'beam':
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry args={item.dimensions} />
            <meshStandardMaterial color={item.color} roughness={0.4} metalness={0.8} />
            {edges}
          </mesh>
        );
      case 'spotlight':
        return (
          <group>
            <mesh castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.1, 16]} />
              <meshStandardMaterial color={item.color} roughness={0.7} metalness={0.2} />
            </mesh>
            <pointLight position={[0, -0.1, 0]} intensity={2} distance={5} color="#ffffff" />
          </group>
        );
      case 'carpet':
        return (
          <mesh castShadow receiveShadow position={[0, -item.dimensions[1]/2, 0]}>
            <boxGeometry args={item.dimensions} />
            <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.0} />
            {edges}
          </mesh>
        );
      case 'curtain-closed': {
        const numFolds = 24;
        const foldWidth = item.dimensions[0] / numFolds;
        const actualFoldWidth = foldWidth * 1.5; // 50% more fabric than straight width
        const angleVal = Math.acos(foldWidth / actualFoldWidth);
        
        return (
          <group>
            {/* Curtain Rod */}
            <mesh castShadow receiveShadow position={[0, item.dimensions[1]/2 - 0.05, 0.05]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.015, 0.015, item.dimensions[0] + 0.1]} />
              <meshStandardMaterial color="#b48e4b" roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Rod Ends */}
            <mesh castShadow receiveShadow position={[-item.dimensions[0]/2 - 0.05, item.dimensions[1]/2 - 0.05, 0.05]}>
              <sphereGeometry args={[0.025]} />
              <meshStandardMaterial color="#b48e4b" roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[item.dimensions[0]/2 + 0.05, item.dimensions[1]/2 - 0.05, 0.05]}>
              <sphereGeometry args={[0.025]} />
              <meshStandardMaterial color="#b48e4b" roughness={0.2} metalness={0.8} />
            </mesh>
            
            {/* Fabric */}
            {Array.from({ length: numFolds }).map((_, i) => {
              const isEven = i % 2 === 0;
              const angle = isEven ? angleVal : -angleVal;
              const xPos = -item.dimensions[0]/2 + (i * foldWidth) + (foldWidth / 2);
              
              return (
                <mesh key={i} castShadow receiveShadow position={[xPos, -0.05, 0.05]} rotation={[0, angle, 0]}>
                  <boxGeometry args={[actualFoldWidth, item.dimensions[1] - 0.1, 0.005]} />
                  <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.1} side={THREE.DoubleSide} />
                </mesh>
              );
            })}
          </group>
        );
      }
      case 'curtain-open': {
        const numFoldsPerSide = 12;
        const bunchWidth = item.dimensions[0] * 0.2; // 20% of width per bunch
        const foldWidth = bunchWidth / numFoldsPerSide;
        const actualFoldWidth = (item.dimensions[0] / 2) / numFoldsPerSide * 1.5; // Same fabric amount as closed
        const angleVal = Math.acos(foldWidth / actualFoldWidth);

        return (
          <group>
            {/* Curtain Rod */}
            <mesh castShadow receiveShadow position={[0, item.dimensions[1]/2 - 0.05, 0.05]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.015, 0.015, item.dimensions[0] + 0.1]} />
              <meshStandardMaterial color="#b48e4b" roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Rod Ends */}
            <mesh castShadow receiveShadow position={[-item.dimensions[0]/2 - 0.05, item.dimensions[1]/2 - 0.05, 0.05]}>
              <sphereGeometry args={[0.025]} />
              <meshStandardMaterial color="#b48e4b" roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[item.dimensions[0]/2 + 0.05, item.dimensions[1]/2 - 0.05, 0.05]}>
              <sphereGeometry args={[0.025]} />
              <meshStandardMaterial color="#b48e4b" roughness={0.2} metalness={0.8} />
            </mesh>
            
            {/* Left Bunch */}
            {Array.from({ length: numFoldsPerSide }).map((_, i) => {
              const isEven = i % 2 === 0;
              const angle = isEven ? angleVal : -angleVal;
              const xPos = -item.dimensions[0]/2 + (i * foldWidth) + (foldWidth / 2);
              
              return (
                <mesh key={`l-${i}`} castShadow receiveShadow position={[xPos, -0.05, 0.05]} rotation={[0, angle, 0]}>
                  <boxGeometry args={[actualFoldWidth, item.dimensions[1] - 0.1, 0.005]} />
                  <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.1} side={THREE.DoubleSide} />
                </mesh>
              );
            })}

            {/* Right Bunch */}
            {Array.from({ length: numFoldsPerSide }).map((_, i) => {
              const isEven = i % 2 === 0;
              const angle = isEven ? angleVal : -angleVal;
              const xPos = item.dimensions[0]/2 - bunchWidth + (i * foldWidth) + (foldWidth / 2);
              
              return (
                <mesh key={`r-${i}`} castShadow receiveShadow position={[xPos, -0.05, 0.05]} rotation={[0, angle, 0]}>
                  <boxGeometry args={[actualFoldWidth, item.dimensions[1] - 0.1, 0.005]} />
                  <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.1} side={THREE.DoubleSide} />
                </mesh>
              );
            })}
          </group>
        );
      }
      case 'door-normal':
        return (
          <group>
            {/* Outer Frame (Left, Right, Top, Bottom, Middle) */}
            <mesh castShadow receiveShadow position={[-item.dimensions[0]/2 + 0.02, 0, 0]}>
              <boxGeometry args={[0.04, item.dimensions[1], 0.04]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[item.dimensions[0]/2 - 0.02, 0, 0]}>
              <boxGeometry args={[0.04, item.dimensions[1], 0.04]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, item.dimensions[1]/2 - 0.02, 0]}>
              <boxGeometry args={[item.dimensions[0] - 0.08, 0.04, 0.04]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -item.dimensions[1]/2 + 0.02, 0]}>
              <boxGeometry args={[item.dimensions[0] - 0.08, 0.04, 0.04]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}> {/* Middle bar at ~1m height */}
              <boxGeometry args={[item.dimensions[0] - 0.08, 0.04, 0.04]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.4} metalness={0.8} />
            </mesh>
            
            {/* Top Panel */}
            <mesh castShadow receiveShadow position={[0, 0.48, 0]}>
              <boxGeometry args={[item.dimensions[0] - 0.08, 1.32, 0.01]} />
              <meshStandardMaterial color={item.color} roughness={0.5} metalness={0.1} />
            </mesh>
            
            {/* Bottom Panel */}
            <mesh castShadow receiveShadow position={[0, -0.68, 0]}>
              <boxGeometry args={[item.dimensions[0] - 0.08, 0.92, 0.01]} />
              <meshStandardMaterial color={item.color} roughness={0.5} metalness={0.1} />
            </mesh>

            {/* Handle */}
            <group position={[item.dimensions[0]/2 - 0.1, -0.2, 0.03]}>
              {/* Backplate */}
              <mesh castShadow receiveShadow position={[0, 0, 0]}>
                <boxGeometry args={[0.04, 0.15, 0.01]} />
                <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.8} />
              </mesh>
              {/* Lever */}
              <mesh castShadow receiveShadow position={[-0.04, 0.02, 0.03]}>
                <boxGeometry args={[0.1, 0.02, 0.02]} />
                <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.8} />
              </mesh>
              {/* Spindle */}
              <mesh castShadow receiveShadow position={[0, 0.02, 0.015]} rotation={[Math.PI/2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.03]} />
                <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.8} />
              </mesh>
            </group>
          </group>
        );
      case 'door-folding': {
        const numFolds = 8;
        const foldWidth = item.dimensions[0] / numFolds;
        const foldAngle = Math.PI / 6; // 30 degrees
        const actualFoldWidth = foldWidth / Math.cos(foldAngle);
        
        return (
          <group>
            {/* Top Track */}
            <mesh castShadow receiveShadow position={[0, item.dimensions[1]/2 - 0.02, 0]}>
              <boxGeometry args={[item.dimensions[0], 0.04, 0.06]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.4} metalness={0.8} />
            </mesh>
            
            {/* Folds */}
            {Array.from({ length: numFolds }).map((_, i) => {
              const isEven = i % 2 === 0;
              const angle = isEven ? foldAngle : -foldAngle;
              const xPos = -item.dimensions[0]/2 + (i * foldWidth) + (foldWidth / 2);
              
              return (
                <mesh key={i} castShadow receiveShadow position={[xPos, -0.02, 0]} rotation={[0, angle, 0]}>
                  <boxGeometry args={[actualFoldWidth, item.dimensions[1] - 0.04, 0.01]} />
                  <meshStandardMaterial color={item.color} roughness={0.5} metalness={0.1} />
                  <lineSegments>
                    <edgesGeometry args={[new THREE.BoxGeometry(actualFoldWidth, item.dimensions[1] - 0.04, 0.01)]} />
                    <lineBasicMaterial color="#9ca3af" linewidth={1} />
                  </lineSegments>
                </mesh>
              );
            })}
          </group>
        );
      }
      case 'table':
        return (
          <group>
            {/* Glass Top */}
            <mesh castShadow receiveShadow position={[0, item.dimensions[1]/2 - 0.01, 0]}>
              <cylinderGeometry args={[item.dimensions[0]/2, item.dimensions[0]/2, 0.02, 32]} />
              <meshPhysicalMaterial color="#a0aab5" transmission={0.9} opacity={1} transparent roughness={0.1} ior={1.5} thickness={0.02} />
            </mesh>
            {/* Central Pole */}
            <mesh castShadow receiveShadow position={[0, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, item.dimensions[1] - 0.04, 16]} />
              <meshStandardMaterial color="#d1d5db" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, -item.dimensions[1]/2 + 0.01, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.02, 32]} />
              <meshStandardMaterial color="#d1d5db" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        );
      case 'chair':
        return (
          <group>
            {/* Seat */}
            <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
              <boxGeometry args={[0.45, 0.05, 0.4]} />
              <meshStandardMaterial color={item.color} roughness={0.4} />
            </mesh>
            {/* Backrest */}
            <mesh castShadow receiveShadow position={[0, 0.3, -0.18]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.4, 0.4, 0.05]} />
              <meshStandardMaterial color={item.color} roughness={0.4} />
            </mesh>
            {/* Legs (Wooden) */}
            {[-0.18, 0.18].map((x, i) => 
              [-0.15, 0.15].map((z, j) => (
                <mesh key={`${i}-${j}`} castShadow receiveShadow position={[x, -0.15, z]} rotation={[z > 0 ? -0.1 : 0.1, 0, x > 0 ? 0.1 : -0.1]}>
                  <cylinderGeometry args={[0.015, 0.01, 0.45, 8]} />
                  <meshStandardMaterial color="#d4a373" roughness={0.8} />
                </mesh>
              ))
            )}
            {/* Metal Cross Braces */}
            <mesh castShadow receiveShadow position={[0, -0.1, 0]} rotation={[Math.PI/2, 0, Math.PI/4]}>
              <cylinderGeometry args={[0.005, 0.005, 0.4, 8]} />
              <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.8} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, -0.1, 0]} rotation={[Math.PI/2, 0, -Math.PI/4]}>
              <cylinderGeometry args={[0.005, 0.005, 0.4, 8]} />
              <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.8} />
            </mesh>
          </group>
        );
      case 'brochure-stand':
        return (
          <group>
            {/* Central Spine */}
            <mesh castShadow receiveShadow position={[0, 0, -0.1]}>
              <boxGeometry args={[0.05, item.dimensions[1], 0.05]} />
              <meshStandardMaterial color="#d1d5db" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, -item.dimensions[1]/2 + 0.02, 0]}>
              <boxGeometry args={[0.3, 0.04, 0.4]} />
              <meshStandardMaterial color="#d1d5db" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Shelves (Zigzag) */}
            {[0.4, 0.1, -0.2, -0.5].map((y, i) => (
              <mesh key={i} castShadow receiveShadow position={[0, y, 0]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.25, 0.3, 0.02]} />
                <meshPhysicalMaterial color="#ffffff" transmission={0.5} opacity={0.8} transparent roughness={0.2} />
                <mesh castShadow receiveShadow position={[0, -0.15, 0.02]}>
                  <boxGeometry args={[0.25, 0.02, 0.04]} />
                  <meshStandardMaterial color="#d1d5db" roughness={0.4} metalness={0.6} />
                </mesh>
              </mesh>
            ))}
          </group>
        );
      case 'tv-stand': {
        const tvSizeInches = item.metadata?.tvSize || 50;
        // Rough conversion: 1 inch diagonal = ~0.022m width, ~0.012m height
        const tvWidth = tvSizeInches * 0.022;
        const tvHeight = tvSizeInches * 0.012;
        
        return (
          <group>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, -item.dimensions[1]/2 + 0.05, 0]}>
              <boxGeometry args={[0.8, 0.04, 0.6]} />
              <meshStandardMaterial color="#111827" roughness={0.6} />
            </mesh>
            {/* Wheels */}
            {[-0.35, 0.35].map(x => 
              [-0.25, 0.25].map(z => (
                <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x, -item.dimensions[1]/2 + 0.02, z]} rotation={[0, 0, Math.PI/2]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.02, 16]} />
                  <meshStandardMaterial color="#374151" roughness={0.8} />
                </mesh>
              ))
            )}
            {/* Vertical Poles */}
            <mesh castShadow receiveShadow position={[-0.15, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, item.dimensions[1] - 0.1, 16]} />
              <meshStandardMaterial color="#111827" roughness={0.6} />
            </mesh>
            <mesh castShadow receiveShadow position={[0.15, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, item.dimensions[1] - 0.1, 16]} />
              <meshStandardMaterial color="#111827" roughness={0.6} />
            </mesh>
            {/* TV Screen */}
            <mesh castShadow receiveShadow position={[0, 0.4, 0.05]}>
              <boxGeometry args={[tvWidth, tvHeight, 0.05]} />
              <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.8} />
              {/* Screen Bezel */}
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(tvWidth, tvHeight, 0.05)]} />
                <lineBasicMaterial color="#374151" linewidth={2} />
              </lineSegments>
            </mesh>
          </group>
        );
      }
      case 'counter-normal':
      case 'counter-glass': {
        const isGlass = item.type === 'counter-glass';
        return (
          <group>
            {/* Aluminum Frame Edges */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(item.dimensions[0], item.dimensions[1], item.dimensions[2])]} />
              <lineBasicMaterial color="#9ca3af" linewidth={2} />
            </lineSegments>
            
            {/* Top Surface */}
            <mesh castShadow receiveShadow position={[0, item.dimensions[1]/2 - 0.01, 0]}>
              <boxGeometry args={[item.dimensions[0], 0.02, item.dimensions[2]]} />
              {isGlass ? (
                <meshPhysicalMaterial color="#a0aab5" transmission={0.9} opacity={1} transparent roughness={0.1} ior={1.5} thickness={0.02} />
              ) : (
                <meshStandardMaterial color={item.color} roughness={0.5} />
              )}
            </mesh>
            
            {/* Bottom Base */}
            <mesh castShadow receiveShadow position={[0, -item.dimensions[1]/2 + 0.02, 0]}>
              <boxGeometry args={[item.dimensions[0], 0.04, item.dimensions[2]]} />
              <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
            </mesh>
            
            {/* Front Panel */}
            <mesh castShadow receiveShadow position={[0, isGlass ? -item.dimensions[1]/4 : 0, item.dimensions[2]/2 - 0.01]}>
              <boxGeometry args={[item.dimensions[0] - 0.04, isGlass ? item.dimensions[1]/2 : item.dimensions[1] - 0.04, 0.02]} />
              <meshStandardMaterial color={item.color} roughness={0.5} map={texture || null} />
            </mesh>
            
            {/* Side Panels */}
            <mesh castShadow receiveShadow position={[-item.dimensions[0]/2 + 0.01, isGlass ? -item.dimensions[1]/4 : 0, 0]}>
              <boxGeometry args={[0.02, isGlass ? item.dimensions[1]/2 : item.dimensions[1] - 0.04, item.dimensions[2] - 0.04]} />
              <meshStandardMaterial color={item.color} roughness={0.5} map={texture || null} />
            </mesh>
            <mesh castShadow receiveShadow position={[item.dimensions[0]/2 - 0.01, isGlass ? -item.dimensions[1]/4 : 0, 0]}>
              <boxGeometry args={[0.02, isGlass ? item.dimensions[1]/2 : item.dimensions[1] - 0.04, item.dimensions[2] - 0.04]} />
              <meshStandardMaterial color={item.color} roughness={0.5} map={texture || null} />
            </mesh>

            {/* Glass Showcase (if glass counter) */}
            {isGlass && (
              <group position={[0, item.dimensions[1]/4, 0]}>
                <mesh castShadow receiveShadow position={[0, 0, item.dimensions[2]/2 - 0.01]}>
                  <boxGeometry args={[item.dimensions[0] - 0.04, item.dimensions[1]/2, 0.01]} />
                  <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={1} transparent roughness={0.1} />
                </mesh>
                <mesh castShadow receiveShadow position={[-item.dimensions[0]/2 + 0.01, 0, 0]}>
                  <boxGeometry args={[0.01, item.dimensions[1]/2, item.dimensions[2] - 0.04]} />
                  <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={1} transparent roughness={0.1} />
                </mesh>
                <mesh castShadow receiveShadow position={[item.dimensions[0]/2 - 0.01, 0, 0]}>
                  <boxGeometry args={[0.01, item.dimensions[1]/2, item.dimensions[2] - 0.04]} />
                  <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={1} transparent roughness={0.1} />
                </mesh>
                {/* Middle Glass Shelf */}
                <mesh castShadow receiveShadow position={[0, 0, 0]}>
                  <boxGeometry args={[item.dimensions[0] - 0.04, 0.01, item.dimensions[2] - 0.04]} />
                  <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={1} transparent roughness={0.1} />
                </mesh>
              </group>
            )}

            {/* Back Sliding Doors (Indicated by lines) */}
            <mesh castShadow receiveShadow position={[0, isGlass ? -item.dimensions[1]/4 : 0, -item.dimensions[2]/2 + 0.01]}>
              <boxGeometry args={[item.dimensions[0] - 0.04, isGlass ? item.dimensions[1]/2 : item.dimensions[1] - 0.04, 0.02]} />
              <meshStandardMaterial color="#f3f4f6" roughness={0.5} />
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(item.dimensions[0] - 0.04, isGlass ? item.dimensions[1]/2 : item.dimensions[1] - 0.04, 0.02)]} />
                <lineBasicMaterial color="#d1d5db" linewidth={1} />
              </lineSegments>
              {/* Center line for sliding door split */}
              <mesh position={[0, 0, 0.011]}>
                <boxGeometry args={[0.01, isGlass ? item.dimensions[1]/2 : item.dimensions[1] - 0.04, 0.001]} />
                <meshBasicMaterial color="#d1d5db" />
              </mesh>
            </mesh>
          </group>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      <group
        ref={groupRef}
        position={item.position}
        rotation={item.rotation}
        onClick={(e) => {
          e.stopPropagation();
          selectItem(item.id, e.shiftKey);
        }}
      >
        {renderGeometry()}
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...item.dimensions)]} />
            <lineBasicMaterial color="#ffaa00" linewidth={2} />
          </lineSegments>
        )}
      </group>
      {isSelected && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current || undefined}
          mode="translate"
          space="world"
          translationSnap={0.25}
          rotationSnap={Math.PI / 2}
          showY={viewMode === '3d'}
        />
      )}
    </>
  );
}

function Scene() {
  const { items, selectItem, viewMode, placementMode, setPlacementMode, addItem, addBooth, rotatePlacement, isExporting } = useBuilderStore();
  const { camera } = useThree();
  const [previewPosState, setPreviewPosState] = useState<[number, number, number] | null>(null);
  const previewPosRef = useRef<[number, number, number] | null>(null);

  const setPreviewPos = (pos: [number, number, number] | null) => {
    setPreviewPosState(pos);
    previewPosRef.current = pos;
  };

  useEffect(() => {
    if (viewMode === '2d') {
      camera.position.set(0, 10, 0);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
    }
  }, [viewMode, camera]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.key === 'r' || e.key === 'R') && placementMode) {
        rotatePlacement();
      }
      if (e.code === 'Space' && placementMode) {
        e.preventDefault();
        const pos = previewPosRef.current;
        if (pos) {
          if (placementMode.type === 'booth' && placementMode.boothSize) {
            addBooth(placementMode.boothSize[0], placementMode.boothSize[1], pos, placementMode.rotation?.[1] || 0);
          } else {
            addItem({
              type: placementMode.type as ItemType,
              position: pos,
              rotation: placementMode.rotation || [0, 0, 0],
              dimensions: placementMode.dimensions,
              color: placementMode.color,
              metadata: placementMode.metadata
            });
          }
          setPreviewPos(null);
        }
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedItemIds, removeItem } = useBuilderStore.getState();
        selectedItemIds.forEach(id => removeItem(id));
      }

      // Arrow Key Movement
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const { selectedItemIds, items, updateItem } = useBuilderStore.getState();
        if (selectedItemIds.length > 0) {
          e.preventDefault(); // Prevent scrolling
          const step = e.shiftKey ? 0.1 : 0.01; // Shift for larger steps
          selectedItemIds.forEach(id => {
            const item = items.find(i => i.id === id);
            if (item) {
              const newPos = [...item.position] as [number, number, number];
              if (e.key === 'ArrowUp') newPos[1] += step;
              if (e.key === 'ArrowDown') newPos[1] -= step;
              if (e.key === 'ArrowLeft') newPos[0] -= step;
              if (e.key === 'ArrowRight') newPos[0] += step;
              updateItem(id, { position: newPos });
            }
          });
        }
      }

      // Fine Rotation
      if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') {
        const { selectedItemIds, items, updateItem } = useBuilderStore.getState();
        if (selectedItemIds.length > 0) {
          const angle = Math.PI / 12; // 15 degrees
          const rotationStep = (e.key === 'q' || e.key === 'Q') ? angle : -angle;
          selectedItemIds.forEach(id => {
            const item = items.find(i => i.id === id);
            if (item) {
              const newRot = [...item.rotation] as [number, number, number];
              newRot[1] += rotationStep;
              updateItem(id, { rotation: newRot });
            }
          });
        }
      }

      // Copy, Paste, Cut, Undo, Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          const { selectedItemIds, items, setClipboard } = useBuilderStore.getState();
          if (selectedItemIds.length > 0) {
            const item = items.find(i => i.id === selectedItemIds[0]); // Copy first selected item for now
            if (item) setClipboard(item);
          }
        }
        if (e.key === 'v' || e.key === 'V') {
          const { clipboard, addItem } = useBuilderStore.getState();
          if (clipboard) {
            addItem({ 
              ...clipboard, 
              position: [clipboard.position[0] + 0.5, clipboard.position[1], clipboard.position[2] + 0.5] 
            });
          }
        }
        if (e.key === 'x' || e.key === 'X') {
          const { selectedItemIds, items, setClipboard, removeItem } = useBuilderStore.getState();
          if (selectedItemIds.length > 0) {
            const item = items.find(i => i.id === selectedItemIds[0]);
            if (item) {
              setClipboard(item);
              selectedItemIds.forEach(id => removeItem(id));
            }
          }
        }
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            useBuilderStore.getState().redo();
          } else {
            useBuilderStore.getState().undo();
          }
        }
        if (e.key === 'y' || e.key === 'Y') {
          useBuilderStore.getState().redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placementMode, rotatePlacement, addBooth, addItem]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight castShadow position={[10, 10, 5]} intensity={1} shadow-mapSize={[1024, 1024]} />
      <Environment preset="city" />
      
      {!isExporting && (
        <Grid 
          infiniteGrid 
          fadeDistance={50} 
          sectionColor="#888" 
          cellColor="#ccc" 
          position={[0, 0, 0]} 
        />
      )}
      
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.01, 0]} 
        receiveShadow
        onPointerMove={(e) => {
          if (placementMode) {
            e.stopPropagation();
            let x = Math.round(e.point.x / 0.5) * 0.5;
            let z = Math.round(e.point.z / 0.5) * 0.5;

            if (['sheet', 'beam', 'fascia'].includes(placementMode.type)) {
              const rotY = placementMode.rotation?.[1] || 0;
              const isRotated = Math.abs(Math.round(rotY / (Math.PI / 2)) % 2) === 1;
              
              const widthX = isRotated ? placementMode.dimensions[2] : placementMode.dimensions[0];
              const widthZ = isRotated ? placementMode.dimensions[0] : placementMode.dimensions[2];

              if (widthX >= 0.5) {
                const edgeX = Math.round((e.point.x - widthX / 2) / 0.5) * 0.5;
                x = edgeX + widthX / 2;
              }
              if (widthZ >= 0.5) {
                const edgeZ = Math.round((e.point.z - widthZ / 2) / 0.5) * 0.5;
                z = edgeZ + widthZ / 2;
              }
            }

            setPreviewPos([x, placementMode.defaultY, z]);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (placementMode && previewPosState) {
            if (placementMode.type === 'booth' && placementMode.boothSize) {
              addBooth(placementMode.boothSize[0], placementMode.boothSize[1], previewPosState, placementMode.rotation?.[1] || 0);
            } else {
              addItem({
                type: placementMode.type as ItemType,
                position: previewPosState,
                rotation: placementMode.rotation || [0, 0, 0],
                dimensions: placementMode.dimensions,
                color: placementMode.color,
                metadata: placementMode.metadata
              });
            }
            setPreviewPos(null);
          } else {
            selectItem(null);
          }
        }}
        onPointerOut={() => setPreviewPos(null)}
      >
        <planeGeometry args={[100, 100]} />
        {isExporting ? (
          <meshStandardMaterial color="#ffffff" roughness={0.05} metalness={0.2} />
        ) : (
          <meshStandardMaterial color="#f4f4f5" />
        )}
      </mesh>

      <group>
        {items.map((item) => (
          <BuilderItem key={item.id} item={item} />
        ))}
        {placementMode && previewPosState && (
          <group position={previewPosState} rotation={placementMode.rotation || [0, 0, 0]}>
            {placementMode.type === 'booth' && placementMode.boothSize ? (
              <mesh position={[0, 1.2, 0]}>
                <boxGeometry args={[placementMode.boothSize[0], 2.4, placementMode.boothSize[1]]} />
                <meshStandardMaterial color="#4f46e5" opacity={0.2} transparent />
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(placementMode.boothSize[0], 2.4, placementMode.boothSize[1])]} />
                  <lineBasicMaterial color="#4f46e5" linewidth={2} />
                </lineSegments>
              </mesh>
            ) : (
              <mesh>
                <boxGeometry args={placementMode.dimensions} />
                <meshStandardMaterial 
                  color={['carpet', 'curtain-closed', 'curtain-open', 'door-normal', 'door-folding', 'table', 'chair', 'brochure-stand', 'tv-stand', 'counter-normal', 'counter-glass'].includes(placementMode.type) ? '#4f46e5' : placementMode.color} 
                  opacity={0.5} 
                  transparent 
                />
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(...placementMode.dimensions)]} />
                  <lineBasicMaterial color="#4f46e5" linewidth={2} />
                </lineSegments>
              </mesh>
            )}
          </group>
        )}
      </group>

      <OrbitControls 
        makeDefault 
        enableRotate={viewMode === '3d'}
        enablePan={true}
        enableZoom={true}
        maxPolarAngle={viewMode === '2d' ? 0 : Math.PI / 2}
        minPolarAngle={viewMode === '2d' ? 0 : 0}
      />
    </>
  );
}

export default function BuilderCanvas() {
  const { viewMode, isExporting } = useBuilderStore();

  return (
    <div className="flex-1 h-full bg-gray-50 relative">
      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
        {isExporting && <color attach="background" args={['#ffffff']} />}
        {viewMode === '2d' ? (
          <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={50} near={0.1} far={1000} />
        ) : (
          <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} near={0.1} far={1000} />
        )}
        <Scene />
      </Canvas>
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md shadow-sm text-sm font-medium text-gray-700 pointer-events-none">
        {viewMode === '2d' ? 'Top View (2D)' : 'Perspective View (3D)'}
      </div>
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md shadow-sm text-xs text-gray-500 pointer-events-none">
        Tip: Click to select, drag arrows to move.
      </div>
    </div>
  );
}
