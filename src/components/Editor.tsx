import React, { useRef, useEffect } from 'react';
import { Download, Save } from 'lucide-react';
import { useGalleryStore, useEditorStore } from '../store';
import {
    handleImageUpload as handleImageUploadAction,
    handleCropStart as handleCropStartAction,
    handleCropMove as handleCropMoveAction,
    handleCropEnd as handleCropEndAction,
    handleCropResize as handleCropResizeAction,
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
        dragStart, setDragStart,
        imageDisplayInfo, setImageDisplayInfo
    } = useEditorStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cropContainerRef = useRef<HTMLDivElement>(null);
    const stampImgRef = useRef<HTMLImageElement | null>(null);

    const { addToGallery } = useGalleryStore();

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleImageUploadAction(
        e,
        setSelectedImage,
        setCroppedImage,
        setCropMode,
        setCropArea,
        setImageDisplayInfo
    );


    const handleCropStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => handleCropStartAction(
        e,
        cropMode,
        cropArea,
        cropContainerRef,
        setIsDragging,
        setDragStart
    );

    const handleCropMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => handleCropMoveAction(
        e,
        isDragging,
        cropMode,
        cropArea,
        dragStart,
        cropContainerRef,
        setCropArea
    );

    const handleCropEnd = () => handleCropEndAction(setIsDragging);

    const handleCropResize = (delta: number) => handleCropResizeAction(delta, cropArea, setCropArea);

    const applyCrop = () => applyCropAction(
        selectedImage,
        imageDisplayInfo,
        cropArea,
        cropContainerRef,
        canvasRef,
        setCroppedImage,
        setCropMode,
        setFilter
    );

    const applyFilterAndStamp = () => applyFilterAndStampAction(
        croppedImage,
        filter,
        canvasRef,
        stampImgRef
    );



    const uploadToSupabase = async () => uploadToSupabaseAction(
        croppedImage,
        addToGallery,
        setUploading,
        applyFilterAndStamp,
        canvasRef,
        () => { setOpen(false); resetEditor(); }
    );

    const downloadImage = () => downloadImageAction(
        croppedImage,
        applyFilterAndStamp,
        canvasRef as React.RefObject<HTMLCanvasElement>
    );

    const resetEditor = () => resetEditorAction(
        setSelectedImage,
        setCroppedImage,
        setFilter,
        setCropMode,
        setCropArea,
        setImageDisplayInfo
    );

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
        <div className="bg-black/50 backdrop-blur-md p-6 border border-purple-500/20">
            <Dialog open={open} onClose={setOpen} className="relative z-10">
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
                />

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <DialogPanel
                            transition
                            className="relative transform overflow-hidden text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
                        >
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
                                            <p>Album Cover Editor</p>
                                        </DialogTitle>
                                        {selectedImage && cropMode && (
                                            <div>
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                                        Crop to Square
                                                    </h3>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleCropResize(20)}
                                                            className="bg-purple-600/50 hover:bg-purple-600 px-3 py-1 text-sm"
                                                        >
                                                            + Size
                                                        </button>
                                                        <button
                                                            onClick={() => handleCropResize(-20)}
                                                            className="bg-purple-600/50 hover:bg-purple-600 px-3 py-1 text-sm"
                                                        >
                                                            - Size
                                                        </button>
                                                    </div>
                                                </div>

                                                <div
                                                    ref={cropContainerRef}
                                                    className="relative mb-4 bg-black rounded-lg overflow-hidden"
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
                                                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                                                        }}
                                                        onMouseDown={handleCropStart}
                                                        onTouchStart={handleCropStart}
                                                    >
                                                        <div className="absolute inset-0 border border-dashed border-white/50" />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={applyCrop}
                                                    className="w-full bg-purple-600 hover:bg-purple-700 py-2 transition-colors"
                                                >
                                                    Apply Crop
                                                </button>
                                            </div>
                                        )}
                                        {croppedImage && !cropMode && (
                                            <div>
                                                <div className="mb-4 relative">
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

                                                <div className="mb-4">
                                                    <p className="text-lg font-medium mb-2">Filters</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {['none', 'grayscale', 'sepia', 'vintage', 'cold', 'warm', 'high-contrast'].map((f) => (
                                                            <button
                                                                key={f}
                                                                onClick={() => setFilter(f)}
                                                                className={`py-2 px-3 capitalize text-sm transition-colors ${filter === f
                                                                    ? 'bg-purple-600'
                                                                    : 'bg-purple-600/30 hover:bg-purple-600/50'
                                                                    }`}
                                                            >
                                                                {f === 'none' ? 'Original' : f.replace('-', ' ')}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={downloadImage}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 py-2 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download
                                                    </button>
                                                    <button
                                                        onClick={uploadToSupabase}
                                                        disabled={uploading}
                                                        className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        {uploading ? 'Uploading...' : 'Save to Gallery'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button
                                    type="button"
                                    data-autofocus
                                    onClick={() => { setOpen(false); resetEditor() }}
                                    className="inline-flex w-full justify-center bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 sm:ml-3 sm:w-auto"
                                >
                                    Close
                                </button>
                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>

            <div onClick={() => fileInputRef.current?.click()} className="border-2 aspect-square border-white/50 border-dashed text-center flex items-center justify-center hover:cursor-pointer">
                <p className="text-gray-300">Create an album cover</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}

export default Editor