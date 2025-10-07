import type { RefObject, MutableRefObject } from 'react';
import type React from 'react';
import supabase from '../../utils/supabase';

// Canvas and stamp rendering constants
const CANVAS_SIZE = 800;
const STAMP_MAX_WIDTH_RATIO = 0.28; // 28% of canvas width
const STAMP_PADDING_PX = 20;

function get2DContext(canvasRef: RefObject<HTMLCanvasElement | null>): CanvasRenderingContext2D | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
}
export const getFilterStyle = (filterName: string) => {
	switch (filterName) {
		case 'grayscale': return 'grayscale(100%)';
		case 'sepia': return 'sepia(100%)';
		case 'vintage': return 'sepia(50%) contrast(1.2) brightness(1.1)';
		case 'cold': return 'hue-rotate(200deg) saturate(0.8)';
		case 'warm': return 'hue-rotate(-30deg) saturate(1.2)';
		case 'high-contrast': return 'contrast(1.5)';
		default: return 'none';
	}
};

export function handleImageUpload(
	e: React.ChangeEvent<HTMLInputElement>,
	setSelectedImage: (v: string | null) => void,
	setCroppedImage: (v: string | null) => void,
	setCropMode: (v: boolean) => void,
	setCropArea: (v: { x: number; y: number; size: number }) => void,
	setImageDisplayInfo: (v: { originalWidth: number; originalHeight: number } | null) => void,
) {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = (event) => {
		const img = new Image();
		img.onload = () => {
			setImageDisplayInfo({ originalWidth: img.width, originalHeight: img.height });
		};
		img.src = event.target?.result as string;

        // Force state change even if the same file (same data URL) is selected again
        setSelectedImage(null);
        setSelectedImage(event.target?.result as string);
		setCroppedImage(null);
		setCropMode(true);
		setCropArea({ x: 0, y: 0, size: 200 });

        // Allow selecting the same file to trigger onChange again
        try { inputEl.value = ''; } catch { /* ignore */ }
	};
	reader.readAsDataURL(file);
}

export function handleCropStart(
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    cropMode: boolean,
    cropArea: { x: number; y: number; size: number },
    cropContainerRef: RefObject<HTMLDivElement | null>,
    setIsDragging: (v: boolean) => void,
    setDragStart: (v: { x: number; y: number }) => void,
) {
	if (!cropMode) return;
	e.preventDefault();
	const rect = cropContainerRef.current?.getBoundingClientRect();
	if (!rect) return;
	const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
	const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
	setIsDragging(true);
	setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
}

export function handleCropMove(
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    isDragging: boolean,
    cropMode: boolean,
    cropArea: { x: number; y: number; size: number },
    dragStart: { x: number; y: number },
    cropContainerRef: RefObject<HTMLDivElement | null>,
    setCropArea: (v: { x: number; y: number; size: number }) => void,
) {
	if (!isDragging || !cropMode) return;
	e.preventDefault();
	const rect = cropContainerRef.current?.getBoundingClientRect();
	if (!rect) return;
	const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
	const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
	const newX = Math.max(0, Math.min(x - dragStart.x, rect.width - cropArea.size));
	const newY = Math.max(0, Math.min(y - dragStart.y, rect.height - cropArea.size));
	setCropArea({ ...cropArea, x: newX, y: newY });
}

export function handleCropEnd(
	setIsDragging: (v: boolean) => void,
) {
	setIsDragging(false);
}

export function handleCropResize(
	delta: number,
	cropArea: { x: number; y: number; size: number },
	setCropArea: (v: { x: number; y: number; size: number }) => void,
) {
	const newSize = Math.max(100, Math.min(cropArea.size + delta, 300));
	setCropArea({ ...cropArea, size: newSize });
}

export function applyCrop(
    selectedImage: string | null,
    imageDisplayInfo: { originalWidth: number; originalHeight: number } | null,
    cropArea: { x: number; y: number; size: number },
    cropContainerRef: RefObject<HTMLDivElement | null>,
    canvasRef: RefObject<HTMLCanvasElement | null>,
    setCroppedImage: (v: string | null) => void,
    setCropMode: (v: boolean) => void,
    setFilter: (v: string) => void,
) {
	if (!selectedImage || !cropContainerRef.current || !imageDisplayInfo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = get2DContext(canvasRef);
    if (!ctx) return;
	const img = new Image();
	img.onload = () => {
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
		const container = cropContainerRef.current;
		if (!container) return;
		const containerWidth = container.offsetWidth;
		const containerHeight = container.offsetHeight;
		const imgAspectRatio = imageDisplayInfo.originalWidth / imageDisplayInfo.originalHeight;
		const containerAspectRatio = containerWidth / containerHeight;
		let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number;
		if (imgAspectRatio > containerAspectRatio) {
			displayWidth = containerWidth;
			displayHeight = containerWidth / imgAspectRatio;
			offsetX = 0;
			offsetY = (containerHeight - displayHeight) / 2;
		} else {
			displayHeight = containerHeight;
			displayWidth = containerHeight * imgAspectRatio;
			offsetX = (containerWidth - displayWidth) / 2;
			offsetY = 0;
		}
		const scale = imageDisplayInfo.originalWidth / displayWidth;
		const adjustedX = Math.max(0, cropArea.x - offsetX);
		const adjustedY = Math.max(0, cropArea.y - offsetY);
		const sourceX = Math.min(adjustedX * scale, imageDisplayInfo.originalWidth - cropArea.size * scale);
		const sourceY = Math.min(adjustedY * scale, imageDisplayInfo.originalHeight - cropArea.size * scale);
		const sourceSize = cropArea.size * scale;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
		ctx.drawImage(
			img,
			Math.max(0, sourceX),
			Math.max(0, sourceY),
			Math.min(sourceSize, imageDisplayInfo.originalWidth - sourceX),
			Math.min(sourceSize, imageDisplayInfo.originalHeight - sourceY),
            0,
            0,
            CANVAS_SIZE,
            CANVAS_SIZE
		);
		setCroppedImage(canvas.toDataURL());
		setCropMode(false);
		setFilter('none');
	};
	img.src = selectedImage;
}

export function applyFilterAndStamp(
    croppedImage: string | null,
    filter: string,
    canvasRef: RefObject<HTMLCanvasElement | null>,
    stampImgRef: MutableRefObject<HTMLImageElement | null>,
) : Promise<void> {
    if (!croppedImage) return Promise.resolve();
    const canvas = canvasRef.current;
    if (!canvas) return Promise.resolve();
    const ctx = get2DContext(canvasRef);
    if (!ctx) return Promise.resolve();
    let resolveFn: () => void;
    const done = new Promise<void>((resolve) => { resolveFn = resolve; });
	const img = new Image();
	let stampImg: HTMLImageElement | null = stampImgRef.current;
	let imagesLoaded = 0;
	const checkAndDraw = () => {
		imagesLoaded++;
		if (imagesLoaded === 2) {
            canvas.width = CANVAS_SIZE;
            canvas.height = CANVAS_SIZE;
			ctx.filter = getFilterStyle(filter);
            ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
			ctx.filter = 'none';
			if (stampImg) {
                const desiredMaxWidth = Math.floor(STAMP_MAX_WIDTH_RATIO * canvas.width);
				const naturalW = stampImg.naturalWidth || stampImg.width;
				const naturalH = stampImg.naturalHeight || stampImg.height;
				const aspect = naturalW && naturalH ? naturalW / naturalH : 1.6;
				const finalWidth = Math.min(desiredMaxWidth, naturalW || desiredMaxWidth);
				const finalHeight = Math.round(finalWidth / aspect);
                ctx.imageSmoothingEnabled = true;
                (ctx as any).imageSmoothingQuality = 'high';
				ctx.drawImage(
					stampImg,
                    canvas.width - finalWidth - STAMP_PADDING_PX,
                    canvas.height - finalHeight - STAMP_PADDING_PX,
					finalWidth,
					finalHeight
				);
			}
				// Do not overwrite the base cropped image; callers can read from canvas
            resolveFn!();
		}
	};
	img.onload = checkAndDraw;
	img.src = croppedImage;
	if (stampImg && stampImg.complete) {
		imagesLoaded++;
	} else {
		stampImg = new Image();
        stampImg.onload = () => { checkAndDraw(); };
        stampImg.onerror = () => { checkAndDraw(); };
		stampImg.src = '/parental_advisory.png';
		stampImgRef.current = stampImg;
	}
    return done;
}

export async function uploadToSupabase(
    croppedImage: string | null,
    gallery: string[],
    setGallery: (v: string[]) => void,
    setUploading: (v: boolean) => void,
    applyFilterAndStampCb: () => Promise<void> | void,
    canvasRef: RefObject<HTMLCanvasElement | null>,
    onSuccess?: () => void,
) {
    if (!croppedImage) return;
    setUploading(true);
    // Ensure canvas contains filtered image + stamp
    await Promise.resolve(applyFilterAndStampCb());
    const canvas = canvasRef.current;
    if (!canvas) {
        setUploading(false);
        alert('Could not access canvas to upload.');
        return;
    }
    try {
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve as BlobCallback, 'image/png'));
        if (!blob) throw new Error('Failed to create image blob');
        const fileName = `album_${Date.now()}.png`;
        const { error: uploadError } = await supabase
            .storage
            .from('public_album_covers')
            .upload(fileName, blob, { contentType: 'image/png', upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase
            .storage
            .from('public_album_covers')
            .getPublicUrl(fileName);
        const publicUrl = publicUrlData.publicUrl;
        setGallery([...gallery, publicUrl]);
        setUploading(false);
        if (onSuccess) onSuccess();
        alert('Album cover uploaded successfully!');
    } catch (err) {
        console.error(err);
        setUploading(false);
        alert('Upload failed. Please try again.');
    }
}

export function downloadImage(
	croppedImage: string | null,
	applyFilterAndStampCb: () => Promise<void> | void,
	canvasRef: React.RefObject<HTMLCanvasElement>,
) {
	if (!croppedImage) return;
	Promise.resolve(applyFilterAndStampCb()).then(() => {
		const link = document.createElement('a');
		link.download = 'album-cover.png';
		link.href = canvasRef.current?.toDataURL() || '';
		link.click();
	});
}

export function resetEditor(
	setSelectedImage: (v: string | null) => void,
	setCroppedImage: (v: string | null) => void,
	setFilter: (v: string) => void,
	setCropMode: (v: boolean) => void,
	setCropArea: (v: { x: number; y: number; size: number }) => void,
	setImageDisplayInfo: (v: { originalWidth: number; originalHeight: number } | null) => void,
) {
	setSelectedImage(null);
	setCroppedImage(null);
	setFilter('');
	setCropMode(false);
	setCropArea({ x: 0, y: 0, size: 200 });
	setImageDisplayInfo(null);
}


