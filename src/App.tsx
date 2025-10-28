import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useGalleryStore, useToastStore } from './store';
import Editor from './components/Editor';
import Toast from './components/Toast';
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

  const { addToast } = useToastStore();

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
        if (offset === 0) {
          addToast('Unable to load gallery. You can still create and download covers locally.', 'warning');
        }
        return;
      }

      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }

      // Convert each file to a public URL
      const validFiles = data.filter(file =>
        !file.name.endsWith('/') &&
        file.name !== '.emptyFolderPlaceholder' &&
        file.name !== '.emptyFolderPlaceholder/'
      );

      // Batch URL generation - more efficient than calling getPublicUrl in a loop
      const urls = validFiles
        .map(file => {
          // Construct URL directly instead of API call (getPublicUrl doesn't need API)
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
      if (offset === 0) {
        addToast('Unable to connect to gallery. You can still create and download covers locally.', 'error');
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset, addToGallery, setOffset, setHasMore, setLoading, addToast]);

  // Load gallery on mount
  useEffect(() => {
    // Reset gallery state and load initial images
    resetGallery();
    loadMoreImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Scroll event handler with throttling
  useEffect(() => {
    let throttleTimeout: number | null = null;

    const handleScroll = () => {
      if (throttleTimeout) return;

      throttleTimeout = window.setTimeout(() => {
        if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - SCROLL_THRESHOLD) {
          loadMoreImages();
        }
        throttleTimeout = null;
      }, 200); // Throttle to once per 200ms
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [loadMoreImages]);


  return (
    <div className="min-h-screen text-white p-8" id="app">
      <Toast />
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
                <GalleryImage key={img} src={img} alt={`Album ${index + 1}`} />
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
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

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
        ref={imgRef}
        src={inView ? src : undefined}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-[filter,opacity] duration-500 ${loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}
      />
    </div>
  );
});

GalleryImage.displayName = 'GalleryImage';