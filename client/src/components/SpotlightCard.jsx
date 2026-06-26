import { useRef, useState } from 'react';
import './SpotlightCard.css';

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(29, 185, 84, 0.15)',
  spotlightSize = 200,
  ...props
}) {
  const cardRef = useRef(null);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, active: false });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setSpotlight((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--spotlight-x': `${spotlight.x}px`,
        '--spotlight-y': `${spotlight.y}px`,
        '--spotlight-color': spotlightColor,
        '--spotlight-size': `${spotlightSize}px`,
        '--spotlight-opacity': spotlight.active ? 1 : 0,
      }}
      {...props}
    >
      <div className="spotlight-bg" />
      {children}
    </div>
  );
}
