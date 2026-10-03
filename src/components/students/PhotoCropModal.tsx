// Modal de recorte manual para la foto del alumno.
// Implementación propia (drag + zoom) para evitar problemas de
// compatiblidad con react-easy-crop + React 19 + <dialog>.
// Al guardar: dibuja la región visible al canvas y devuelve un Blob JPEG.

"use client";

import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Modal } from "@/components/ui/Modal";

interface PhotoCropModalProps {
  isOpen: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  title?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;
const TARGET_SIZE = 600;

interface CropResult {
  srcX: number;
  srcY: number;
  srcSize: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = src;
  });
}

export function PhotoCropModal({
  isOpen,
  file,
  onCancel,
  onConfirm,
  title = "Centrar el rostro del alumno",
}: PhotoCropModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="lg">
      {file && (
        <CropBody
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
}

interface CropBodyProps {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

function CropBody({ file, onConfirm, onCancel }: CropBodyProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStateRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number }>({
    active: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
}, []);

  const side = containerSize.w && containerSize.h ? Math.min(containerSize.w, containerSize.h) : 0;
  // Contain dentro del marco, no cover sobre el contenedor entero: al
  // abrir la foto se ve completa y sin zoom automático. El usuario
  // decide con los controles (slider/±/reset/rueda) si la recorta.
  const fitScale =
    naturalSize && side
      ? Math.min(side / naturalSize.w, side / naturalSize.h)
      : 1;

  // Tamaño efectivo en pantalla y límites de arrastre. El marco
  // cuadrado es de lado `side`, centrado en el contenedor. Para que
  // siempre exista intersección (y no se pueda guardar un cuadrado
  // totalmente blanco), |offset| ≤ (display + side) / 2 por eje.
  const displayW = naturalSize ? naturalSize.w * fitScale * zoom : 0;
  const displayH = naturalSize ? naturalSize.h * fitScale * zoom : 0;
  const limitX = (displayW + side) / 2;
  const limitY = (displayH + side) / 2;
  const clampOffset = (o: { x: number; y: number }) => ({
    x: clamp(o.x, -limitX, limitX),
    y: clamp(o.y, -limitY, limitY),
  });

  // Reacotar offset cuando cambia el zoom (la imagen se hace más
  // grande o más pequeña y pueden aparecer offsets fuera de rango).
  useEffect(() => {
    if (!naturalSize || !side) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset((o) => ({
      x: clamp(o.x, -limitX, limitX),
      y: clamp(o.y, -limitY, limitY),
    }));
  }, [zoom, side, naturalSize, limitX, limitY]);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (img) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  const onPointerDown = (clientX: number, clientY: number) => {
    dragStateRef.current = {
      active: true,
      sx: clientX,
      sy: clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    const d = dragStateRef.current;
    if (!d.active) return;
    const proposed = {
      x: d.ox + (clientX - d.sx),
      y: d.oy + (clientY - d.sy),
    };
    setOffset(clampOffset(proposed));
  };

  const onPointerUp = () => {
    dragStateRef.current.active = false;
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    onPointerDown(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    onPointerMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => onPointerUp();
  const handleMouseLeave = () => onPointerUp();

  const handleTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    onPointerDown(t.clientX, t.clientY);
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    onPointerMove(t.clientX, t.clientY);
  };

  const handleTouchEnd = () => onPointerUp();

  const handleWheel = (e: ReactWheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => clamp(Number((z + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
  };

  const handleZoomIn = () => setZoom((z) => clamp(Number((z + ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
  const handleZoomOut = () => setZoom((z) => clamp(Number((z - ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const computeCrop = useCallback((): CropResult | null => {
    if (!naturalSize || containerSize.w === 0 || containerSize.h === 0) return null;
    const s = fitScale * zoom;
    const side = Math.min(containerSize.w, containerSize.h);
    const srcSize = side / s;
    const srcX = naturalSize.w / 2 - (offset.x + side / 2) / s;
    const srcY = naturalSize.h / 2 - (offset.y + side / 2) / s;
    return { srcX, srcY, srcSize };
  }, [naturalSize, fitScale, zoom, containerSize, offset]);

  const handleConfirm = async () => {
    if (!naturalSize || isProcessing) return;
    setIsProcessing(true);
    try {
      const img = await loadImage(dataUrl ?? "");
      const c = computeCrop();
      if (!c) throw new Error("No se pudo calcular el recorte.");

      const canvas = document.createElement("canvas");
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear el canvas.");

      // Fondo blanco (cubre cualquier hueco entre la foto y el
      // cuadrado — p.ej. fotos no cuadradas que no tocan los bordes).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

      // Intersección del rect del marco en coords de la imagen con
      // los bordes reales de la imagen. WYSIWYG: lo que ves es lo
      // que se guarda. Si la imagen no cubre el marco (zoom=1 con
      // foto no cuadrada) → quedan bandas blancas; si la cubre
      // completamente (zoom > 1 o desplazada) → solo la región
      // encuadrada.
      const imgW = naturalSize.w;
      const imgH = naturalSize.h;
      const fx0 = c.srcX;
      const fy0 = c.srcY;
      const fx1 = c.srcX + c.srcSize;
      const fy1 = c.srcY + c.srcSize;
      const ix0 = Math.max(0, fx0);
      const iy0 = Math.max(0, fy0);
      const ix1 = Math.min(imgW, fx1);
      const iy1 = Math.min(imgH, fy1);
      const iw = ix1 - ix0;
      const ih = iy1 - iy0;
      if (iw > 0 && ih > 0) {
        const destX = ((ix0 - fx0) / c.srcSize) * TARGET_SIZE;
        const destY = ((iy0 - fy0) / c.srcSize) * TARGET_SIZE;
        const destW = (iw / c.srcSize) * TARGET_SIZE;
        const destH = (ih / c.srcSize) * TARGET_SIZE;
        ctx.drawImage(img, ix0, iy0, iw, ih, destX, destY, destW, destH);
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen."))),
          "image/jpeg",
          0.92,
        );
      });
      onConfirm(blob);
    } catch {
      setIsProcessing(false);
    }
  };

  const hasImage = naturalSize !== null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        La foto se muestra completa al abrir. Arrastra para encuadrar y usa
        los botones, el slider o la rueda (Ctrl/Cmd) para hacer zoom. Al
        guardar se conserva exactamente lo que se ve en el marco: si la foto
        no es cuadrada, las áreas vacías quedan en blanco.
      </p>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="relative w-full bg-slate-900 rounded-lg overflow-hidden select-none touch-none"
        style={{ height: 360, cursor: hasImage ? "grab" : "default" }}
      >
        {!hasImage && (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm z-10">
            Cargando imagen…
          </div>
        )}

        <img
          ref={imageRef}
          alt=""
          src={dataUrl ?? undefined}
          draggable={false}
          onLoad={handleImageLoad}
          onDragStart={(e) => e.preventDefault()}
          className="select-none"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: naturalSize ? naturalSize.w * fitScale * zoom : "auto",
            height: naturalSize ? naturalSize.h * fitScale * zoom : "auto",
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            pointerEvents: "none",
            userSelect: "none",
            maxWidth: "none",
          }}
        />

        {hasImage && containerSize.w > 0 && containerSize.h > 0 && (() => {
          const side = Math.min(containerSize.w, containerSize.h);
          const cropLeft = (containerSize.w - side) / 2;
          const cropTop = (containerSize.h - side) / 2;
          return (
            <>
              <div
                aria-hidden
                className="absolute bg-slate-900/55 pointer-events-none"
                style={{ top: 0, left: 0, right: 0, height: cropTop }}
              />
              <div
                aria-hidden
                className="absolute bg-slate-900/55 pointer-events-none"
                style={{ bottom: 0, left: 0, right: 0, height: cropTop }}
              />
              <div
                aria-hidden
                className="absolute bg-slate-900/55 pointer-events-none"
                style={{
                  top: cropTop,
                  bottom: cropTop,
                  left: 0,
                  width: cropLeft,
                }}
              />
              <div
                aria-hidden
                className="absolute bg-slate-900/55 pointer-events-none"
                style={{
                  top: cropTop,
                  bottom: cropTop,
                  right: 0,
                  width: cropLeft,
                }}
              />
              <div
                aria-hidden
                className="absolute border-2 border-white/80 pointer-events-none"
                style={{
                  width: side,
                  height: side,
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%)`,
                }}
              />
            </>
          );
        })()}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={!hasImage || isProcessing || zoom <= MIN_ZOOM}
          className="p-2 rounded-lg text-text-secondary hover:bg-slate-100 disabled:opacity-40 transition-colors"
          aria-label="Reducir zoom"
        >
          <Minus size={16} />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-accent"
          disabled={!hasImage || isProcessing}
        />
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={!hasImage || isProcessing || zoom >= MAX_ZOOM}
          className="p-2 rounded-lg text-text-secondary hover:bg-slate-100 disabled:opacity-40 transition-colors"
          aria-label="Aumentar zoom"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasImage || isProcessing}
          className="p-2 rounded-lg text-text-secondary hover:bg-slate-100 transition-colors"
          title="Restablecer"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-divider">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-4 py-2 rounded-lg text-text-secondary hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasImage || isProcessing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          <Check size={16} />
          {isProcessing ? "Guardando…" : "Guardar foto"}
        </button>
      </div>
    </div>
  );
}
