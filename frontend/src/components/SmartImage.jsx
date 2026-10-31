import { UtensilsCrossed } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SmartImage({ src, alt, className = '', imgClassName = '', eager = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-brand-100 via-orange-50 to-cream-200 text-brand-400 ${className}`}
        aria-label={alt}
      >
        <UtensilsCrossed size={34} strokeWidth={1.4} />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-stone-100 ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </div>
  );
}
