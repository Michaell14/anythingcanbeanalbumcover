import { create } from 'zustand';

export interface GalleryState {
    gallery: string[];
    addToGallery: (newImages: string[]) => void;
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
	dragStart: { x: number; y: number };
	imageDisplayInfo: { originalWidth: number; originalHeight: number } | null;

	setOpen: (open: boolean) => void;
	setSelectedImage: (selectedImage: string | null) => void;
	setCroppedImage: (croppedImage: string | null) => void;
	setFilter: (filter: string) => void;
	setCropMode: (cropMode: boolean) => void;
	setUploading: (uploading: boolean) => void;
	setCropArea: (cropArea: { x: number; y: number; size: number }) => void;
	setIsDragging: (isDragging: boolean) => void;
	setDragStart: (dragStart: { x: number; y: number }) => void;
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
	dragStart: { x: 0, y: 0 },
	imageDisplayInfo: null,

	setOpen: (open) => set({ open }),
	setSelectedImage: (selectedImage) => set({ selectedImage }),
	setCroppedImage: (croppedImage) => set({ croppedImage }),
	setFilter: (filter) => set({ filter }),
	setCropMode: (cropMode) => set({ cropMode }),
	setUploading: (uploading) => set({ uploading }),
	setCropArea: (cropArea) => set({ cropArea }),
	setIsDragging: (isDragging) => set({ isDragging }),
	setDragStart: (dragStart) => set({ dragStart }),
	setImageDisplayInfo: (imageDisplayInfo) => set({ imageDisplayInfo }),
}));