import { useRef, useEffect, useState } from 'react';
import './FadeContent.css';

export default function FadeContent({
  children,
  blur = false,
  duration = 800,
  delay = 0,
  threshold = 0.1,
  className = '',
  style,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`fade-content ${visible ? 'fade-content--visible' : ''} ${blur ? 'fade-content--blur' : ''} ${className}`}
      style={{
        '--fade-duration': `${duration}ms`,
        '--fade-delay': `${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
