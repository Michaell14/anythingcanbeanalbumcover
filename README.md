# Anything Can Be An Album Cover

## Overview:
A web app inspired by the social media trend that transforms any image into an album cover aesthetic with a "Parental Advisory" label.

- **Cropping**: Drag-to-resize square crop with real-time preview
- **Image Filters**: Grayscale, sepia, vintage, cold, warm, high-contrast
- **Public Gallery**: Infinite scroll gallery of community-created covers
- **WebP Compression**: Automatic image optimization (50-70% size reduction)
- **Offline Capable**: Works without backend for local downloads

A two row panel of uploaded images:

<img width="2570" height="1286" alt="image" src="https://github.com/user-attachments/assets/8983d6fa-12bd-4132-bffe-308da6545cd0" />


## Editor
The upload editor first crops an image, and then applies a filter and stamps it with "parental advisory". Users can then download the image locally or upload it to the public gallery.

Cropping             |  Filtering
:-------------------------:|:-------------------------:
![](https://github.com/user-attachments/assets/e812a4cc-5905-4b3a-a77e-8ea9f23a3c6d)  |  ![](https://github.com/user-attachments/assets/1633c8e2-4e99-495d-a939-dcdc67f57a2f)



## Tech Stack

**Frontend:** React 19, TypeScript, Tailwind CSS 4, Zustand
**Backend:** Supabase (Storage)
**Build:** Vite

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
