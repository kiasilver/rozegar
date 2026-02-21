"use client";

import { useState } from 'react';

interface BlogImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  unoptimized?: boolean;
  fill?: boolean;
}

export default function BlogImage({
  src,
  alt,
  width = 1200,
  height = 630,
  className = "w-full h-auto rounded-lg",
  priority = false,
  unoptimized = false,
  fill = false,
}: BlogImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && imgSrc !== '/images/logo/logo.png') {
      setHasError(true);
      setImgSrc('/images/logo/logo.png');
    }
  };

  if (fill) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        onError={handleError}
        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      onError={handleError}
    />
  );
}

