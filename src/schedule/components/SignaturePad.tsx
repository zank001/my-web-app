/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Upload } from 'lucide-react';

interface SignaturePadProps {
  initialValue?: string;
  onSave: (base64: string) => void;
  height?: number;
  label?: string;
}

export default function SignaturePad({
  initialValue = '',
  onSave,
  height = 150,
  label = 'วาดลายเซ็นของคุณ'
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(!!initialValue);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset and load initial value if it has one
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialValue;
      setHasContent(true);
    } else {
      setHasContent(false);
    }
  }, [initialValue]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Support mouse or touch position
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Deep slate ink

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onSave('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onSave(base64);
        setHasContent(true);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg Transition"
        >
          <Eraser size={13} />
          ล้างกระดาษ
        </button>
      </div>

      <div className="relative border border-dashed border-slate-300 rounded-lg bg-slate-50/50 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full block cursor-crosshair touch-none"
        />
        {!hasContent && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 gap-1.5">
            <span className="text-sm font-medium">ใช้นิ้วหรือเมาส์วาดลงที่นี่</span>
            <span className="text-xs text-slate-400">หรืออัปโหลดรูปภาพด้านล่าง</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-1 px-1">
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg cursor-pointer transition">
          <Upload size={13} />
          อัปโหลดรูปภาพ (.png, .jpg)
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        {hasContent && (
          <span className="text-[11px] text-emerald-600 font-medium">✓ บันทึกลายเซ็นแล้ว</span>
        )}
      </div>
    </div>
  );
}
