import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getActivePopups, trackPopupView, trackPopupClick } from '../lib/api';

const STORAGE_PREFIX = 'disccart_popup_';

function getPageKey(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/coupons')) return 'coupons';
  if (pathname.startsWith('/deals')) return 'deals';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/stores')) return 'stores';
  if (pathname.startsWith('/category')) return 'categories';
  return 'other';
}

function getDeviceType() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function shouldShow(popup) {
  const freq = popup.frequency || 'once_per_session';
  const key = `${STORAGE_PREFIX}${popup.id}`;

  if (freq === 'once_per_session') {
    return !sessionStorage.getItem(key);
  }
  if (freq === 'once_per_day') {
    const last = localStorage.getItem(key);
    if (!last) return true;
    return (Date.now() - parseInt(last)) > 86400000;
  }
  return true;
}

function markShown(popup) {
  const key = `${STORAGE_PREFIX}${popup.id}`;
  const freq = popup.frequency || 'once_per_session';
  if (freq === 'once_per_session') {
    sessionStorage.setItem(key, '1');
  } else if (freq === 'once_per_day') {
    localStorage.setItem(key, Date.now().toString());
  }
}

function matchesPage(popup, pageKey) {
  const targets = popup.target_pages || [];
  if (!targets.length) return true;
  return targets.includes(pageKey);
}

function matchesDevice(popup) {
  const targets = popup.target_devices || [];
  if (!targets.length) return true;
  return targets.includes(getDeviceType());
}

const animations = {
  slide_up: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
  },
  slide_down: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -100, opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { scale: 0.7, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.7, opacity: 0 },
  },
  bounce: {
    initial: { scale: 0.3, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.3, opacity: 0 },
  },
};

function PopupOverlay({ popup, onClose }) {
  const anim = animations[popup.animation_style] || animations.scale;
  const hasMedia = popup.image_url || popup.video_url;

  useEffect(() => {
    trackPopupView(popup.id);
  }, [popup.id]);

  const handleCTA = () => {
    trackPopupClick(popup.id);
    if (popup.cta_link) {
      window.open(popup.cta_link, '_blank', 'noopener');
    }
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[8000] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid={`popup-overlay-${popup.id}`}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Popup Card */}
      <motion.div
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        {...anim}
        transition={popup.animation_style === 'bounce'
          ? { type: 'spring', stiffness: 300, damping: 20 }
          : { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
        }
        data-testid={`popup-card-${popup.id}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
          data-testid={`popup-close-${popup.id}`}
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Media */}
        {popup.video_url ? (
          <div className="w-full aspect-video bg-gray-100">
            <video
              src={popup.video_url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        ) : popup.image_url ? (
          <div className="w-full aspect-[16/10] bg-gray-100">
            <img
              src={popup.image_url}
              alt={popup.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        ) : null}

        {/* Content */}
        <div className={`p-6 ${!hasMedia ? 'pt-10' : ''}`}>
          {popup.title && (
            <h3 className="font-display font-black text-xl sm:text-2xl text-gray-900 mb-2 leading-tight">
              {popup.title}
            </h3>
          )}
          {popup.description && (
            <p className="text-gray-500 text-sm leading-relaxed mb-5">
              {popup.description}
            </p>
          )}
          {popup.cta_text && (
            <button
              onClick={handleCTA}
              className="w-full py-3 px-6 bg-[#ee922c] hover:bg-[#d9811f] text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-orange-200"
              data-testid={`popup-cta-${popup.id}`}
            >
              {popup.cta_text}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PopupManager() {
  const [popups, setPopups] = useState([]);
  const [activePopup, setActivePopup] = useState(null);
  const location = useLocation();
  const exitListenerRef = useRef(false);
  const scrollListenerRef = useRef(false);
  const timerRef = useRef(null);

  // Load active popups on mount
  useEffect(() => {
    getActivePopups().then(setPopups).catch(() => {});
  }, []);

  // Evaluate popups when route changes or popups load
  useEffect(() => {
    if (!popups.length || activePopup) return;

    const pageKey = getPageKey(location.pathname);
    const eligible = popups.filter(p =>
      shouldShow(p) && matchesPage(p, pageKey) && matchesDevice(p)
    );

    if (!eligible.length) return;

    // Sort by priority (highest first), take the best one
    eligible.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const popup of eligible) {
      const trigger = popup.trigger || 'on_load';

      if (trigger === 'on_load') {
        const delay = (popup.delay_seconds || 3) * 1000;
        timerRef.current = setTimeout(() => {
          showPopup(popup);
        }, delay);
        break;
      }

      if (trigger === 'time_delay') {
        const delay = (popup.delay_seconds || 5) * 1000;
        timerRef.current = setTimeout(() => {
          showPopup(popup);
        }, delay);
        break;
      }

      if (trigger === 'exit_intent' && !exitListenerRef.current) {
        exitListenerRef.current = true;
        const handler = (e) => {
          if (e.clientY <= 5) {
            showPopup(popup);
            document.removeEventListener('mouseout', handler);
            exitListenerRef.current = false;
          }
        };
        document.addEventListener('mouseout', handler);
        break;
      }

      if (trigger === 'on_scroll' && !scrollListenerRef.current) {
        scrollListenerRef.current = true;
        const pct = popup.scroll_percent || 50;
        const handler = () => {
          const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
          if (scrolled >= pct) {
            showPopup(popup);
            window.removeEventListener('scroll', handler);
            scrollListenerRef.current = false;
          }
        };
        window.addEventListener('scroll', handler, { passive: true });
        break;
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [popups, location.pathname, activePopup]);

  const showPopup = (popup) => {
    if (activePopup) return;
    markShown(popup);
    setActivePopup(popup);
  };

  const handleClose = () => {
    setActivePopup(null);
  };

  return (
    <AnimatePresence>
      {activePopup && (
        <PopupOverlay
          key={activePopup.id}
          popup={activePopup}
          onClose={handleClose}
        />
      )}
    </AnimatePresence>
  );
}
