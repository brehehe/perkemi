import { useCallback, useEffect, useRef } from 'react';

export default function SignaturePad({
    value = '',
    onChange,
    disabled = false,
    label = 'Tanda tangan digital',
    height = 180,
    error = null,
}) {
    const canvasRef = useRef(null);
    const drawing = useRef(false);

    const prepareCanvas = useCallback((signature = '') => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const width = Math.max(canvas.getBoundingClientRect().width, 240);
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * pixelRatio);
        canvas.height = Math.floor(height * pixelRatio);

        const context = canvas.getContext('2d');
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 2.5;
        context.strokeStyle = '#17120f';

        if (signature) {
            const image = new Image();
            image.onload = () => context.drawImage(image, 0, 0, width, height);
            image.src = signature;
        }
    }, [height]);

    useEffect(() => {
        prepareCanvas(value);
        const canvas = canvasRef.current;
        if (!canvas || typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver(() => prepareCanvas(value));
        observer.observe(canvas);

        return () => observer.disconnect();
    }, [prepareCanvas, value]);

    const pointFromEvent = (event) => {
        const rectangle = canvasRef.current.getBoundingClientRect();

        return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
    };

    const startDrawing = (event) => {
        if (disabled) return;

        const context = canvasRef.current.getContext('2d');
        const point = pointFromEvent(event);
        drawing.current = true;
        canvasRef.current.setPointerCapture(event.pointerId);
        context.beginPath();
        context.moveTo(point.x, point.y);
    };

    const draw = (event) => {
        if (!drawing.current || disabled) return;

        const context = canvasRef.current.getContext('2d');
        const point = pointFromEvent(event);
        context.lineTo(point.x, point.y);
        context.stroke();
    };

    const finishDrawing = (event) => {
        if (!drawing.current) return;

        drawing.current = false;
        canvasRef.current.releasePointerCapture?.(event.pointerId);
        onChange(canvasRef.current.toDataURL('image/png'));
    };

    const clearSignature = () => {
        prepareCanvas('');
        onChange('');
    };

    return (
        <div>
            <div className={`overflow-hidden rounded-xl border border-dashed bg-white ${error ? 'border-rose-400 ring-2 ring-rose-100' : 'border-[#cfc5b8]'}`}>
                <canvas
                    ref={canvasRef}
                    aria-label={label}
                    className={`block w-full touch-none ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}`}
                    style={{ height }}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={finishDrawing}
                    onPointerCancel={finishDrawing}
                    onPointerLeave={(event) => drawing.current && finishDrawing(event)}
                />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className={`text-xs font-semibold ${value ? 'text-emerald-700' : error ? 'text-rose-700' : 'text-amber-700'}`}>
                    <i className={`fa-solid ${value ? 'fa-circle-check' : 'fa-pen-nib'} mr-1.5`} aria-hidden="true" />
                    {error || (value ? 'Tanda tangan sudah terisi' : 'Tanda tangan wajib diisi')}
                </p>
                <button type="button" disabled={disabled || !value} onClick={clearSignature} className="min-h-10 rounded-lg border border-[#d9d1c7] bg-white px-3 text-xs font-bold text-[#5f574f] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] disabled:cursor-not-allowed disabled:opacity-50">
                    Hapus
                </button>
            </div>
        </div>
    );
}
