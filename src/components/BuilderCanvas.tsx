import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Environment, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useBuilderStore, Item, ItemType } from '../store';

function BuilderItem({ item }: { item: Item }) {
  const { selectedItemIds, selectItem, updateItem, viewMode, artworks } = useBuilderStore();
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
  }, [artwork?.dataUrl]);

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
    const edges = (
      <lineSegments raycast={() => null}>
        <edgesGeometry args={[new THREE.BoxGeometry(...item.dimensions)]} />
        <lineBasicMaterial color="#000000" linewidth={1} opacity={0.3} transparent />
      </lineSegments>
    );

    const is2DSheet = viewMode === '2d' && item.type === 'sheet';
    const materialColor = is2DSheet ? '#3b82f6' : item.color;

    switch (item.type) {
      case 'sheet':
      case 'fascia':
        const isSeamless = item.printType === 'seamless';
        const zOffset = isSeamless ? 0.022 : 0;
        return (
          <mesh castShadow receiveShadow position={[0, 0, zOffset]}>
            <boxGeometry args={item.dimensions} />
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <meshStandardMaterial 
                key={`${index}-${texture ? texture.uuid : 'no-tex'}`}
                attach={`material-${index}`}
                color={materialColor} 
                map={index === 4 ? (texture || null) : null}
                roughness={0.2} 
                metalness={0.1} 
                side={THREE.DoubleSide} 
                transparent={index === 4 ? !!texture : false}
              />
            ))}
            {edges}
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
  const { items, selectItem, viewMode, placementMode, setPlacementMode, addItem, addBooth, rotatePlacement } = useBuilderStore();
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
              color: placementMode.color
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
      
      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        sectionColor="#888" 
        cellColor="#ccc" 
        position={[0, 0, 0]} 
      />
      
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
                color: placementMode.color
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
        <meshStandardMaterial color="#f4f4f5" />
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
                <meshStandardMaterial color={placementMode.color} opacity={0.5} transparent />
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
  const { viewMode } = useBuilderStore();

  return (
    <div className="flex-1 h-full bg-zinc-100 relative">
      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
        {viewMode === '2d' ? (
          <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={50} near={0.1} far={1000} />
        ) : (
          <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} near={0.1} far={1000} />
        )}
        <Scene />
      </Canvas>
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md shadow-sm text-sm font-medium text-zinc-700 pointer-events-none">
        {viewMode === '2d' ? 'Top View (2D)' : 'Perspective View (3D)'}
      </div>
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md shadow-sm text-xs text-zinc-500 pointer-events-none">
        Tip: Click to select, drag arrows to move.
      </div>
    </div>
  );
}
