import React, { useState } from 'react';
import { useBuilderStore } from '../store';
import { Box, Columns, Lightbulb, Square, Trash2, View, Download, RotateCw, LayoutGrid, Type, Wand2, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import PdfCropper from './PdfCropper';

export default function Sidebar() {
  const { setPlacementMode, placementMode, addBooth, selectedItemIds, removeItem, viewMode, setViewMode, rotateSelectedItem, rotatePlacement, clearAll, generateLayout, artworks, addArtwork, removeArtwork, items, updateItem, applyArtworkToPanels } = useBuilderStore();
  const [layoutText, setLayoutText] = useState('');
  const [layoutError, setLayoutError] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const selectedItem = selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) : null;
  const selectedPanels = items.filter(i => selectedItemIds.includes(i.id) && (i.type === 'sheet' || i.type === 'fascia'));
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

  const handleAddSheet = (width: number) => {
    setPlacementMode({
      type: 'sheet',
      defaultY: 1.2, // Center at y=1.2 (half of 2.4m height)
      rotation: [0, 0, 0],
      dimensions: [width, 2.4, 0.01], // width, height, depth
      color: '#ffffff'
    });
  };

  const handleAddExtrusion = () => {
    setPlacementMode({
      type: 'extrusion',
      defaultY: 1.2,
      rotation: [0, 0, 0],
      dimensions: [0.04, 2.4, 0.04], // 4cm x 4cm x 2.4m
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

  const handleAddFascia = (length: number) => {
    setPlacementMode({
      type: 'fascia',
      defaultY: 2.25, // Placed near the top
      rotation: [0, 0, 0],
      dimensions: [length, 0.3, 0.02],
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

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `shell-scheme-${viewMode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="w-64 bg-zinc-900 text-zinc-100 h-full flex flex-col border-r border-zinc-800 shrink-0">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight">Shell Scheme Builder</h1>
      </div>

      {placementMode && (
        <div className="p-4 bg-indigo-900/20 border-b border-indigo-500/30">
          <h3 className="text-sm font-medium text-indigo-300 mb-2">Placement Mode Active</h3>
          <p className="text-xs text-zinc-400 mb-3">Hover over the grid to preview. Click or press Spacebar to place. Press 'R' to rotate.</p>
          <div className="flex gap-2">
            <button onClick={rotatePlacement} className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition-colors text-xs">
              <RotateCw size={14} /> Rotate
            </button>
            <button onClick={() => setPlacementMode(null)} className="flex-1 flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 p-2 rounded-lg transition-colors text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">View Mode</h2>
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-colors ${viewMode === '2d' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <View size={16} /> 2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-md transition-colors ${viewMode === '3d' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Box size={16} /> 3D
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Layout Generator</h2>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={layoutText}
                onChange={(e) => { setLayoutText(e.target.value); setLayoutError(false); }}
                placeholder="e.g. 10 3x3 back to back"
                className={`flex-1 bg-zinc-800 border ${layoutError ? 'border-red-500' : 'border-zinc-700'} rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500`}
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
              <p className="text-xs text-red-400">Format not recognized. Try "10 3x3 in line" or "10 3x3 back to back".</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Pre-built Booths</h2>
          <div className="space-y-2">
            <button onClick={() => setPlacementMode({ type: 'booth', boothSize: [3, 3], defaultY: 0, dimensions: [3, 2.4, 3], color: '#4f46e5' })} className="w-full flex items-center gap-3 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 p-3 rounded-lg transition-colors text-sm text-left border border-indigo-800/50">
              <LayoutGrid size={18} />
              3x3 Booth
            </button>
            <button onClick={() => setPlacementMode({ type: 'booth', boothSize: [2, 3], defaultY: 0, dimensions: [2, 2.4, 3], color: '#4f46e5' })} className="w-full flex items-center gap-3 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 p-3 rounded-lg transition-colors text-sm text-left border border-indigo-800/50">
              <LayoutGrid size={18} />
              2x3 Booth
            </button>
            <button onClick={() => setPlacementMode({ type: 'booth', boothSize: [2, 2], defaultY: 0, dimensions: [2, 2.4, 2], color: '#4f46e5' })} className="w-full flex items-center gap-3 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 p-3 rounded-lg transition-colors text-sm text-left border border-indigo-800/50">
              <LayoutGrid size={18} />
              2x2 Booth
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Panels (2.4m H)</h2>
          <div className="space-y-2">
            <button onClick={() => handleAddSheet(1)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-zinc-400" />
              1m Width Panel
            </button>
            <button onClick={() => handleAddSheet(0.5)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Square size={18} className="text-zinc-400" />
              0.5m Width Panel
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Structure</h2>
          <div className="space-y-2">
            <button onClick={handleAddExtrusion} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Columns size={18} className="text-zinc-400" />
              Extrusion (2.4m)
            </button>
            <button onClick={() => handleAddBeam(1)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-zinc-400" />
              Beam (1m)
            </button>
            <button onClick={() => handleAddBeam(0.5)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-zinc-400" />
              Beam (0.5m)
            </button>
            <button onClick={() => handleAddBeam(2)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-zinc-400" />
              Beam (2m)
            </button>
            <button onClick={() => handleAddBeam(3)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Box size={18} className="text-zinc-400" />
              Beam (3m)
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Fascia Boards</h2>
          <div className="space-y-2">
            <button onClick={() => handleAddFascia(1)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Type size={18} className="text-zinc-400" />
              Fascia (1m)
            </button>
            <button onClick={() => handleAddFascia(2)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Type size={18} className="text-zinc-400" />
              Fascia (2m)
            </button>
            <button onClick={() => handleAddFascia(3)} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Type size={18} className="text-zinc-400" />
              Fascia (3m)
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Accessories</h2>
          <div className="space-y-2">
            <button onClick={handleAddSpotlight} className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors text-sm text-left">
              <Lightbulb size={18} className="text-zinc-400" />
              Spotlight
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Artworks & Graphics</h2>
          <div className="space-y-2">
            <label className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition-colors text-sm cursor-pointer border border-dashed border-zinc-600">
              <Upload size={16} /> Upload Artwork
              <input type="file" className="hidden" accept="image/*,.pdf,.ai" onChange={handleFileUpload} />
            </label>
            {artworks.map(art => (
              <div key={art.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded text-xs text-zinc-300">
                <span className="truncate max-w-[150px]" title={art.name}>{art.name}</span>
                <button onClick={() => removeArtwork(art.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedPanels.length > 0 && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-800/30">
          <h3 className="text-sm font-medium text-white mb-3">
            {selectedPanels.length === 1 ? 'Panel Properties' : `Multi-Panel Properties (${selectedPanels.length})`}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Apply Artwork</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
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
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Print Style</label>
                <div className="flex bg-zinc-900 rounded p-1">
                  <button 
                    onClick={() => updateItem(selectedPanels[0].id, { printType: 'normal' })}
                    className={`flex-1 text-xs py-1 rounded ${selectedPanels[0].printType !== 'seamless' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
                  >Normal</button>
                  <button 
                    onClick={() => updateItem(selectedPanels[0].id, { printType: 'seamless' })}
                    className={`flex-1 text-xs py-1 rounded ${selectedPanels[0].printType === 'seamless' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
                  >Seamless</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-zinc-800 space-y-2">
        <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors text-sm mb-4">
          <Download size={16} /> Export Image
        </button>
        {selectedItemIds.length > 0 && (
          <>
            <button onClick={rotateSelectedItem} className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition-colors text-sm">
              <RotateCw size={16} /> Rotate 90°
            </button>
            <button onClick={() => selectedItemIds.forEach(id => removeItem(id))} className="w-full flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 p-2 rounded-lg transition-colors text-sm mb-2">
              <Trash2 size={16} /> Delete Selected
            </button>
          </>
        )}
        <button onClick={clearAll} className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition-colors text-sm">
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
