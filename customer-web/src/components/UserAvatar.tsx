import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getFullImageUrl } from '../services/api';

interface UserAvatarProps {
  user?: User | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
  fallbackPhoto?: string;
}

// High-quality friendly default driver avatar photo
const DEFAULT_AVATAR_PHOTO = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80';

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showBorder = true,
  fallbackPhoto = DEFAULT_AVATAR_PHOTO,
}) => {
  const [imageError, setImageError] = useState(false);

  // Size mappings
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };

  const borderClass = showBorder
    ? 'ring-2 ring-emerald-500/40 dark:ring-emerald-400/40 border-2 border-white dark:border-slate-800'
    : '';

  // Reset error when user photo changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profile_photo_url]);

  // Resolve profile image URL
  const getFullPhotoUrl = (url?: string) => {
    if (!url) return null;
    return getFullImageUrl(url);
  };

  const userPhoto = user?.profile_photo_url ? getFullPhotoUrl(user.profile_photo_url) : null;
  const photoUrl = (!imageError && userPhoto) ? userPhoto : (!imageError && fallbackPhoto ? fallbackPhoto : null);
  const initial = user?.full_name ? user.full_name.trim().charAt(0).toUpperCase() : 'V';

  if (photoUrl && !imageError) {
    return (
      <div className={`relative inline-block rounded-full overflow-hidden flex-shrink-0 shadow-xs ${sizeClasses[size]} ${borderClass} ${className}`}>
        <img
          src={photoUrl}
          alt={user?.full_name || 'Driver Profile'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white font-black flex items-center justify-center flex-shrink-0 shadow-xs ${sizeClasses[size]} ${borderClass} ${className}`}
      title={user?.full_name || 'Driver'}
    >
      {user?.full_name ? (
        <span>{initial}</span>
      ) : (
        <span className="text-[10px]">P</span>
      )}
    </div>
  );
};

