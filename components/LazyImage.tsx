import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!src) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '150px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20">
        <ImageIcon size={20} />
      </div>
    );
  }

  return (
    <div ref={imgRef} className="relative w-full h-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
      {isInView ? (
        <>
          <img
            src={src}
            alt={alt}
            className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            onLoad={() => setIsLoaded(true)}
            {...props}
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-white/5">
              <Loader2 className="animate-spin text-emerald-500" size={18} />
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-white/20">
          <ImageIcon size={18} />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
