import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSlides } from '../lib/api';

export default function HeroSlider() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef(null);
  const touchStart = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSlides();
        setSlides(data);
      } catch { setSlides([]); }
    })();
  }, []);

  const goTo = useCallback((index) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPlaying && slides.length > 1) {
      intervalRef.current = setInterval(next, 4000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, slides.length, next]);

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
  };

  if (slides.length === 0) return null;

  const slide = slides[current];

  const variants = {
    enter: (d) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-sm"
      style={{ backgroundColor: slide.bg_color || '#f3f4f6' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="hero-slider"
    >
      <div className="relative aspect-[21/9] sm:aspect-[3/1]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            {slide.image_url && (
              <img
                src={slide.image_url}
                alt={slide.title || `Slide ${current + 1}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            )}

            {/* Text Overlay */}
            {(slide.title || slide.subtitle || slide.btn_text) && (
              <div className="absolute inset-0 flex items-center px-6 sm:px-12 bg-gradient-to-r from-black/50 via-black/20 to-transparent">
                <div className="max-w-lg text-white">
                  {slide.title && (
                    <h2 className="font-black text-xl sm:text-3xl lg:text-4xl mb-2 drop-shadow-lg leading-tight">{slide.title}</h2>
                  )}
                  {slide.subtitle && (
                    <p className="text-sm sm:text-base text-white/90 mb-4 drop-shadow">{slide.subtitle}</p>
                  )}
                  {slide.btn_text && slide.btn_link && (
                    <a
                      href={slide.btn_link}
                      target={slide.btn_link.startsWith('http') ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      className="inline-block bg-[#ee922c] hover:bg-[#d97b1c] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-lg"
                      data-testid="slider-cta"
                    >
                      {slide.btn_text}
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav Arrows */}
        {slides.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-colors z-10" data-testid="slider-prev">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-colors z-10" data-testid="slider-next">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bottom: Dots + Pause */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/50 w-2'}`}
                data-testid={`slider-dot-${i}`}
              />
            ))}
            <button onClick={() => setIsPlaying(p => !p)} className="ml-1 text-white/80 hover:text-white" data-testid="slider-toggle-play">
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
