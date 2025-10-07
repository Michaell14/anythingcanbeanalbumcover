import { useState, useEffect } from 'react';
import { useGalleryStore } from './store';
import Editor from './components/Editor';
import supabase from '../utils/supabase';

const AlbumCoverCreator = () => {
  const { gallery, setGallery } = useGalleryStore();

  // Load gallery on mount
  useEffect(() => {
    async function loadImages() {
      // List up to 10 files from the bucket root; use supported sort column
      const { data, error } = await supabase
        .storage
        .from("public_album_covers")
        .list("", { limit: 20, sortBy: { column: "created_at", order: "desc" } })

      if (error) {
        console.error("Error listing images:", error)
        return
      }

      // Convert each file to a public URL
      const urls = (data || [])
        // Ignore folder placeholders
        .filter(file => !file.name.endsWith('/'))
        .map(file => {
        const { data: publicUrlData } = supabase
          .storage
          .from("public_album_covers")
          .getPublicUrl(file.name)
        return publicUrlData.publicUrl
        })

      setGallery(urls)
    }

    loadImages()
  }, [])


  return (
    <div className="min-h-screen text-white p-8" id="app">
      <div className="max-w-7xl mx-auto">
        <div>
          <p className="text-6xl text-center" id="title">ANYTHING CAN BE AN ALBUM COVER</p>
        </div>

        {/* Gallery Section */}
        <div className="">
          {gallery.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Editor />
              {gallery.map((img, index) => (
                <GalleryImage key={index} src={img} alt={`Album ${index + 1}`} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No album covers yet. Create your first one!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumCoverCreator;

const GalleryImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-square overflow-hidden hover:ring-2 hover:ring-[#812FFF] transition-all hover:scale-105 bg-black/40">
      {/* Skeleton/placeholder */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-800/50" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-[filter,opacity] duration-500 ${loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}
      />
    </div>
  );
};