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
      // Garante que os refs ainda estão atuais quando o timeout dispara
      const currentContainer = containerRef.current;
      const currentText = textRef.current;

      if (currentContainer && currentText) {
        const containerWidth = currentContainer.offsetWidth;
        const textWidth = currentText.offsetWidth;

        if (textWidth > containerWidth) {
          setIsAnimating(true);
          // Verifica explicitamente se animationSpeed é positivo para evitar divisão por zero ou NaN
          if (typeof animationSpeed === 'number' && animationSpeed > 0) {
            const distanceToTravel = textWidth + containerWidth; 
            const duration = distanceToTravel / animationSpeed;
            setAnimationDuration(`${duration}s`);
          } else {
            // Fallback se animationSpeed não for positivo, efetivamente sem animação
            // ou se animationSpeed for undefined/null (embora haja um default)
            console.warn('MarqueeText: animationSpeed inválido ou zero. Animação desabilitada.', animationSpeed);
            setIsAnimating(false); 
            setAnimationDuration('0s');
          }
        } else {
          setIsAnimating(false);
          setAnimationDuration('0s');
        }
      } else {
        // Se os refs forem nulos (por exemplo, componente desmontado pouco antes do timeout), 
        // garante que a animação pare.
        setIsAnimating(false);
        setAnimationDuration('0s');
      }
    };

    const timeoutId = setTimeout(checkOverflow, 50);

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