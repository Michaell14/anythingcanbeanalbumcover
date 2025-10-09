# Anything Can Be An Album Cover

A modern, interactive web application that transforms any image into a professional-looking album cover with built-in editing tools, filters, and automatic parental advisory stamping.

![Album Cover Creator](https://img.shields.io/badge/Status-Live-brightgreen)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Vite](https://img.shields.io/badge/Vite-5+-purple)

Upload any photo, crop the photo, and add a filter. The stamp is automatically added, and the result is saved to the public gallery.

## Tech Stack

### **Frontend**
- **React 18**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Zustand**
- **FileReader API** - Local file handling

### **Backend & Storage**
- **Supabase Storage** - Cloud file storage for images

## 📁 Project Structure

```
src/
├── components/
│   ├── Editor.tsx           # Main editor component with modal
│   └── editorActions.ts     # Image processing and upload logic
├── utils/
│   └── supabase.ts         # Supabase client configuration
├── App.tsx                 # Main application component
├── store.ts               # Zustand store definitions
└── main.tsx              # Application entry point
```


---
