'use client';

import { useState } from 'react';

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const safeImages = images.filter(Boolean);
  if (!safeImages.length) return null;
  return (
    <div className="product-gallery">
      <div className="detail-image-wrap">
        <img className="gallery-main-image" src={safeImages[active]} alt={`${name} - image ${active + 1}`} />
        <span className="detail-tag">FASHIONYAPA · VIRAL COMBO</span>
      </div>
      <div className="gallery-thumbnails" role="tablist" aria-label={`${name} product images`}>
        {safeImages.map((image, index) => (
          <button key={image} type="button" className={index === active ? 'gallery-thumb active' : 'gallery-thumb'} onClick={() => setActive(index)} aria-label={`View image ${index + 1}`} aria-selected={index === active}>
            <img src={image} alt={`${name} thumbnail ${index + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
