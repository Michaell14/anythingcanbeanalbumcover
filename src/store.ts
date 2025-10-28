import { create } from 'zustand';

export interface GalleryState {
    gallery: string[];
    addToGallery: (newImages: string[]) => void;
    prependToGallery: (newImages: string[]) => void;
    resetGallery: () => void;
    offset: number;
    setOffset: (offset: number) => void;
    hasMore: boolean;
    setHasMore: (hasMore: boolean) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
    gallery: [],
    addToGallery: (newImages: string[]) => set((state) => {
        // Filter out duplicates by checking if URL already exists
        const existingUrls = new Set(state.gallery);
        const uniqueNewImages = newImages.filter(url => !existingUrls.has(url));
        return {
            gallery: [...state.gallery, ...uniqueNewImages]
        };
    }),
    prependToGallery: (newImages: string[]) => set((state) => {
        // Filter out duplicates by checking if URL already exists
        const existingUrls = new Set(state.gallery);
        const uniqueNewImages = newImages.filter(url => !existingUrls.has(url));
        return {
            gallery: [...uniqueNewImages, ...state.gallery]
        };
    }),
    resetGallery: () => set({ 
        gallery: [], 
        offset: 0, 
        hasMore: true, 
        loading: false 
    }),
    offset: 0,
    setOffset: (offset: number) => set({ offset }),
    hasMore: true,
    setHasMore: (hasMore: boolean) => set({ hasMore }),
    loading: false,
    setLoading: (loading: boolean) => set({ loading }),
}));

export interface EditorState {
	open: boolean;
	selectedImage: string | null;
	croppedImage: string | null;
	filter: string;
	cropMode: boolean;
	uploading: boolean;
	cropArea: { x: number; y: number; size: number };
	isDragging: boolean;
	isResizing: boolean;
	dragStart: { x: number; y: number };
	resizeStart: { size: number; mouseX: number; mouseY: number };
	imageDisplayInfo: { originalWidth: number; originalHeight: number } | null;

	setOpen: (open: boolean) => void;
	setSelectedImage: (selectedImage: string | null) => void;
	setCroppedImage: (croppedImage: string | null) => void;
	setFilter: (filter: string) => void;
	setCropMode: (cropMode: boolean) => void;
	setUploading: (uploading: boolean) => void;
	setCropArea: (cropArea: { x: number; y: number; size: number }) => void;
	setIsDragging: (isDragging: boolean) => void;
	setIsResizing: (isResizing: boolean) => void;
	setDragStart: (dragStart: { x: number; y: number }) => void;
	setResizeStart: (resizeStart: { size: number; mouseX: number; mouseY: number }) => void;
	setImageDisplayInfo: (imageDisplayInfo: { originalWidth: number; originalHeight: number } | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
	open: false,
	selectedImage: null,
	croppedImage: null,
	filter: '',
	cropMode: false,
	uploading: false,
	cropArea: { x: 0, y: 0, size: 200 },
	isDragging: false,
	isResizing: false,
	dragStart: { x: 0, y: 0 },
	resizeStart: { size: 200, mouseX: 0, mouseY: 0 },
	imageDisplayInfo: null,

	setOpen: (open) => set({ open }),
	setSelectedImage: (selectedImage) => set({ selectedImage }),
	setCroppedImage: (croppedImage) => set({ croppedImage }),
	setFilter: (filter) => set({ filter }),
	setCropMode: (cropMode) => set({ cropMode }),
	setUploading: (uploading) => set({ uploading }),
	setCropArea: (cropArea) => set({ cropArea }),
	setIsDragging: (isDragging) => set({ isDragging }),
	setIsResizing: (isResizing) => set({ isResizing }),
	setDragStart: (dragStart) => set({ dragStart }),
	setResizeStart: (resizeStart) => set({ resizeStart }),
	setImageDisplayInfo: (imageDisplayInfo) => set({ imageDisplayInfo }),
}));

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
}

export interface ToastState {
	toasts: Toast[];
	addToast: (message: string, type: Toast['type'], duration?: number) => void;
	removeToast: (id: string) => void;
}

// Counter for generating unique toast IDs (more efficient than Date + Random)
let toastIdCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],
	addToast: (message: string, type: Toast['type'], duration = 5000) => {
		const id = `toast-${++toastIdCounter}`;
		const toast: Toast = { id, message, type, duration };
		set((state) => ({ toasts: [...state.toasts, toast] }));

		// Auto-remove after duration
		if (duration > 0) {
			setTimeout(() => {
				set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
			}, duration);
		}
	},
	removeToast: (id: string) => set((state) => ({
		toasts: state.toasts.filter(t => t.id !== id)
	})),
}));