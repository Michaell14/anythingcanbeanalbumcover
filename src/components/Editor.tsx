import React, { useRef, useEffect, useCallback } from 'react';
import { Download, Save } from 'lucide-react';
import { useGalleryStore, useEditorStore, useToastStore } from '../store';
import {
    handleImageUpload as handleImageUploadAction,
    handleCropStart as handleCropStartAction,
    handleCropMove as handleCropMoveAction,
    handleCropEnd as handleCropEndAction,
    handleResizeStart as handleResizeStartAction,
    applyCrop as applyCropAction,
    applyFilterAndStamp as applyFilterAndStampAction,
    getFilterStyle,
    uploadToSupabase as uploadToSupabaseAction,
    downloadImage as downloadImageAction,
    resetEditor as resetEditorAction,
} from './editorActions';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

const Editor = () => {
    const {
        open, setOpen,
        selectedImage, setSelectedImage,
        croppedImage, setCroppedImage,
        filter, setFilter,
        cropMode, setCropMode,
        uploading, setUploading,
        cropArea, setCropArea,
        isDragging, setIsDragging,
        isResizing, setIsResizing,
        dragStart, setDragStart,
        resizeStart, setResizeStart,
        imageDisplayInfo, setImageDisplayInfo
    } = useEditorStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cropContainerRef = useRef<HTMLDivElement>(null);
    const stampImgRef = useRef<HTMLImageElement | null>(null);

    const { prependToGallery } = useGalleryStore();
    const { addToast } = useToastStore();

    // Memoize all handlers to prevent unnecessary re-renders
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleImageUploadAction(
        e,
        setSelectedImage,
        setCroppedImage,
        setCropMode,
        setCropArea,
        setImageDisplayInfo,
        cropContainerRef,
        addToast
    ), [setSelectedImage, setCroppedImage, setCropMode, setCropArea, setImageDisplayInfo, addToast]);

    const handleCropStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => handleCropStartAction(
        e,
        cropMode,
        cropArea,
        cropContainerRef,
        setIsDragging,
        setDragStart
    ), [cropMode, cropArea, setIsDragging, setDragStart]);

    const handleCropMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => handleCropMoveAction(
        e,
        isDragging,
        isResizing,
        cropMode,
        cropArea,
        dragStart,
        resizeStart,
        cropContainerRef,
        setCropArea,
        imageDisplayInfo
    ), [isDragging, isResizing, cropMode, cropArea, dragStart, resizeStart, setCropArea, imageDisplayInfo]);

    const handleCropEnd = useCallback(() => handleCropEndAction(setIsDragging, setIsResizing), [setIsDragging, setIsResizing]);

    const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => handleResizeStartAction(
        e,
        cropMode,
        cropArea,
        cropContainerRef,
        setIsResizing,
        setResizeStart
    ), [cropMode, cropArea, setIsResizing, setResizeStart]);

    const applyCrop = useCallback(() => applyCropAction(
        selectedImage,
        imageDisplayInfo,
        cropArea,
        cropContainerRef,
        canvasRef,
        setCroppedImage,
        setCropMode,
        setFilter
    ), [selectedImage, imageDisplayInfo, cropArea, setCroppedImage, setCropMode, setFilter]);

    const applyFilterAndStamp = useCallback(() => applyFilterAndStampAction(
        croppedImage,
        filter,
        canvasRef,
        stampImgRef
    ), [croppedImage, filter]);

    const resetEditor = useCallback(() => resetEditorAction(
        setSelectedImage,
        setCroppedImage,
        setFilter,
        setCropMode,
        setCropArea,
        setImageDisplayInfo
    ), [setSelectedImage, setCroppedImage, setFilter, setCropMode, setCropArea, setImageDisplayInfo]);

    const uploadToSupabase = useCallback(async () => uploadToSupabaseAction(
        croppedImage,
        prependToGallery,
        setUploading,
        applyFilterAndStamp,
        canvasRef,
        addToast,
        () => { setOpen(false); resetEditor(); }
    ), [croppedImage, prependToGallery, setUploading, applyFilterAndStamp, addToast, setOpen, resetEditor]);

    const downloadImage = useCallback(() => downloadImageAction(
        croppedImage,
        applyFilterAndStamp,
        canvasRef as React.RefObject<HTMLCanvasElement>
    ), [croppedImage, applyFilterAndStamp]);

    // No automatic mutation on filter change; render is done on demand from base image

    // Preload stamp image on mount
    useEffect(() => {
        const img = new Image();
        img.src = '/parental_advisory.png';
        stampImgRef.current = img;
    }, []);

    useEffect(() => {
        if (selectedImage) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [selectedImage, setOpen]);

    return (
        <div className="bg-black/50 backdrop-blur-md p-6">
            <Dialog open={open} onClose={setOpen} className="relative z-10">
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-black/90 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
                />

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <DialogPanel
                            transition
                            className={`relative transform overflow-hidden border border-white/20 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full data-closed:sm:translate-y-0 data-closed:sm:scale-95 max-h-[90vh] flex flex-col ${cropMode ? 'sm:max-w-lg' : 'sm:max-w-4xl'}`}
                        >
                            <div className="bg-[#121212] px-6 pt-6 pb-4 border-b border-white/10">
                                <DialogTitle as="h3" className="text-gray-300 text-center">
                                    <p className="text-3xl tracking-wider uppercase">Editor</p>
                                </DialogTitle>
                            </div>
                            <div className="bg-[#121212] px-6 py-6 overflow-y-auto flex-1">
                                <div className="w-full">
                                        {selectedImage && cropMode && (
                                            <div>
                                                <div
                                                    ref={cropContainerRef}
                                                    className="relative mb-6 bg-black border border-white/20 overflow-hidden"
                                                    style={{ height: '400px' }}
                                                    onMouseMove={handleCropMove}
                                                    onMouseUp={handleCropEnd}
                                                    onMouseLeave={handleCropEnd}
                                                    onTouchMove={handleCropMove}
                                                    onTouchEnd={handleCropEnd}
                                                >
                                                    <img
                                                        src={selectedImage}
                                                        alt="Original"
                                                        className="w-full h-full object-contain opacity-50"
                                                    />
                                                    <div
                                                        className="absolute border-2 border-white bg-transparent cursor-move"
                                                        style={{
                                                            left: `${cropArea.x}px`,
                                                            top: `${cropArea.y}px`,
                                                            width: `${cropArea.size}px`,
                                                            height: `${cropArea.size}px`,
                                                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)'
                                                        }}
                                                        onMouseDown={handleCropStart}
                                                        onTouchStart={handleCropStart}
                                                    >
                                                        <div className="absolute inset-0 border border-dashed border-white/50" />
                                                        {/* Resize handle - bottom right corner */}
                                                        <div
                                                            className="absolute bottom-0 right-0 w-6 h-6 bg-white border-2 border-white cursor-nwse-resize"
                                                            style={{ transform: 'translate(50%, 50%)' }}
                                                            onMouseDown={handleResizeStart}
                                                            onTouchStart={handleResizeStart}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={applyCrop}
                                                    className="w-full border-2 border-white/50 py-3 text-xl text-gray-300 hover:border-white hover:bg-white/10 hover:cursor-pointer transition-all uppercase tracking-wider"
                                                >
                                                    Apply Crop
                                                </button>
                                            </div>
                                        )}
                                        {croppedImage && !cropMode && (
                                            <div className="flex flex-col md:flex-row gap-6">
                                                {/* Left side - Preview */}
                                                <div className="flex-1 flex items-start justify-center">
                                                    <div className="relative border border-white/20 w-full max-w-md">
                                                        <img
                                                            ref={imageRef}
                                                            src={croppedImage}
                                                            alt="Cropped"
                                                            className="w-full"
                                                            style={{ filter: getFilterStyle(filter) }}
                                                        />
                                                        <img
                                                            src="/parental_advisory.png"
                                                            alt="Parental Advisory"
                                                            className="absolute"
                                                            style={{
                                                                right: '12px',
                                                                bottom: '12px',
                                                                width: '28%',
                                                                filter: 'none',
                                                                pointerEvents: 'none'
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Right side - Filters and Actions */}
                                                <div className="flex-1 flex flex-col justify-between min-w-[280px]">
                                                    <div className="mb-6">
                                                        <p className="text-2xl mb-4 text-gray-400 uppercase tracking-wider">Filters</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {['none', 'grayscale', 'sepia', 'vintage', 'cold', 'warm', 'high-contrast'].map((f) => (
                                                                <button
                                                                    key={f}
                                                                    onClick={() => setFilter(f)}
                                                                    className={`py-2 px-3 text-sm transition-all hover:cursor-pointer uppercase tracking-wider ${filter === f
                                                                        ? 'border-2 border-white/70 bg-white/10 text-gray-300'
                                                                        : 'border border-white/30 text-gray-400 hover:border-white/60 hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    {f === 'none' ? 'Original' : f.replace('-', ' ')}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        <button
                                                            onClick={uploadToSupabase}
                                                            disabled={uploading}
                                                            className="w-full border-2 border-white/50 py-3 text-lg text-gray-300 hover:border-white hover:bg-white/10 hover:cursor-pointer transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            <Save className="w-5 h-5" />
                                                            {uploading ? 'Uploading...' : 'Upload'}
                                                        </button>
                                                        <button
                                                            onClick={downloadImage}
                                                            className="w-full border border-white/30 py-2 text-base text-gray-400 hover:border-white/60 hover:bg-white/5 hover:text-gray-300 hover:cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                            <div className="bg-[#121212] border-t border-white/10 px-6 py-4 flex justify-center">
                                <button
                                    type="button"
                                    data-autofocus
                                    onClick={() => { setOpen(false); resetEditor() }}
                                    className="border border-white/30 px-8 py-2 text-lg text-gray-400 hover:border-white/60 hover:bg-white/5 hover:text-gray-300 hover:cursor-pointer transition-all uppercase tracking-wider"
                                >
                                    Close
                                </button>
                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>

            <div onClick={() => fileInputRef.current?.click()} className="border-2 aspect-square border-white/50 border-dashed text-center flex items-center justify-center hover:cursor-pointer hover:border-white hover:bg-white/5 transition-all">
                <p className="text-gray-300 text-2xl uppercase tracking-wider">Create</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                />
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}

export default Editor