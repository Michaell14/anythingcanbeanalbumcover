import type { RefObject, MutableRefObject } from 'react';
import type React from 'react';
import supabase from '../../utils/supabase';

// Canvas and stamp rendering constants
const CANVAS_SIZE = 800;
const STAMP_MAX_WIDTH_RATIO = 0.28; // 28% of canvas width
const STAMP_PADDING_PX = 20;
const CROP_MIN_SIZE = 100;
const CROP_DEFAULT_SIZE = 200;
const WEBP_QUALITY = 0.85; // 85% quality for good balance
const MAX_UPLOAD_SIZE = 1024 * 1024 * 2; // 2MB max size

// Helper function to calculate display dimensions (DRY - used in multiple places)
function calculateDisplayDimensions(
	imageDisplayInfo: { originalWidth: number; originalHeight: number },
	containerWidth: number,
	containerHeight: number
): { displayWidth: number; displayHeight: number; offsetX: number; offsetY: number } {
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

	return { displayWidth, displayHeight, offsetX, offsetY };
}

// Calculate initial crop area position and size based on image dimensions
function calculateInitialCropArea(
	imageDisplayInfo: { originalWidth: number; originalHeight: number },
	containerWidth: number,
	containerHeight: number
): { x: number; y: number; size: number } {
	const { displayWidth, displayHeight, offsetX, offsetY } = calculateDisplayDimensions(
		imageDisplayInfo,
		containerWidth,
		containerHeight
	);

	// Calculate the maximum possible crop size within the image bounds
	const maxCropSize = Math.min(displayWidth, displayHeight);
	const cropSize = Math.min(CROP_DEFAULT_SIZE, maxCropSize);

	// Center the crop area within the image display area
	const x = offsetX + (displayWidth - cropSize) / 2;
	const y = offsetY + (displayHeight - cropSize) / 2;

	return { x, y, size: cropSize };
}

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
	cropContainerRef: RefObject<HTMLDivElement | null>,
	showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
) {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
	if (!file) return;

	// Block HEIC files
	const fileName = file.name.toLowerCase();
	const fileType = file.type.toLowerCase();
	if (fileName.endsWith('.heic') || fileName.endsWith('.heif') || fileType.includes('heic') || fileType.includes('heif')) {
		showToast('HEIC/HEIF files are not supported. Please use PNG, JPEG, GIF, or WebP format.', 'error');
		try { inputEl.value = ''; } catch { /* ignore */ }
		return;
	}
	const reader = new FileReader();
	reader.onload = (event) => {
		const img = new Image();
		img.onload = () => {
			const imageInfo = { originalWidth: img.width, originalHeight: img.height };
			setImageDisplayInfo(imageInfo);
			
			// Calculate proper initial crop area based on image dimensions
			const container = cropContainerRef.current;
			if (container) {
				const containerWidth = container.offsetWidth;
				const containerHeight = container.offsetHeight;
				const initialCropArea = calculateInitialCropArea(imageInfo, containerWidth, containerHeight);
				setCropArea(initialCropArea);
			} else {
				// Fallback if container not available yet
				setCropArea({ x: 0, y: 0, size: CROP_DEFAULT_SIZE });
			}
		};
		img.src = event.target?.result as string;

        // Force state change even if the same file (same data URL) is selected again
        setSelectedImage(null);
        setSelectedImage(event.target?.result as string);
		setCroppedImage(null);
		setCropMode(true);

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
    isResizing: boolean,
    cropMode: boolean,
    cropArea: { x: number; y: number; size: number },
    dragStart: { x: number; y: number },
    resizeStart: { size: number; mouseX: number; mouseY: number },
    cropContainerRef: RefObject<HTMLDivElement | null>,
    setCropArea: (v: { x: number; y: number; size: number }) => void,
    imageDisplayInfo: { originalWidth: number; originalHeight: number } | null,
) {
	if ((!isDragging && !isResizing) || !cropMode || !imageDisplayInfo) return;
	e.preventDefault();
	const rect = cropContainerRef.current?.getBoundingClientRect();
	if (!rect) return;

	// Use helper function instead of repeating calculation
	const { displayWidth, displayHeight, offsetX, offsetY } = calculateDisplayDimensions(
		imageDisplayInfo,
		rect.width,
		rect.height
	);

	const mouseX = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
	const mouseY = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

	if (isResizing) {
		// Calculate new size based on diagonal drag distance
		const deltaX = mouseX - resizeStart.mouseX;
		const deltaY = mouseY - resizeStart.mouseY;
		const delta = Math.max(deltaX, deltaY); // Use the larger of the two for smoother resizing

		const maxSize = Math.min(displayWidth, displayHeight);
		const newSize = Math.max(CROP_MIN_SIZE, Math.min(resizeStart.size + delta, maxSize));

		// Keep the crop area within bounds when resizing
		const newX = Math.min(cropArea.x, offsetX + displayWidth - newSize);
		const newY = Math.min(cropArea.y, offsetY + displayHeight - newSize);

		setCropArea({ x: newX, y: newY, size: newSize });
	} else if (isDragging) {
		// Constrain movement within the actual image display area
		const newX = Math.max(offsetX, Math.min(mouseX - dragStart.x, offsetX + displayWidth - cropArea.size));
		const newY = Math.max(offsetY, Math.min(mouseY - dragStart.y, offsetY + displayHeight - cropArea.size));

		setCropArea({ ...cropArea, x: newX, y: newY });
	}
}

export function handleResizeStart(
	e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
	cropMode: boolean,
	cropArea: { x: number; y: number; size: number },
	cropContainerRef: RefObject<HTMLDivElement | null>,
	setIsResizing: (v: boolean) => void,
	setResizeStart: (v: { size: number; mouseX: number; mouseY: number }) => void,
) {
	if (!cropMode) return;
	e.preventDefault();
	e.stopPropagation();
	const rect = cropContainerRef.current?.getBoundingClientRect();
	if (!rect) return;
	const mouseX = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
	const mouseY = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
	setIsResizing(true);
	setResizeStart({ size: cropArea.size, mouseX, mouseY });
}

export function handleCropEnd(
	setIsDragging: (v: boolean) => void,
	setIsResizing: (v: boolean) => void,
) {
	setIsDragging(false);
	setIsResizing(false);
}

export function handleCropResize(
	delta: number,
	cropArea: { x: number; y: number; size: number },
	setCropArea: (v: { x: number; y: number; size: number }) => void,
	cropContainerRef: RefObject<HTMLDivElement | null>,
	imageDisplayInfo: { originalWidth: number; originalHeight: number } | null,
) {
	const container = cropContainerRef.current;
	if (!container || !imageDisplayInfo) return;

	// Use helper function instead of repeating calculation
	const { displayWidth, displayHeight } = calculateDisplayDimensions(
		imageDisplayInfo,
		container.offsetWidth,
		container.offsetHeight
	);

	// The maximum crop size should be the smaller of the display dimensions
	const maxSize = Math.min(displayWidth, displayHeight);

	const newSize = Math.max(CROP_MIN_SIZE, Math.min(cropArea.size + delta, maxSize));
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

		// Use helper function instead of repeating calculation
		const { displayWidth, offsetX, offsetY } = calculateDisplayDimensions(
			imageDisplayInfo,
			container.offsetWidth,
			container.offsetHeight
		);
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

// Helper function to compress and convert to WebP
async function compressToWebP(canvas: HTMLCanvasElement, maxSize: number = MAX_UPLOAD_SIZE): Promise<Blob> {
    let quality = WEBP_QUALITY;
    let blob: Blob | null = null;

    // Try to get WebP blob at target quality
    blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve as BlobCallback, 'image/webp', quality)
    );

    if (!blob) {
        throw new Error('Failed to create WebP image');
    }

    // If still too large, reduce quality iteratively
    let attempts = 0;
    while (blob.size > maxSize && quality > 0.5 && attempts < 5) {
        quality -= 0.1;
        attempts++;
        blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve as BlobCallback, 'image/webp', quality)
        );
        if (!blob) break;
    }

    return blob!;
}

// Retry mechanism for upload
async function uploadWithRetry(
    fileName: string,
    blob: Blob,
    maxRetries: number = 3
): Promise<{ error: any }> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { error } = await supabase
                .storage
                .from('public_album_covers')
                .upload(fileName, blob, { contentType: 'image/webp', upsert: false });

            if (!error) {
                return { error: null };
            }

            lastError = error;

            // If it's a network error, wait before retrying
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            }
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    return { error: lastError };
}

export async function uploadToSupabase(
    croppedImage: string | null,
    addToGallery: (v: string[]) => void,
    setUploading: (v: boolean) => void,
    applyFilterAndStampCb: () => Promise<void> | void,
    canvasRef: RefObject<HTMLCanvasElement | null>,
    showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
    onSuccess?: () => void,
) {
    if (!croppedImage) return;
    setUploading(true);
    // Ensure canvas contains filtered image + stamp
    await Promise.resolve(applyFilterAndStampCb());
    const canvas = canvasRef.current;
    if (!canvas) {
        setUploading(false);
        showToast('Could not access canvas to upload.', 'error');
        return;
    }
    try {
        // Compress and convert to WebP
        const blob = await compressToWebP(canvas);

        const originalSize = canvas.toDataURL('image/png').length / 1024; // Approximate KB
        const compressedSize = blob.size / 1024; // KB
        const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

        console.log(`Compressed from ~${Math.round(originalSize)}KB to ${Math.round(compressedSize)}KB (${savings}% reduction)`);

        const fileName = `album_${Date.now()}.webp`;

        // Upload with retry mechanism
        const { error: uploadError } = await uploadWithRetry(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase
            .storage
            .from('public_album_covers')
            .getPublicUrl(fileName);
        const publicUrl = publicUrlData.publicUrl;
        addToGallery([publicUrl]);
        setUploading(false);
        if (onSuccess) onSuccess();
        showToast('Album cover uploaded successfully!', 'success');
    } catch (err) {
        console.error(err);
        setUploading(false);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            showToast('Upload failed after retries. Please check your connection.', 'error');
        } else {
            showToast('Upload failed. You can still download your cover locally.', 'error');
        }
    }
}

export function downloadImage(
	croppedImage: string | null,
	applyFilterAndStampCb: () => Promise<void> | void,
	canvasRef: React.RefObject<HTMLCanvasElement>,
) {
	if (!croppedImage) return;
	Promise.resolve(applyFilterAndStampCb()).then(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		// Try to download as WebP for smaller file size
		canvas.toBlob((blob) => {
			if (blob) {
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.download = 'album-cover.webp';
				link.href = url;
				link.click();
				// Clean up the URL object
				setTimeout(() => URL.revokeObjectURL(url), 100);
			} else {
				// Fallback to PNG if WebP fails
				const link = document.createElement('a');
				link.download = 'album-cover.png';
				link.href = canvas.toDataURL('image/png');
				link.click();
			}
		}, 'image/webp', WEBP_QUALITY);
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
	setCropArea({ x: 0, y: 0, size: CROP_DEFAULT_SIZE });
	setImageDisplayInfo(null);
}


