import React, { useState, useEffect } from 'react';
import { getFullImageUrl } from '../services/api';

interface HostAvatarProps {
  url?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export const HostAvatar: React.FC<HostAvatarProps> = ({
  url,
  name,
  size = 'md',
  className = '',
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const [cachedPhoto, setCachedPhoto] = useState<string | null>(() => {
    try {
      return localStorage.getItem('parkshare_host_avatar');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncAvatar = () => {
      try {
        const local = localStorage.getItem('parkshare_host_avatar');
        if (local) setCachedPhoto(local);
      } catch {}
    };
    syncAvatar();
    window.addEventListener('storage', syncAvatar);
    return () => window.removeEventListener('storage', syncAvatar);
  }, [url]);

  // Reset error when URL or cachedPhoto changes
  useEffect(() => {
    setHasError(false);
  }, [url, cachedPhoto]);

  const initial = (name?.trim()?.charAt(0) || 'H').toUpperCase();
  const dimensionClass = sizeClasses[size] || sizeClasses.md;

  const isDataUrl = (src?: string | null) => Boolean(src && (src.startsWith('data:') || src.startsWith('blob:')));

  // Prefer high-speed local data: URL if available to avoid 404s and network lag
  const chosenSrc = (isDataUrl(cachedPhoto) ? cachedPhoto : null) || (isDataUrl(url) ? url : null) || url || cachedPhoto;
  const imageSrc = chosenSrc ? getFullImageUrl(chosenSrc) : null;

  if (imageSrc && !hasError) {
    return (
      <img
        src={imageSrc}
        alt={name || 'Host'}
        onError={() => {
          // If remote network URL failed, but we have a data URL in cachedPhoto, try it
          if (chosenSrc !== cachedPhoto && isDataUrl(cachedPhoto)) {
            setCachedPhoto(cachedPhoto);
          } else {
            setHasError(true);
          }
        }}
        onClick={onClick}
        className={`${dimensionClass} rounded-full object-cover border border-emerald-500/40 shadow-2xs flex-shrink-0 ${className}`}
      />
    );
  }

  // Graceful fallback: Clean, stylish gradient with host initial
  return (
    <div
      onClick={onClick}
      className={`${dimensionClass} rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-700 to-teal-600 text-white font-black flex items-center justify-center shadow-2xs flex-shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
};

export default HostAvatar;
