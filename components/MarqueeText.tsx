import React, { useState, useLayoutEffect, useRef } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  animationSpeed?: number; // pixels per second
}

const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  animationSpeed = 40, // Default speed: 40 pixels per second
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDuration, setAnimationDuration] = useState('0s');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;

        if (textWidth > containerWidth) {
          setIsAnimating(true);
          // Duration for the text to travel its own width plus the container width
          // for the chosen keyframes (translateX(100%) to translateX(-100%))
          const distanceToTravel = textWidth + containerWidth; 
          const duration = distanceToTravel / animationSpeed;
          setAnimationDuration(`${duration}s`);
        } else {
          setIsAnimating(false);
          setAnimationDuration('0s');
        }
      } else {
        setIsAnimating(false);
        setAnimationDuration('0s');
      }
    };

    // Check initially and on text change
    // A slight delay can help ensure styles are applied and offsetWidth is accurate
    const timeoutId = setTimeout(checkOverflow, 50);

    // Optional: Re-check on window resize if the container width is relative
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkOverflow);
    };

  }, [text, animationSpeed]);

  return (
    <div
      ref={containerRef}
      className={`marquee-container ${className}`}
      aria-label={text} 
    >
      <span
        ref={textRef}
        className={isAnimating ? 'marquee-text-content' : ''}
        style={isAnimating ? { animationDuration } : {}}
      >
        {text}
      </span>
    </div>
  );
};

export default MarqueeText;
