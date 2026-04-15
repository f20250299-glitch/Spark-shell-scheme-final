import React, { useState, useRef } from 'react';
import { useBuilderStore } from '../store';
import { Box, Columns, Lightbulb, Square, Trash2, View, Download, RotateCw, LayoutGrid, Type, Wand2, Upload, Save, FolderOpen, Monitor, BookOpen, Coffee, Tv } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import PdfCropper from './PdfCropper';
import { HexColorPicker } from 'react-colorful';

export default function Sidebar() {
  const { setPlacementMode, placementMode, addBooth, selectedItemIds, removeItem, viewMode, setViewMode, rotateSelectedItem, rotatePlacement, clearAll, generateLayout, artworks, addArtwork, removeArtwork, items, updateItem, applyArtworkToPanels } = useBuilderStore();
  const [layoutText, setLayoutText] = useState('');
  const [layoutError, setLayoutError] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customWidth, setCustomWidth] = useState('1');
  const [customHeight, setCustomHeight] = useState('2.4');
  const [customDepth, setCustomDepth] = useState('3');

  const selectedItem = selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) : null;
  const selectedPanels = items.filter(i => selectedItemIds.includes(i.id) && (i.type === 'sheet' || i.type === 'fascia' || i.type === 'counter-normal' || i.type === 'counter-glass'));
  const commonArtworkId = selectedPanels.length > 0 && selectedPanels.every(p => p.artworkId === selectedPanels[0].artworkId) 
    ? (selectedPanels[0].artworkId || '') 
    : '';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setPdfFile(file);
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
      return;
    }

    if (file.name.toLowerCase().endsWith('.ai')) {
      alert('AI files cannot be previewed directly in the browser. Please export as PDF or JPG/PNG to extract artworks.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        addArtwork({
          id: uuidv4(),
          name: file.name,
          dataUrl: event.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExtractArtwork = (dataUrl: string, name: string) => {
    addArtwork({
      id: uuidv4(),
      name,
      dataUrl
    });
  };

  const handleSaveProject = () => {
    const projectData = {
      items,
      artworks
    };
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spark-project.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.items && data.artworks) {
          useBuilderStore.setState({ items: data.items, artworks: data.artworks, selectedItemIds: [] });
        }
      } catch (error) {
        console.error('Failed to load project', error);
        alert('Invalid project file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = () => {
    if (!layoutText.trim()) return;
    const success = generateLayout(layoutText);
    if (success) {
      setLayoutText('');
      setLayoutError(false);
    } else {
      setLayoutError(true);
    }
  };

  const handleAddSheet = (width: number, height: number = 2.4) => {
    setPlacementMode({
      type: 'sheet',
      defaultY: height / 2, // Center at y=height/2
      rotation: [0, 0, 0],
      dimensions: [width, height, 0.01], // width, height, depth
      color: '#ffffff'
    });
  };

  const handleAddExtrusion = (height: number = 2.4) => {
    setPlacementMode({
      type: 'extrusion',
      defaultY: height / 2,
      rotation: [0, 0, 0],
      dimensions: [0.04, height, 0.04], // 4cm x 4cm x height
      color: '#c0c0c0'
    });
  };

  const handleAddBeam = (length: number) => {
    setPlacementMode({
      type: 'beam',
      defaultY: 2.4, // Place at top by default
      rotation: [0, 0, 0],
      dimensions: [length, 0.04, 0.04],
      color: '#c0c0c0'
    });
  };

  const handleAddFascia = (length: number, height: number = 0.3) => {
    setPlacementMode({
      type: 'fascia',
      defaultY: 2.4 - (height / 2), // Placed near the top
      rotation: [0, 0, 0],
      dimensions: [length, height, 0.02],
      color: '#ffffff'
    });
  };

  const handleAddSpotlight = () => {
    setPlacementMode({
      type: 'spotlight',
      defaultY: 2.4,
      rotation: [0, 0, 0],
      dimensions: [0.1, 0.1, 0.1],
      color: '#333333'
    });
  };

  const handleAddCarpet = (width: number = 3, depth: number = 3) => {
    setPlacementMode({
      type: 'carpet',
      defaultY: 0.005,
      rotation: [0, 0, 0],
      dimensions: [width, 0.01, depth],
      color: '#e2e8f0' // light gray default
    });
  };

  const handleAddCurtain = (isOpen: boolean) => {
    setPlacementMode({
      type: isOpen ? 'curtain-open' : 'curtain-closed',
      defaultY: 1.05, // 2.1 / 2
      rotation: [0, 0, 0],
      dimensions: [1, 2.1, 0.05], // 2.1m height to fit under 0.3m fascia
      color: '#ffffff'
    });
  };

  const handleAddDoor = (isFolding: boolean) => {
    setPlacementMode({
      type: isFolding ? 'door-folding' : 'door-normal',
      defaultY: 1.05, // 2.1 / 2
      rotation: [0, 0, 0],
      dimensions: [1, 2.1, 0.05], // 2.1m height to fit under 0.3m fascia
      color: '#ffffff'
    });
  };

  const handleAddTable = () => {
    setPlacementMode({
      type: 'table',
      defaultY: 0.375, // 0.75 height / 2
      rotation: [0, 0, 0],
      dimensions: [1.2, 0.75, 1.2], // 120cm diameter, 75cm height
      color: '#ffffff'
    });
  };

  const handleAddChair = () => {
    setPlacementMode({
      type: 'chair',
      defaultY: 0.4, // 0.8 height / 2
      rotation: [0, 0, 0],
      dimensions: [0.5, 0.8, 0.5], // 50x50cm footprint, 80cm height
      color: '#ffffff'
    });
  };

  const handleAddBrochureStand = () => {
    setPlacementMode({
      type: 'brochure-stand',
      defaultY: 0.75, // 1.5 height / 2
      rotation: [0, 0, 0],
      dimensions: [0.3, 1.5, 0.4], // 30cm wide, 1.5m tall, 40cm deep
      color: '#c0c0c0'
    });
  };

  const handleAddTvStand = (size: number) => {
    setPlacementMode({
      type: 'tv-stand',
      defaultY: 0.9, // 1.8 height / 2
      rotation: [0, 0, 0],
      dimensions: [0.8, 1.8, 0.6], // Stand dimensions
      color: '#333333',
      metadata: { tvSize: size }
    });
  };

  const handleAddCounter = (isGlass: boolean) => {
    setPlacementMode({
      type: isGlass ? 'counter-glass' : 'counter-normal',
      defaultY: 0.5, // 1m height / 2
      rotation: [0, 0, 0],
      dimensions: [1, 1, 0.5], // 1m wide, 1m high, 0.5m deep
      color: '#ffffff'
    });
  };

  const handleExport = () => {
    useBuilderStore.getState().setIsExporting(true);
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `shell-scheme-${viewMode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      useBuilderStore.getState().setIsExporting(false);
    }, 100);
  };

  return (
    <div className="w-64 bg-white text-gray-900 h-full flex flex-col border-r border-gray-200 shrink-0">
      <div className="p-4 border-b border-gray-200">
        <img src="/spark-logo.svg" alt="Spark Innovations" className="h-8 mb-3" />
        <h1 className="text-xl font-bold tracking-tight">3D Builder</h1>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSaveProject} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors text-xs">
            <Save size={14} /> Save
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors text-xs cursor-pointer">
            <FolderOpen size={14} /> Load
            <input type="file" className="hidden" accept=".json" onChange={handleLoadProject} ref={fileInputRef} />
          </label>
        </div>
      </div>

      {placementMode && (
        <div className="p-4 bg-indigo-50 border-b border-indigo-200">
          <h3 className="text-sm font-medium text-indigo-700 mb-2">Placement Mode Active</h3>
          <p className="text-xs text-gray-500 mb-3">Hover over the grid to preview. Click or press Spacebar to place. Press 'R' to rotate.</p>
          <div className="flex gap-2">
            <button onClick={rotatePlacement} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors text-xs">
              <RotateCw size={14} /> Rotate
            </button>
            <button onClick={() => setPlacementMode(null)} className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">View Mode</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-colors ${viewMode === '2d' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <View size={16} /> 2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-colors ${viewMode === '3d' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Box size={16} /> 3D
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Layout Generator</h2>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={layoutText}
                onChange={(e) => { setLayoutText(e.target.value); setLayoutError(false); }}
                placeholder="e.g. 10 3x3 back to back"
                className={`flex-1 bg-gray-100 border ${layoutError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500`}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button 
                onClick={handleGenerate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                title="Generate Layout"
              >
                <Wand2 size={18} />
              </button>
            </div>
            {layoutError && (
              <p className="text-xs text-red-600">Format not recognized. Try "10 3x3 in line" or "10 3x3 back to back".</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pre-built Booths</h2>
          <div className="space-y-2">
            <button onClick={() => setPlacementMode({ type: 'booth', boothSize: [3, 3], defaultY: 0, dimensions: [3, 2.4, 3], color: '#4f46e5' })} className="w-full flex items-center gap-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-3 rounded-lg transition-colors text-sm text-left border border-indigo-200">
              <LayoutGrid size={18} />
              3x3 Booth
            </button>
            <button onClick={() => setPlacementMode({ type: 'booth', boothSize: [2, 3], defaultY: 0, dimensions: [2, 2.4, 3], color: '#4f46e5' })} className="w-full flex items-center gap-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-3 rounded-lg transition-colors text-sm text-left border border-indigo-200">
              <LayoutGrid size={18} />
              2x3 Booth
            </button>
            <button onClick={() => setPlacementMode({ type: 'booth', boothSize: [2, 2], defaultY: 0, dimensions: [2, 2.4, 2], color: '#4f46e5' })} className="w-full flex items-center gap-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-3 rounded-lg transition-colors text-sm text-left border border-indigo-200">
              <LayoutGrid size={18} />
              2x2 Booth
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Custom Sizes</h2>
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex gap-2 text-xs text-gray-500 mb-1">
              <div className="flex-1">Width (m)</div>
              <div className="flex-1">Height (m)</div>
              <div className="flex-1">Depth (m)</div>
            </div>
            <div className="flex gap-2 mb-3">
              <input 
                type="number" 
                value={customWidth} 
                onChange={(e) => setCustomWidth(e.target.value)}
                className="flex-1 w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                step="0.1"
              />
              <input 
                type="number" 
                value={customHeight} 
                onChange={(e) => setCustomHeight(e.target.value)}
                className="flex-1 w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                step="0.1"
              />
              <input 
                type="number" 
                value={customDepth} 
                onChange={(e) => setCustomDepth(e.target.value)}
                className="flex-1 w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                step="0.1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleAddSheet(parseFloat(customWidth) || 1, parseFloat(customHeight) || 2.4)} className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 p-2 rounded transition-colors text-xs">
                <Square size={14} /> Panel
              </button>
              <button onClick={() => handleAddFascia(parseFloat(customWidth) || 1, parseFloat(customHeight) || 0.3)} className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 p-2 rounded transition-colors text-xs">
                <Type size={14} /> Fascia
              </button>
              <button onClick={() => handleAddBeam(parseFloat(customWidth) || 1)} className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 p-2 rounded transition-colors text-xs">
                <Box size={14} /> Beam
              </button>
              <button onClick={() => handleAddExtrusion(parseFloat(customHeight) || 2.4)} className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 p-2 rounded transition-colors text-xs">
                <Columns size={14} /> Extrusion
              </button>
              <button onClick={() => handleAddCarpet(parseFloat(customWidth) || 3, parseFloat(customDepth) || 3)} className="col-span-2 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 p-2 rounded transition-colors text-xs">
                <Square size={14} /> Custom Carpet
              </button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Panels (2.4m H)</h2>
          <div className="space-y-2">
            <button onClick={() => handleAddSheet(1)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-gray-500" />
              1m Width Panel
            </button>
            <button onClick={() => handleAddSheet(0.5)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-gray-500" />
              0.5m Width Panel
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Structure</h2>
          <div className="space-y-2">
            <button onClick={() => handleAddExtrusion()} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Columns size={18} className="text-gray-500" />
              Extrusion (2.4m)
            </button>
            <button onClick={() => handleAddBeam(1)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-gray-500" />
              Beam (1m)
            </button>
            <button onClick={() => handleAddBeam(0.5)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-gray-500" />
              Beam (0.5m)
            </button>
            <button onClick={() => handleAddBeam(2)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-gray-500" />
              Beam (2m)
            </button>
            <button onClick={() => handleAddBeam(3)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-gray-500" />
              Beam (3m)
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fascia Boards</h2>
          <div className="space-y-2">
            <button onClick={() => handleAddFascia(1)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Type size={18} className="text-gray-500" />
              Fascia (1m)
            </button>
            <button onClick={() => handleAddFascia(2)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Type size={18} className="text-gray-500" />
              Fascia (2m)
            </button>
            <button onClick={() => handleAddFascia(3)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Type size={18} className="text-gray-500" />
              Fascia (3m)
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Accessories</h2>
          <div className="space-y-2">
            <button onClick={handleAddSpotlight} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Lightbulb size={18} className="text-gray-500" />
              Spotlight
            </button>
            <button onClick={() => handleAddCarpet()} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-gray-500" />
              Carpet (3x3m)
            </button>
            <button onClick={() => handleAddCurtain(false)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-gray-500" />
              Closed Curtain (1m)
            </button>
            <button onClick={() => handleAddCurtain(true)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Columns size={18} className="text-gray-500" />
              Open Curtain (1m)
            </button>
            <button onClick={() => handleAddDoor(false)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-gray-500" />
              Normal Door (1m)
            </button>
            <button onClick={() => handleAddDoor(true)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Columns size={18} className="text-gray-500" />
              Folding Door (1m)
            </button>
            <button onClick={handleAddTable} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Coffee size={18} className="text-gray-500" />
              Table (120cm)
            </button>
            <button onClick={handleAddChair} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-gray-500" />
              Chair
            </button>
            <button onClick={handleAddBrochureStand} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <BookOpen size={18} className="text-gray-500" />
              Brochure Stand
            </button>
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-gray-100 border-none text-sm p-3 rounded-lg text-gray-700"
                onChange={(e) => handleAddTvStand(Number(e.target.value))}
                defaultValue=""
              >
                <option value="" disabled>Add TV Stand...</option>
                <option value="32">32" TV Stand</option>
                <option value="42">42" TV Stand</option>
                <option value="50">50" TV Stand</option>
                <option value="55">55" TV Stand</option>
                <option value="65">65" TV Stand</option>
              </select>
            </div>
            <button onClick={() => handleAddCounter(false)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-gray-500" />
              Counter (Normal)
            </button>
            <button onClick={() => handleAddCounter(true)} className="w-full flex items-center gap-3 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-gray-500" />
              Counter (Glass)
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Artworks & Graphics</h2>
          <div className="space-y-2">
            <label className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors text-sm cursor-pointer border border-dashed border-gray-300">
              <Upload size={16} /> Upload Artwork
              <input type="file" className="hidden" accept="image/*,.pdf,.ai" onChange={handleFileUpload} />
            </label>
            {artworks.map(art => (
              <div key={art.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs text-gray-700">
                <span className="truncate max-w-[150px]" title={art.name}>{art.name}</span>
                <button onClick={() => removeArtwork(art.id)} className="text-red-600 hover:text-red-300"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedItem && ['carpet', 'curtain-closed', 'curtain-open', 'door-normal', 'door-folding', 'table', 'chair', 'brochure-stand', 'tv-stand', 'counter-normal', 'counter-glass'].includes(selectedItem.type) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3 capitalize">
            {selectedItem.type.replace('-', ' ')} Properties
          </h3>
          <div className="flex flex-col items-center">
            <label className="text-xs text-gray-500 block mb-2 w-full text-left">Color</label>
            <HexColorPicker 
              color={selectedItem.color || '#e2e8f0'} 
              onChange={(color) => updateItem(selectedItem.id, { color })}
              style={{ width: '100%', height: '150px' }}
            />
            <div className="mt-3 flex items-center gap-2 w-full">
              <div 
                className="w-6 h-6 rounded border border-gray-300" 
                style={{ backgroundColor: selectedItem.color || '#e2e8f0' }}
              />
              <input 
                type="text" 
                value={selectedItem.color || '#e2e8f0'}
                onChange={(e) => updateItem(selectedItem.id, { color: e.target.value })}
                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {selectedPanels.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {selectedPanels.length === 1 ? 'Panel Properties' : `Multi-Panel Properties (${selectedPanels.length})`}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Apply Artwork</label>
              <select 
                className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                value={commonArtworkId}
                onChange={(e) => {
                  if (e.target.value) {
                    applyArtworkToPanels(selectedItemIds, e.target.value);
                  } else {
                    selectedItemIds.forEach(id => updateItem(id, { artworkId: undefined, textureOffset: undefined, textureRepeat: undefined }));
                  }
                }}
              >
                <option value="">None (Plain Color)</option>
                {artworks.map(art => (
                  <option key={art.id} value={art.id}>{art.name}</option>
                ))}
              </select>
            </div>
            {selectedPanels.length === 1 && selectedPanels[0].artworkId && (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Print Side</label>
                  <div className="flex bg-white rounded p-1">
                    <button 
                      onClick={() => updateItem(selectedPanels[0].id, { artworkSide: 'front' })}
                      className={`flex-1 text-xs py-1 rounded ${(!selectedPanels[0].artworkSide || selectedPanels[0].artworkSide === 'front') ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >Front</button>
                    <button 
                      onClick={() => updateItem(selectedPanels[0].id, { artworkSide: 'back' })}
                      className={`flex-1 text-xs py-1 rounded ${selectedPanels[0].artworkSide === 'back' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >Back</button>
                    <button 
                      onClick={() => updateItem(selectedPanels[0].id, { artworkSide: 'both' })}
                      className={`flex-1 text-xs py-1 rounded ${selectedPanels[0].artworkSide === 'both' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >Both</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Print Style</label>
                  <div className="flex bg-white rounded p-1">
                    <button 
                      onClick={() => updateItem(selectedPanels[0].id, { printType: 'normal' })}
                      className={`flex-1 text-xs py-1 rounded ${selectedPanels[0].printType !== 'seamless' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >Normal</button>
                    <button 
                      onClick={() => updateItem(selectedPanels[0].id, { printType: 'seamless' })}
                      className={`flex-1 text-xs py-1 rounded ${selectedPanels[0].printType === 'seamless' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >Seamless</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors text-sm mb-4">
          <Download size={16} /> Export Image
        </button>
        {selectedItemIds.length > 0 && (
          <>
            <button onClick={rotateSelectedItem} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors text-sm">
              <RotateCw size={16} /> Rotate 90°
            </button>
            <button onClick={() => selectedItemIds.forEach(id => removeItem(id))} className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors text-sm mb-2">
              <Trash2 size={16} /> Delete Selected
            </button>
          </>
        )}
        <button onClick={clearAll} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors text-sm">
          Clear All
        </button>
      </div>

      {pdfFile && (
        <PdfCropper 
          file={pdfFile} 
          onClose={() => setPdfFile(null)} 
          onExtract={handleExtractArtwork} 
        />
      )}
    </div>
  );
}
