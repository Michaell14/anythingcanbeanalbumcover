import { useState, useEffect, useCallback, memo } from 'react';
import { useGalleryStore } from './store';
import Editor from './components/Editor';
import supabase from '../utils/supabase';

// Constants
const IMAGES_PER_PAGE = 20;
const SCROLL_THRESHOLD = 1000;
const GRID_CLASSES = "grid grid-cols-2 md:grid-cols-4 gap-4";

const AlbumCoverCreator = () => {
  const { 
    gallery, 
    addToGallery, 
    resetGallery,
    offset, 
    setOffset, 
    hasMore, 
    setHasMore, 
    loading, 
    setLoading 
  } = useGalleryStore();



  // Load more images function
  const loadMoreImages = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .storage
        .from("public_album_covers")
        .list("", {
          limit: IMAGES_PER_PAGE,
          offset: offset,
          sortBy: { column: "created_at", order: "desc" }
        });

      if (error) {
        console.error("Error listing images:", error);
        return;
      }

      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }

      // Convert each file to a public URL
      const urls = data
        .filter(file =>
          !file.name.endsWith('/') &&
          file.name !== '.emptyFolderPlaceholder' &&
          file.name !== '.emptyFolderPlaceholder/'
        )
        .map(file => {
          const { data: publicUrlData } = supabase
            .storage
            .from("public_album_covers")
            .getPublicUrl(file.name);
          return publicUrlData.publicUrl;
        })
        .filter(url => url && url.trim() !== ''); // Filter out empty/invalid URLs

      if (urls.length > 0) {
        addToGallery(urls);
        setOffset(offset + urls.length);
      }

      // If we got less than expected images, we've reached the end
      if (data.length < IMAGES_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more images:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset, addToGallery, setOffset, setHasMore, setLoading]);

  // Load gallery on mount
  useEffect(() => {
    // Reset gallery state and load initial images
    resetGallery();
    loadMoreImages();
  }, []);

  // Scroll event handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - SCROLL_THRESHOLD) {
        loadMoreImages();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreImages]);


  return (
    <div className="min-h-screen text-white p-8" id="app">
      <div className="max-w-7xl mx-auto">
        <div className="my-8 max-w-3xl">
          <p className="text-6xl title text-gray-300">ANYTHING CAN BE AN ALBUM COVER.</p>
          <p className="text-3xl text-gray-400 text-justify">The "Anything Can Be an Album Cover" challenge became a commentary on digital curation. By adding a simple <span className="text-gray-300">"Parental Advisory"</span> label, users showed how context could instantly transform a mundane photo into a piece of art with narrative depth.</p>
        </div>
        <p className="text-xl text-gray-400 text-right">To download an image, right click, then "save image as..."</p>

        {/* Gallery Section */}
        <div>

          {gallery.length === 0 && loading && (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          )}

          {gallery.length === 0 && !loading && (
            <>
              <div className={GRID_CLASSES}>
                <Editor />
              </div>
              <p className="text-2xl text-center title mt-16">No album covers yet. Create your first one!</p>
            </>
          )}

          {gallery.length > 0 && (
            <div className={GRID_CLASSES}>
              <Editor />
              {gallery.map((img, index) => (
                <GalleryImage key={index} src={img} alt={`Album ${index + 1}`} />
              ))}
            </div>
          )}

          {/* Loading indicator for infinite scroll */}
          {loading && gallery.length > 0 && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"></div>
              <p className="text-gray-500 mt-2">Loading more...</p>
            </div>
          )}

          {/* End of results indicator */}
          {!hasMore && gallery.length > 0 && (
            <div className="my-16">
              <p className="text-2xl text-center title text-gray-500">you have reached the end.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumCoverCreator;

const GalleryImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Don't render if src is empty, invalid, or if image failed to load
  if (!src || src.trim() === '' || error) {
    return null;
  }

  return (
    <div className="relative aspect-square overflow-hidden hover:ring-2 hover:ring-white/50 transition-all hover:scale-105 bg-black/40">
      {/* Skeleton/placeholder */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-800/50" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-[filter,opacity] duration-500 ${loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}
      />
    </div>
  );
});

GalleryImage.displayName = 'GalleryImage';