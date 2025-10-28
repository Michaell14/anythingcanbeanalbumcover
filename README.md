# Anything Can Be An Album Cover

A web app inspired by the social media trend that transforms any image into an album cover aesthetic with a "Parental Advisory" label.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-blue)

## Features

- **Interactive Crop Tool** - Drag-to-resize square crop with real-time preview
- **7 Filter Presets** - Grayscale, sepia, vintage, cold, warm, high-contrast
- **Auto Stamp Overlay** - Iconic "Parental Advisory" label automatically positioned
- **Public Gallery** - Infinite scroll gallery of community-created covers
- **WebP Compression** - Automatic image optimization (50-70% size reduction)
- **Offline-Capable** - Works without backend for local downloads

## Tech Stack

**Frontend:** React 19, TypeScript, Tailwind CSS 4, Zustand
**Backend:** Supabase (Storage)
**Build:** Vite

## Performance Optimizations

- Memoized event handlers prevent unnecessary re-renders
- Throttled scroll events (200ms) for smooth infinite scroll
- Lazy image loading with 200px viewport margin
- Batch URL generation for gallery items
- DRY helper functions eliminate repeated calculations

## Project Structure

```
src/
├── components/
│   ├── Editor.tsx          # Modal editor UI
│   ├── editorActions.ts    # Image processing logic
│   └── Toast.tsx           # Notification system
├── store.ts                # Zustand state management
└── App.tsx                 # Gallery & main layout
```
