import React, { useState, useRef, useEffect } from 'react';
import type { DiagramLabel, Coverup, Arrow, ProjectilePath } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import LatexRenderer from './LatexRenderer';
import { CheckIcon } from './icons/CheckIcon';
import { EditIcon } from './icons/EditIcon';
import { SquareIcon } from './icons/SquareIcon';
import { ArrowIcon } from './icons/ArrowIcon';
import { CurveIcon } from './icons/CurveIcon';
import { RotateIcon } from './icons/RotateIcon';
import { MinusIcon } from './icons/MinusIcon';
import { regenerateDiagramImage } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';


interface DiagramEditorProps {
  imageData: string;
  mimeType: string;
  labels: DiagramLabel[];
  onLabelsChange: (newLabels: DiagramLabel[]) => void;
  coverups: Coverup[];
  onCoverupsChange: (newCoverups: Coverup[]) => void;
  arrows: Arrow[];
  onArrowsChange: (newArrows: Arrow[]) => void;
  projectilePaths: ProjectilePath[];
  onProjectilePathsChange: (newPaths: ProjectilePath[]) => void;
  onImageUpdate: (newImage: { data: string; mimeType: string }) => void;
}

const getProjectilePathD = (path: ProjectilePath, containerHeight: number | null) => {
    if (!containerHeight) return '';
    const y1_abs = path.y1 / 100 * containerHeight;
    const y2_abs = path.y2 / 100 * containerHeight;
    const peakY_abs = path.peakY / 100 * containerHeight;

    const h = (path.x1 + path.x2) / 2; // Control point x is midpoint for a symmetric curve
    const k = peakY_abs;               // Control point y needs to be calculated based on desired peak

    // For a quadratic Bezier curve M(t) = (1-t)^2*P0 + 2t(1-t)*P1 + t^2*P2,
    // the peak (for a vertical parabola) is at t=0.5.
    // The y of the peak is (y0/4) + (y1/2) + (y2/4).
    // Let's solve for the control point's y (cy) to achieve the desired peakY.
    // The peak of the quadratic Bezier curve is not the control point itself.
    // Peak Y position = 0.25*y1 + 0.5*cy + 0.25*y2
    // So, peakY = 0.25*path.y1 + 0.5*cy_percentage + 0.25*path.y2
    const cy_percentage = (peakY_abs - 0.25 * y1_abs - 0.25 * y2_abs) / 0.5;
    const cy = cy_percentage / containerHeight * 100;

    return `M ${path.x1} ${path.y1} Q ${h} ${cy} ${path.x2} ${path.y2}`;
};


const DiagramEditor: React.FC<DiagramEditorProps> = ({ 
    imageData, mimeType, 
    labels, onLabelsChange, 
    coverups, onCoverupsChange,
    arrows, onArrowsChange,
    projectilePaths, onProjectilePathsChange,
    onImageUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeElement, setActiveElement] = useState<{ type: string; id: string } | null>(null);
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const dragInfo = useRef({
    type: null as 'label' | 'coverup-drag' | 'coverup-resize' | 'arrow-start' | 'arrow-end' | 'projectile-start' | 'projectile-end' | 'projectile-peak' | 'label-rotate' | null,
    id: '',
    startX: 0,
    startY: 0,
    elementHandleStartX: 0,
    elementHandleStartY: 0,
    elementStartWidth: 0,
    elementStartHeight: 0,
    elementStartX: 0,
    elementStartY: 0,
    resizeHandle: '' as string,
    elementStartRotation: 0,
    elementStartAngle: 0,
  });

  const handleAddLabel = () => onLabelsChange([...labels, { text: 'New Label', x: 50, y: 50, rotate: 0, size: 100 }]);
  const handleDeleteLabel = (indexToDelete: number) => onLabelsChange(labels.filter((_, index) => index !== indexToDelete));
  const handleLabelTextChange = (index: number, newText: string) => {
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], text: newText };
    onLabelsChange(newLabels);
  };
  const handleLabelSizeChange = (index: number, change: number) => {
    onLabelsChange(labels.map((l, i) => {
        if (i === index) {
            const currentSize = l.size || 100;
            const newSize = Math.max(50, currentSize + change); // Min size 50%
            return { ...l, size: newSize };
        }
        return l;
    }));
  };
  
  const handleAddCoverup = () => onCoverupsChange([...coverups, { id: `cover-${Date.now()}`, x: 40, y: 40, width: 20, height: 10, isApplied: false }]);
  const handleDeleteCoverup = (idToDelete: string) => onCoverupsChange(coverups.filter(c => c.id !== idToDelete));
  const handleApplyCoverup = (idToApply: string) => {
    onCoverupsChange(coverups.map(c => c.id === idToApply ? { ...c, isApplied: true } : c));
  };
  const handleUnapplyCoverup = (idToUnapply: string) => {
    onCoverupsChange(coverups.map(c => c.id === idToUnapply ? { ...c, isApplied: false } : c));
  };
  
  const handleAddArrow = () => onArrowsChange([...arrows, { id: `arrow-${Date.now()}`, x1: 20, y1: 20, x2: 40, y2: 40 }]);
  const handleDeleteArrow = (idToDelete: string) => onArrowsChange(arrows.filter(a => a.id !== idToDelete));
  
  const handleAddProjectilePath = () => onProjectilePathsChange([...projectilePaths, { id: `path-${Date.now()}`, x1: 20, y1: 80, x2: 80, y2: 80, peakY: 30 }]);
  const handleDeleteProjectilePath = (idToDelete: string) => onProjectilePathsChange(projectilePaths.filter(p => p.id !== idToDelete));
  
  const handleRegenerate = async () => {
    if (!refinementPrompt || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const newImage = await regenerateDiagramImage(imageData, refinementPrompt);
      onImageUpdate(newImage);
      setRefinementPrompt(''); // Clear prompt
    } catch (error: any) {
      console.error("Failed to regenerate diagram:", error);
      alert(`Sorry, the diagram could not be regenerated. ${error.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };


  const handleElementDragStart = (e: React.MouseEvent, type: NonNullable<typeof dragInfo.current.type>, id: string, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (editingLabelIndex !== null) return;

    setActiveElement({ type: type.split('-')[0], id });
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    if (type === 'label-rotate') {
        const labelIndex = parseInt(id.split('-')[1]);
        const labelElement = e.currentTarget.closest('.group');
        const labelRect = labelElement?.getBoundingClientRect();
        if (!labelRect || isNaN(labelIndex)) return;

        const centerX = labelRect.left + labelRect.width / 2;
        const centerY = labelRect.top + labelRect.height / 2;
        const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const initialRotation = labels[labelIndex].rotate || 0;

        dragInfo.current = {
            ...dragInfo.current,
            type, id,
            startX: e.clientX, startY: e.clientY,
            elementStartX: centerX, elementStartY: centerY,
            elementStartRotation: initialRotation, elementStartAngle: startAngle,
        };
        window.addEventListener('mousemove', handleDragging);
        window.addEventListener('mouseup', handleDragEnd);
        return;
    }
    
    let element;
    let handleX = 0, handleY = 0;

    if (type.startsWith('label')) {
      element = labels.find((_, i) => `label-${i}` === id);
      if (!element) return;
      handleX = element.x; handleY = element.y;
    } else if (type.startsWith('coverup')) {
      element = coverups.find(c => c.id === id);
       if (!element) return;
      handleX = element.x; handleY = element.y;
    } else if (type.startsWith('arrow')) {
      element = arrows.find(a => a.id === id);
      if (!element) return;
      handleX = type === 'arrow-start' ? element.x1 : element.x2;
      handleY = type === 'arrow-start' ? element.y1 : element.y2;
    } else if (type.startsWith('projectile')) {
      element = projectilePaths.find(p => p.id === id);
      if (!element) return;
      if (type === 'projectile-start') { handleX = element.x1; handleY = element.y1; }
      else if (type === 'projectile-end') { handleX = element.x2; handleY = element.y2; }
      else { 
        const containerHeight = containerRect.height;
        handleX = (element.x1 + element.x2) / 2; 
        handleY = element.peakY / containerHeight * 100;
      }
    } else { return; }

    dragInfo.current = {
      ...dragInfo.current,
      type, id,
      startX: e.clientX, startY: e.clientY,
      elementHandleStartX: handleX, elementHandleStartY: handleY,
      elementStartWidth: 'width' in element ? element.width : 0,
      elementStartHeight: 'height' in element ? element.height : 0,
      elementStartX: 'x' in element ? element.x : 0,
      elementStartY: 'y' in element ? element.y : 0,
      resizeHandle: handle || '',
    };

    window.addEventListener('mousemove', handleDragging);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragging = (e: MouseEvent) => {
    const { type, id, startX, startY, elementHandleStartX, elementHandleStartY, elementStartX, elementStartY, elementStartWidth, elementStartHeight, resizeHandle, elementStartRotation, elementStartAngle } = dragInfo.current;
    if (!type || !id) return;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const dx = (e.clientX - startX) / containerRect.width * 100;
    const dy = (e.clientY - startY) / containerRect.height * 100;
    const clamp = (val: number, min = 0, max = 100) => Math.max(min, Math.min(max, val));
    
    if (type === 'label-rotate') {
        const currentAngle = Math.atan2(e.clientY - elementStartY, e.clientX - elementStartX) * (180 / Math.PI);
        const angleDelta = currentAngle - elementStartAngle;
        let newRotation = (elementStartRotation + angleDelta);
        if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
        onLabelsChange(labels.map((l, i) => `label-${i}` === id ? { ...l, rotate: newRotation } : l));
        return;
    }

    if (type === 'label') onLabelsChange(labels.map((l, i) => `label-${i}` === id ? { ...l, x: clamp(elementHandleStartX + dx), y: clamp(elementHandleStartY + dy) } : l));
    if (type === 'arrow-start') onArrowsChange(arrows.map(a => a.id === id ? { ...a, x1: clamp(elementHandleStartX + dx), y1: clamp(elementHandleStartY + dy) } : a));
    if (type === 'arrow-end') onArrowsChange(arrows.map(a => a.id === id ? { ...a, x2: clamp(elementHandleStartX + dx), y2: clamp(elementHandleStartY + dy) } : a));
    if (type === 'projectile-start') onProjectilePathsChange(projectilePaths.map(p => p.id === id ? { ...p, x1: clamp(elementHandleStartX + dx), y1: clamp(elementHandleStartY + dy) } : p));
    if (type === 'projectile-end') onProjectilePathsChange(projectilePaths.map(p => p.id === id ? { ...p, x2: clamp(elementHandleStartX + dx), y2: clamp(elementHandleStartY + dy) } : p));
    if (type === 'projectile-peak') onProjectilePathsChange(projectilePaths.map(p => p.id === id ? { ...p, peakY: clamp(elementHandleStartY + dy, 0, 100) } : p));
    
    if (type === 'coverup-drag') onCoverupsChange(coverups.map(c => c.id === id ? { ...c, x: clamp(elementStartX + dx), y: clamp(elementStartY + dy) } : c));
    else if (type === 'coverup-resize') {
        onCoverupsChange(coverups.map(c => {
            if (c.id !== id) return c;
            let newX = elementStartX, newY = elementStartY, newW = elementStartWidth, newH = elementStartHeight;
            if (resizeHandle.includes('l')) { newX = clamp(elementStartX + dx); newW = clamp(elementStartWidth - dx); }
            if (resizeHandle.includes('r')) newW = clamp(elementStartWidth + dx);
            if (resizeHandle.includes('t')) { newY = clamp(elementStartY + dy); newH = clamp(elementStartHeight - dy); }
            if (resizeHandle.includes('b')) newH = clamp(elementStartHeight + dy);
            return { ...c, x: newX, y: newY, width: newW, height: newH };
        }));
    }
  };

  const handleDragEnd = () => {
    dragInfo.current.type = null;
    dragInfo.current.id = '';
    setActiveElement(null);
    window.removeEventListener('mousemove', handleDragging);
    window.removeEventListener('mouseup', handleDragEnd);
  };

  useEffect(() => {
    return () => { // Cleanup listeners on unmount
        window.removeEventListener('mousemove', handleDragging);
        window.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  return (
    <div className="space-y-4">
      {isEditing ? (
        <div className="space-y-4 p-4 bg-slate-100 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <span className="font-semibold text-slate-700">Add Element:</span>
                <button onClick={handleAddLabel} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50"><div className="h-4 w-4"><PencilIcon /></div>Label</button>
                <button onClick={handleAddCoverup} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50"><div className="h-4 w-4"><SquareIcon /></div>Cover-up</button>
                <button onClick={handleAddArrow} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50"><div className="h-4 w-4"><ArrowIcon /></div>Arrow</button>
                <button onClick={handleAddProjectilePath} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50"><div className="h-4 w-4"><CurveIcon /></div>Path</button>
              </div>
               <button
                onClick={() => setIsEditing(false)}
                className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700"
              >
                <div className="h-4 w-4 mr-2"><CheckIcon className="h-4 w-4" /></div>
                Done Editing
              </button>
            </div>


            <hr className="border-slate-300"/>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-sky-500" />
                    <label htmlFor="refinement-prompt" className="font-semibold text-slate-700">Refine Diagram with AI:</label>
                </div>
                <div className="flex gap-2">
                    <input
                        id="refinement-prompt"
                        type="text"
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder="e.g., 'make the inclined plane steeper' or 'add a second block'"
                        className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                        onClick={handleRegenerate}
                        disabled={isRegenerating || !refinementPrompt}
                        className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-sm hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isRegenerating ? '...' : 'Regenerate'}
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex justify-between items-center gap-4">
            <h4 className="text-lg font-semibold text-slate-800">Diagram</h4>
            <button
            onClick={() => setIsEditing(true)}
            className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
            <div className="h-4 w-4 mr-2"><EditIcon /></div>
            Edit Diagram
            </button>
        </div>
      )}

      <div ref={containerRef} className="relative w-full max-w-full mx-auto select-none border-2 border-dashed border-slate-300 rounded-lg overflow-hidden">
        <img src={`data:${mimeType};base64,${imageData}`} alt="Generated Diagram" className="w-full h-auto block" />

        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{pointerEvents: isEditing ? 'auto' : 'none'}}>
            <defs>
                <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0ea5e9" />
                </marker>
            </defs>
            {projectilePaths.map(path => (
                <path key={path.id} d={getProjectilePathD(path, containerRef.current?.clientHeight)} stroke="#f59e0b" strokeWidth="0.5" fill="none" strokeDasharray="1,1" />
            ))}
            {arrows.map(arrow => (
                <line key={arrow.id} x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke="#0ea5e9" strokeWidth="0.5" markerEnd="url(#arrowhead)" />
            ))}
        </svg>

        {labels.map((label, i) => (
          <div
            key={i}
            className={`absolute group ${isEditing ? 'cursor-grab' : ''} ${activeElement?.id === `label-${i}` ? 'z-20' : 'z-10'}`}
            style={{
              left: `${label.x}%`,
              top: `${label.y}%`,
              transform: `translate(-50%, -50%) rotate(${label.rotate || 0}deg)`,
            }}
            onMouseDown={(e) => isEditing && handleElementDragStart(e, 'label', `label-${i}`)}
          >
            {editingLabelIndex === i ? (
              <div className="flex items-center bg-white p-1 rounded-md shadow-lg border border-sky-500">
                <input
                  type="text"
                  value={label.text}
                  onChange={(e) => handleLabelTextChange(i, e.target.value)}
                  onKeyDown={(e) => {if (e.key === 'Enter' || e.key === 'Escape') setEditingLabelIndex(null)}}
                  onBlur={() => setEditingLabelIndex(null)}
                  className="bg-transparent focus:outline-none"
                  autoFocus
                  style={{ fontSize: `${(label.size || 100) / 100}em` }}
                />
                <button onClick={() => setEditingLabelIndex(null)} className="p-0.5 text-green-500 hover:bg-green-100 rounded-full"><CheckIcon className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                 <LatexRenderer 
                    as="span" 
                    content={label.text} 
                    className="bg-white/70 backdrop-blur-sm px-2 py-1 rounded-md"
                    style={{ fontSize: `${(label.size || 100) / 100}em` }}
                 />
                {isEditing && (
                  <div className="absolute -top-3 -right-3 flex items-center bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{transform: `rotate(${-(label.rotate || 0)}deg)`}}>
                    <button onClick={() => handleLabelSizeChange(i, -10)} className="p-0.5 hover:bg-slate-100 rounded-l-full text-slate-600"><MinusIcon /></button>
                    <button onClick={() => handleLabelSizeChange(i, 10)} className="p-0.5 hover:bg-slate-100 text-slate-600"><PlusIcon /></button>
                    <button onMouseDown={(e) => handleElementDragStart(e, 'label-rotate', `label-${i}`)} className="p-0.5 hover:bg-slate-100 cursor-alias text-slate-600"><RotateIcon /></button>
                    <button onClick={() => setEditingLabelIndex(i)} className="p-0.5 hover:bg-slate-100 text-slate-600"><PencilIcon /></button>
                    <button onClick={() => handleDeleteLabel(i)} className="p-0.5 hover:bg-red-100 rounded-r-full text-red-500"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isEditing && coverups.map((cover) => (
            <div
                key={cover.id}
                className={`absolute group cursor-move border-2 border-dashed ${activeElement?.id === cover.id ? 'border-sky-500 z-10' : 'border-slate-400/70'} ${cover.isApplied ? 'bg-white' : 'bg-slate-400/30'}`}
                style={{ left: `${cover.x}%`, top: `${cover.y}%`, width: `${cover.width}%`, height: `${cover.height}%` }}
                onMouseDown={(e) => handleElementDragStart(e, 'coverup-drag', cover.id)}
            >
                {['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'].map(handle => (
                    <div
                        key={handle}
                        className={`absolute w-3 h-3 bg-white border border-sky-500 rounded-full -m-1.5 cursor-${handle.replace('t', 'n').replace('b', 's').replace('l', 'w').replace('r', 'e')}-resize`}
                        style={{
                            top: handle.includes('t') ? '0%' : handle.includes('b') ? '100%' : '50%',
                            left: handle.includes('l') ? '0%' : handle.includes('r') ? '100%' : '50%',
                            transform: `translate(${handle.includes('l') ? '-50%' : handle.includes('r') ? '50%' : '0%'}, ${handle.includes('t') ? '-50%' : handle.includes('b') ? '50%' : '0%'})`
                        }}
                        onMouseDown={(e) => handleElementDragStart(e, 'coverup-resize', cover.id, handle)}
                    />
                ))}
                 <div className="absolute top-0 right-0 -mt-8 flex items-center bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {cover.isApplied ? (
                         <button onClick={() => handleUnapplyCoverup(cover.id)} className="p-1 hover:bg-slate-100 rounded-l-full text-slate-600" title="Make transparent again">Show</button>
                    ) : (
                        <button onClick={() => handleApplyCoverup(cover.id)} className="p-1 hover:bg-slate-100 rounded-l-full text-slate-600" title="Apply cover-up (make opaque)">Hide</button>
                    )}
                    <button onClick={() => handleDeleteCoverup(cover.id)} className="p-1 hover:bg-red-100 rounded-r-full text-red-500" title="Delete Cover-up"><TrashIcon /></button>
                </div>
            </div>
        ))}

        {isEditing && arrows.map(arrow => (
            <React.Fragment key={arrow.id}>
                <div className="absolute w-4 h-4 bg-sky-500/80 rounded-full cursor-move -m-2" style={{ left: `${arrow.x1}%`, top: `${arrow.y1}%`, transform: 'translate(-50%, -50%)'}} onMouseDown={(e) => handleElementDragStart(e, 'arrow-start', arrow.id)} />
                <div className="absolute w-4 h-4 bg-sky-500/80 rounded-full cursor-move -m-2" style={{ left: `${arrow.x2}%`, top: `${arrow.y2}%`, transform: 'translate(-50%, -50%)'}} onMouseDown={(e) => handleElementDragStart(e, 'arrow-end', arrow.id)} />
                <button onClick={() => handleDeleteArrow(arrow.id)} className="absolute p-1 bg-white rounded-full shadow-md text-red-500 hover:bg-red-100" style={{ left: `${(arrow.x1 + arrow.x2) / 2}%`, top: `${(arrow.y1 + arrow.y2) / 2}%`, transform: 'translate(-50%, -50%)' }}><TrashIcon /></button>
            </React.Fragment>
        ))}

        {isEditing && projectilePaths.map(path => (
            <React.Fragment key={path.id}>
                <div className="absolute w-4 h-4 bg-amber-500/80 rounded-full cursor-move -m-2" style={{ left: `${path.x1}%`, top: `${path.y1}%`, transform: 'translate(-50%, -50%)'}} onMouseDown={(e) => handleElementDragStart(e, 'projectile-start', path.id)} />
                <div className="absolute w-4 h-4 bg-amber-500/80 rounded-full cursor-move -m-2" style={{ left: `${path.x2}%`, top: `${path.y2}%`, transform: 'translate(-50%, -50%)'}} onMouseDown={(e) => handleElementDragStart(e, 'projectile-end', path.id)} />
                <div className="absolute w-4 h-4 bg-amber-500/80 rounded-full cursor-ns-resize -m-2" style={{ left: `${(path.x1 + path.x2) / 2}%`, top: `${path.peakY}%`, transform: 'translate(-50%, -50%)'}} onMouseDown={(e) => handleElementDragStart(e, 'projectile-peak', path.id)} />
                <button onClick={() => handleDeleteProjectilePath(path.id)} className="absolute p-1 bg-white rounded-full shadow-md text-red-500 hover:bg-red-100" style={{ left: `${(path.x1 + path.x2) / 2}%`, top: `${path.peakY}%`, transform: 'translate(-50%, calc(-50% - 20px))' }}><TrashIcon /></button>
            </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default DiagramEditor;
