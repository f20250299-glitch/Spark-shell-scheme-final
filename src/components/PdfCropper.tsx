import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// Setup worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCropperProps {
  file: File;
  onClose: () => void;
  onExtract: (dataUrl: string, name: string) => void;
}

export default function PdfCropper({ file, onClose, onExtract }: PdfCropperProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [splitCount, setSplitCount] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const loadedPdf = await loadingTask.promise;
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages);
        renderPage(loadedPdf, 1);
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Failed to load PDF. Please try again.");
        onClose();
      }
    };
    loadPdf();
  }, [file, onClose]);

  const renderPage = async (pdfDoc: pdfjsLib.PDFDocumentProxy, num: number) => {
    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvasFactory: undefined // or omit if not needed, but canvas is required? wait, let's just pass canvas: canvas
      } as any; // Cast to any to avoid type issues if the types are mismatched
      await page.render(renderContext).promise;
      setImageUrl(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  const handlePrevPage = () => {
    if (pageNum <= 1 || !pdf) return;
    const newPage = pageNum - 1;
    setPageNum(newPage);
    renderPage(pdf, newPage);
    setCrop(undefined);
    setCompletedCrop(null);
  };

  const handleNextPage = () => {
    if (pageNum >= numPages || !pdf) return;
    const newPage = pageNum + 1;
    setPageNum(newPage);
    renderPage(pdf, newPage);
    setCrop(undefined);
    setCompletedCrop(null);
  };

  const handleExtract = () => {
    if (!completedCrop || !imgRef.current) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    const sliceWidth = completedCrop.width / splitCount;

    for (let i = 0; i < splitCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = sliceWidth * scaleX;
      canvas.height = completedCrop.height * scaleY;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(
        imgRef.current,
        (completedCrop.x + (i * sliceWidth)) * scaleX,
        completedCrop.y * scaleY,
        sliceWidth * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        sliceWidth * scaleX,
        completedCrop.height * scaleY
      );

      const dataUrl = canvas.toDataURL('image/png');
      const suffix = splitCount > 1 ? ` (Panel ${i + 1} of ${splitCount})` : '';
      onExtract(dataUrl, `${file.name.replace('.pdf', '')} - Page ${pageNum} Crop${suffix}`);
    }

    setCrop(undefined);
    setCompletedCrop(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-900 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex flex-col p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Extract Artwork from PDF</h2>
              <p className="text-xs text-zinc-400 mt-1">Draw a rectangle over the artwork you want to extract.</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-sm text-zinc-400 mr-2">Quick Presets:</span>
            <button 
              onClick={() => { setAspect(undefined); setSplitCount(1); }}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${!aspect ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              Freeform
            </button>
            <button 
              onClick={() => { setAspect(1 / 2.5); setSplitCount(1); }}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${aspect === 1 / 2.5 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              1 Panel
            </button>
            <button 
              onClick={() => { setAspect(2 / 2.5); setSplitCount(2); }}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${aspect === 2 / 2.5 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              2 Panels
            </button>
            <button 
              onClick={() => { setAspect(3 / 2.5); setSplitCount(3); }}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${aspect === 3 / 2.5 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              3 Panels
            </button>
            <button 
              onClick={() => { setAspect(4 / 2.5); setSplitCount(4); }}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${aspect === 4 / 2.5 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              4 Panels
            </button>
            <button 
              onClick={() => { setAspect(5 / 2.5); setSplitCount(5); }}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${aspect === 5 / 2.5 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
              5 Panels
            </button>
            <div className="w-px h-6 bg-zinc-700 mx-2"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Divide into:</span>
              <input 
                type="number" 
                min="1" 
                max="20" 
                value={splitCount} 
                onChange={(e) => setSplitCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-sm text-zinc-400">pieces</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-zinc-950">
          {imageUrl ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img 
                ref={imgRef}
                src={imageUrl} 
                alt="PDF Page" 
                className="max-w-full h-auto block"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              Loading PDF...
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrevPage} 
              disabled={pageNum <= 1}
              className="p-2 bg-zinc-800 rounded text-white disabled:opacity-50 hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-zinc-300 text-sm">Page {pageNum} of {numPages}</span>
            <button 
              onClick={handleNextPage} 
              disabled={pageNum >= numPages}
              className="p-2 bg-zinc-800 rounded text-white disabled:opacity-50 hover:bg-zinc-700 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Done
            </button>
            <button 
              onClick={handleExtract}
              disabled={!completedCrop?.width || !completedCrop?.height}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={16} />
              Extract Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
