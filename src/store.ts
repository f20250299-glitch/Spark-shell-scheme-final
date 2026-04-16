import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type ItemType = 'sheet' | 'extrusion' | 'beam' | 'spotlight' | 'fascia' | 'carpet' | 'curtain-closed' | 'curtain-open' | 'door-normal' | 'door-folding' | 'table' | 'chair' | 'brochure-stand' | 'tv-stand' | 'counter-normal' | 'counter-glass';

export interface Artwork {
  id: string;
  name: string;
  dataUrl: string;
}

export interface Item {
  id: string;
  type: ItemType;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: [number, number, number]; // width, height, depth
  color?: string;
  artworkId?: string;
  artworkSide?: 'front' | 'back' | 'both';
  printType?: 'normal' | 'seamless';
  textureOffset?: [number, number];
  textureRepeat?: [number, number];
  metadata?: any;
}

export interface PlacementMode {
  type: ItemType | 'booth';
  defaultY: number;
  dimensions: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  boothSize?: [number, number];
  metadata?: any;
}

interface BuilderState {
  items: Item[];
  artworks: Artwork[];
  selectedItemIds: string[];
  viewMode: '2d' | '3d';
  isExporting: boolean;
  placementMode: PlacementMode | null;
  clipboard: Item | null;
  history: Item[][];
  historyIndex: number;
  setClipboard: (item: Item | null) => void;
  undo: () => void;
  redo: () => void;
  saveHistory: (newItems: Item[]) => void;
  setPlacementMode: (mode: PlacementMode | null) => void;
  rotatePlacement: () => void;
  addItem: (item: Omit<Item, 'id'>) => void;
  addBooth: (width: number, depth: number, centerPos: [number, number, number], rotationY: number) => void;
  generateLayout: (text: string) => boolean;
  updateItem: (id: string, updates: Partial<Item>) => void;
  removeItem: (id: string) => void;
  addArtwork: (artwork: Artwork) => void;
  removeArtwork: (id: string) => void;
  applyArtworkToPanels: (itemIds: string[], artworkId: string) => void;
  selectItem: (id: string | null, multi?: boolean) => void;
  setViewMode: (mode: '2d' | '3d') => void;
  setIsExporting: (isExporting: boolean) => void;
  rotateSelectedItem: () => void;
  clearAll: () => void;
}

const createBoothItems = (width: number, depth: number, centerPos: [number, number, number], rotationY: number): Item[] => {
  const newItems: Item[] = [];
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  const add = (type: ItemType, localPos: [number, number, number], localRot: [number, number, number], dimensions: [number, number, number], color: string) => {
    const rx = localPos[0] * cos - localPos[2] * sin;
    const rz = localPos[0] * sin + localPos[2] * cos;
    const worldPos: [number, number, number] = [
      centerPos[0] + rx,
      centerPos[1] + localPos[1],
      centerPos[2] + rz
    ];
    const worldRot: [number, number, number] = [
      localRot[0],
      localRot[1] + rotationY,
      localRot[2]
    ];
    newItems.push({ id: uuidv4(), type, position: worldPos, rotation: worldRot, dimensions, color });
  };

  const panelColor = '#ffffff';
  const metalColor = '#c0c0c0';

  // Back wall (z = -depth/2)
  for (let i = 0; i < width; i++) {
    const x = -width / 2 + 0.5 + i;
    add('sheet', [x, 1.2, -depth / 2], [0, 0, 0], [1, 2.4, 0.01], panelColor);
    add('beam', [x, 2.4, -depth / 2], [0, 0, 0], [1, 0.04, 0.04], metalColor); // Top beam
    add('beam', [x, 0.02, -depth / 2], [0, 0, 0], [1, 0.04, 0.04], metalColor); // Bottom beam
  }
  // Back wall extrusions
  for (let i = 0; i <= width; i++) {
    const x = -width / 2 + i;
    add('extrusion', [x, 1.2, -depth / 2], [0, 0, 0], [0.04, 2.4, 0.04], metalColor);
  }

  // Left wall (x = -width/2)
  for (let i = 0; i < depth; i++) {
    const z = -depth / 2 + 0.5 + i;
    add('sheet', [-width / 2, 1.2, z], [0, Math.PI / 2, 0], [1, 2.4, 0.01], panelColor);
    add('beam', [-width / 2, 2.4, z], [0, Math.PI / 2, 0], [1, 0.04, 0.04], metalColor);
    add('beam', [-width / 2, 0.02, z], [0, Math.PI / 2, 0], [1, 0.04, 0.04], metalColor);
  }
  // Left wall extrusions (skip corner as it's shared with back wall)
  for (let i = 1; i <= depth; i++) {
    const z = -depth / 2 + i;
    add('extrusion', [-width / 2, 1.2, z], [0, 0, 0], [0.04, 2.4, 0.04], metalColor);
  }

  // Right wall (x = width/2)
  for (let i = 0; i < depth; i++) {
    const z = -depth / 2 + 0.5 + i;
    add('sheet', [width / 2, 1.2, z], [0, Math.PI / 2, 0], [1, 2.4, 0.01], panelColor);
    add('beam', [width / 2, 2.4, z], [0, Math.PI / 2, 0], [1, 0.04, 0.04], metalColor);
    add('beam', [width / 2, 0.02, z], [0, Math.PI / 2, 0], [1, 0.04, 0.04], metalColor);
  }
  // Right wall extrusions
  for (let i = 1; i <= depth; i++) {
    const z = -depth / 2 + i;
    add('extrusion', [width / 2, 1.2, z], [0, 0, 0], [0.04, 2.4, 0.04], metalColor);
  }

  // Front fascia beam
  let currentX = -width / 2;
  let remainingWidth = width;
  while (remainingWidth > 0) {
    const chunkWidth = Math.min(3, remainingWidth);
    const centerX = currentX + chunkWidth / 2;
    add('beam', [centerX, 2.4, depth / 2], [0, 0, 0], [chunkWidth, 0.04, 0.04], metalColor);
    
    currentX += chunkWidth;
    remainingWidth -= chunkWidth;
    
    if (remainingWidth > 0) {
      add('extrusion', [currentX, 1.2, depth / 2], [0, 0, 0], [0.04, 2.4, 0.04], metalColor);
    }
  }

  return newItems;
};

const deduplicateItems = (existingItems: Item[], newItems: Item[]): Item[] => {
  const uniqueItems: Item[] = [];
  for (const item of newItems) {
    const isDuplicate = [...existingItems, ...uniqueItems].some(existing => {
      if (existing.type !== item.type) return false;
      
      const posMatch = 
        Math.abs(existing.position[0] - item.position[0]) < 0.01 &&
        Math.abs(existing.position[1] - item.position[1]) < 0.01 &&
        Math.abs(existing.position[2] - item.position[2]) < 0.01;
      
      if (!posMatch) return false;

      const dimMatch = 
        Math.abs(existing.dimensions[0] - item.dimensions[0]) < 0.01 &&
        Math.abs(existing.dimensions[1] - item.dimensions[1]) < 0.01 &&
        Math.abs(existing.dimensions[2] - item.dimensions[2]) < 0.01;

      if (!dimMatch) return false;

      const rot1Y = existing.rotation?.[1] || 0;
      const rot2Y = item.rotation?.[1] || 0;
      
      const normalizeAngle = (a: number) => {
        let normalized = a % Math.PI;
        if (normalized < 0) normalized += Math.PI;
        if (Math.abs(normalized - Math.PI) < 0.01) normalized = 0;
        return normalized;
      };

      const n1 = normalizeAngle(rot1Y);
      const n2 = normalizeAngle(rot2Y);
      
      const diff = Math.abs(n1 - n2);
      return diff < 0.01 || Math.abs(diff - Math.PI) < 0.01;
    });

    if (!isDuplicate) {
      uniqueItems.push(item);
    }
  }
  return uniqueItems;
};

export const useBuilderStore = create<BuilderState>((set) => ({
  items: [],
  artworks: [],
  selectedItemIds: [],
  viewMode: '3d',
  isExporting: false,
  placementMode: null,
  clipboard: null,
  history: [[]],
  historyIndex: 0,
  setClipboard: (item) => set({ clipboard: item }),
  saveHistory: (newItems) => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newItems);
    return { items: newItems, history: newHistory, historyIndex: newHistory.length - 1 };
  }),
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return { items: state.history[newIndex], historyIndex: newIndex, selectedItemIds: [] };
    }
    return state;
  }),
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return { items: state.history[newIndex], historyIndex: newIndex, selectedItemIds: [] };
    }
    return state;
  }),
  setPlacementMode: (mode) => set({ placementMode: mode, selectedItemIds: [] }),
  rotatePlacement: () => set((state) => {
    if (!state.placementMode) return state;
    return {
      placementMode: {
        ...state.placementMode,
        rotation: [
          state.placementMode.rotation?.[0] || 0,
          (state.placementMode.rotation?.[1] || 0) + Math.PI / 2,
          state.placementMode.rotation?.[2] || 0
        ]
      }
    };
  }),
  addItem: (item) => set((state) => {
    const itemsToAdd: Item[] = [];
    
    if ((item.type === 'beam' || item.type === 'fascia') && item.dimensions[0] > 3) {
      let remainingWidth = item.dimensions[0];
      let processedWidth = 0;
      const rotY = item.rotation?.[1] || 0;
      const cos = Math.cos(rotY);
      const sin = Math.sin(rotY);
      
      while (remainingWidth > 0) {
        const chunkWidth = Math.min(3, remainingWidth);
        const localCenterX = -item.dimensions[0] / 2 + processedWidth + chunkWidth / 2;
        
        const worldX = item.position[0] + localCenterX * cos;
        const worldZ = item.position[2] - localCenterX * sin;
        
        itemsToAdd.push({
          ...item,
          id: uuidv4(),
          position: [worldX, item.position[1], worldZ],
          dimensions: [chunkWidth, item.dimensions[1], item.dimensions[2]]
        });
        
        processedWidth += chunkWidth;
        remainingWidth -= chunkWidth;
        
        if (remainingWidth > 0 && item.type === 'beam') {
          const extLocalX = -item.dimensions[0] / 2 + processedWidth;
          const extWorldX = item.position[0] + extLocalX * cos;
          const extWorldZ = item.position[2] - extLocalX * sin;
          
          itemsToAdd.push({
            id: uuidv4(),
            type: 'extrusion',
            position: [extWorldX, 1.2, extWorldZ],
            rotation: [0, 0, 0],
            dimensions: [0.04, 2.4, 0.04],
            color: '#c0c0c0'
          });
        }
      }
    } else {
      itemsToAdd.push({ ...item, id: uuidv4() });
    }

    const newItems = [...state.items, ...itemsToAdd];
    
    // Auto-add extrusions for sheets
    if (item.type === 'sheet') {
      const width = item.dimensions[0];
      const rotSteps = Math.round((item.rotation?.[1] || 0) / (Math.PI / 2));
      const isRotated = Math.abs(rotSteps % 2) === 1;
      
      const ext1Pos = isRotated 
        ? [item.position[0], 1.2, item.position[2] - width/2] 
        : [item.position[0] - width/2, 1.2, item.position[2]];
      const ext2Pos = isRotated 
        ? [item.position[0], 1.2, item.position[2] + width/2] 
        : [item.position[0] + width/2, 1.2, item.position[2]];

      const addExtrusionIfMissing = (pos: number[]) => {
        const exists = newItems.some(i => 
          i.type === 'extrusion' && 
          Math.abs(i.position[0] - pos[0]) < 0.1 && 
          Math.abs(i.position[2] - pos[2]) < 0.1
        );
        if (!exists) {
          newItems.push({
            id: uuidv4(),
            type: 'extrusion',
            position: pos as [number, number, number],
            rotation: [0, 0, 0],
            dimensions: [0.04, 2.4, 0.04],
            color: '#c0c0c0'
          });
        }
      };

      addExtrusionIfMissing(ext1Pos);
      addExtrusionIfMissing(ext2Pos);
    }

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newItems);
    return { items: newItems, history: newHistory, historyIndex: newHistory.length - 1, placementMode: null };
  }),
  addBooth: (width, depth, centerPos, rotationY) => set((state) => {
    const newItems = createBoothItems(width, depth, centerPos, rotationY);
    const uniqueNewItems = deduplicateItems(state.items, newItems);
    const combinedItems = [...state.items, ...uniqueNewItems];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(combinedItems);
    return { items: combinedItems, history: newHistory, historyIndex: newHistory.length - 1, placementMode: null };
  }),
  generateLayout: (text) => {
    const match = text.match(/(\d+)\s*(?:booths?\s*)?(?:of\s*)?(\d+)\s*[xX*]\s*(\d+)/i);
    if (!match) return false;

    const count = parseInt(match[1]);
    const w = parseInt(match[2]);
    const d = parseInt(match[3]);
    const isBackToBack = text.toLowerCase().includes('back');

    set((state) => {
      const newItems: Item[] = [];
      if (isBackToBack) {
        const cols = Math.ceil(count / 2);
        const startX = -((cols - 1) * w) / 2;
        for (let i = 0; i < count; i++) {
          const row = i % 2; // 0 for front, 1 for back
          const col = Math.floor(i / 2);
          const x = startX + col * w;
          const z = row === 0 ? d / 2 : -d / 2;
          const rotY = row === 0 ? 0 : Math.PI;
          newItems.push(...createBoothItems(w, d, [x, 0, z], rotY));
        }
      } else {
        const startX = -((count - 1) * w) / 2;
        for (let i = 0; i < count; i++) {
          const x = startX + i * w;
          newItems.push(...createBoothItems(w, d, [x, 0, 0], 0));
        }
      }
      
      const uniqueNewItems = deduplicateItems(state.items, newItems);
      const combinedItems = [...state.items, ...uniqueNewItems];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(combinedItems);
      return { items: combinedItems, history: newHistory, historyIndex: newHistory.length - 1 };
    });
    return true;
  },
  updateItem: (id, updates) => set((state) => {
    const newItems = state.items.map((item) => item.id === id ? { ...item, ...updates } : item);
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newItems);
    return { items: newItems, history: newHistory, historyIndex: newHistory.length - 1 };
  }),
  removeItem: (id) => set((state) => {
    const newItems = state.items.filter((item) => item.id !== id);
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newItems);
    return {
      items: newItems,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedItemIds: state.selectedItemIds.filter(i => i !== id)
    };
  }),
  addArtwork: (artwork) => set((state) => ({
    artworks: [...state.artworks, artwork]
  })),
  removeArtwork: (id) => set((state) => {
    const newItems = state.items.map((item) => item.artworkId === id ? { ...item, artworkId: undefined, printType: undefined } : item);
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newItems);
    return {
      artworks: state.artworks.filter((a) => a.id !== id),
      items: newItems,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),
  applyArtworkToPanels: (itemIds, artworkId) => set((state) => {
    const panels = state.items.filter(i => itemIds.includes(i.id) && (i.type === 'sheet' || i.type === 'fascia'));
    if (panels.length === 0) return state;

    if (panels.length === 1) {
      const newItems = state.items.map(item => 
        item.id === panels[0].id ? { ...item, artworkId, textureOffset: undefined, textureRepeat: undefined } : item
      );
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newItems);
      return { items: newItems, history: newHistory, historyIndex: newHistory.length - 1 };
    }

    const refRot = panels[0].rotation[1];
    const dirX = Math.cos(refRot);
    const dirZ = -Math.sin(refRot);

    const projected = panels.map(p => {
      const proj = p.position[0] * dirX + p.position[2] * dirZ;
      return { ...p, proj };
    });

    projected.sort((a, b) => a.proj - b.proj);

    let minProj = projected[0].proj - projected[0].dimensions[0] / 2;
    let maxProj = projected[projected.length - 1].proj + projected[projected.length - 1].dimensions[0] / 2;
    const totalWidth = maxProj - minProj;

    const newItems = state.items.map(item => {
      const p = projected.find(proj => proj.id === item.id);
      if (p) {
        const panelStart = p.proj - p.dimensions[0] / 2;
        const offsetX = (panelStart - minProj) / totalWidth;
        const repeatX = p.dimensions[0] / totalWidth;
        return { 
          ...item, 
          artworkId, 
          textureOffset: [offsetX, 0] as [number, number], 
          textureRepeat: [repeatX, 1] as [number, number] 
        };
      }
      return item;
    });

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newItems);
    return { items: newItems, history: newHistory, historyIndex: newHistory.length - 1 };
  }),
  selectItem: (id, multi) => set((state) => {
    if (!id) return { selectedItemIds: [] };
    if (multi) {
      const exists = state.selectedItemIds.includes(id);
      return { selectedItemIds: exists ? state.selectedItemIds.filter(i => i !== id) : [...state.selectedItemIds, id] };
    }
    return { selectedItemIds: [id] };
  }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setIsExporting: (isExporting) => set({ isExporting }),
  rotateSelectedItem: () => set((state) => {
    if (state.selectedItemIds.length === 0) return state;
    const newItems = state.items.map((item) => {
      if (state.selectedItemIds.includes(item.id)) {
        return {
          ...item,
          rotation: [
            item.rotation[0],
            item.rotation[1] + Math.PI / 2,
            item.rotation[2]
          ] as [number, number, number]
        };
      }
      return item;
    });
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newItems);
    return { items: newItems, history: newHistory, historyIndex: newHistory.length - 1 };
  }),
  clearAll: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push([]);
    return { items: [], history: newHistory, historyIndex: newHistory.length - 1, selectedItemIds: [] };
  })
}));
