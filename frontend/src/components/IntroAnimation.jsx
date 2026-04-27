import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_coupon-hub-35/artifacts/3o6cjbcz_IMG_2340.jpeg';

export default function IntroAnimation({ onComplete }) {
  const [phase, setPhase] = useState('enter'); // enter, fill, exit, done
  const [show, setShow] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem('disccart_intro_seen');
    if (seen) {
      setShow(false);
      onComplete?.();
      return;
    }

    const t1 = setTimeout(() => setPhase('fill'), 600);
    const t2 = setTimeout(() => setPhase('exit'), 2000);
    const t3 = setTimeout(() => {
      setPhase('done');
      sessionStorage.setItem('disccart_intro_seen', '1');
      onComplete?.();
    }, 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (!show || phase === 'done') return null;

  const dealItems = [
    { icon: '💰', delay: 0, x: -30, y: -80 },
    { icon: '🏷️', delay: 0.08, x: 20, y: -90 },
    { icon: '✂️', delay: 0.15, x: -10, y: -100 },
    { icon: '⭐', delay: 0.22, x: 30, y: -70 },
    { icon: '%', delay: 0.1, x: -20, y: -85, isText: true },
  ];

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: 'linear-gradient(135deg, #FFF8F0 0%, #F0F9F0 40%, #E8F5E9 65%, #FFF3E0 100%)' }}
          data-testid="intro-animation"
        >
          {/* Subtle bg circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#ee922c]/5 blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-[#3c7b48]/5 blur-3xl" />
          </div>

          <div className="relative">
            {/* Cart Logo */}
            <motion.div
              className="relative"
              initial={{ x: -300, opacity: 0, scale: 0.6 }}
              animate={
                phase === 'enter' ? { x: 0, opacity: 1, scale: 1 } :
                phase === 'fill' ? { x: 0, opacity: 1, scale: 1.05, y: 0 } :
                { y: -400, opacity: 0, scale: 0.8, rotate: -5 }
              }
              transition={
                phase === 'enter' ? { type: 'spring', stiffness: 120, damping: 15, mass: 0.8 } :
                phase === 'fill' ? { type: 'spring', stiffness: 200, damping: 12 } :
                { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
              }
            >
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={phase === 'fill' ? {
                  boxShadow: ['0 0 0px rgba(238,146,44,0)', '0 0 40px rgba(238,146,44,0.3)', '0 0 0px rgba(238,146,44,0)']
                } : {}}
                transition={{ duration: 1, repeat: 1 }}
                style={{ margin: '-20px' }}
              />

              {/* Shadow */}
              <motion.div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/10 rounded-full blur-md"
                animate={phase === 'exit' ? { opacity: 0, scaleX: 0.3 } : { opacity: 1 }}
              />

              <img
                src={LOGO_URL}
                alt="DISCCART"
                className="w-28 h-28 sm:w-36 sm:h-36 object-contain relative z-10 drop-shadow-xl"
              />

              {/* Basket open illusion — slight top wiggle */}
              {phase === 'fill' && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-1/3 z-20"
                  animate={{ y: [0, -3, 0, -2, 0] }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                />
              )}
            </motion.div>

            {/* Deal items falling into cart */}
            {phase === 'fill' && dealItems.map((item, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 z-30"
                initial={{ x: item.x, y: item.y, opacity: 1, scale: 1 }}
                animate={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                transition={{
                  duration: 0.5,
                  delay: item.delay,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                {item.isText ? (
                  <span className="text-2xl font-black text-[#ee922c] drop-shadow-sm">%</span>
                ) : (
                  <span className="text-2xl drop-shadow-sm">{item.icon}</span>
                )}
              </motion.div>
            ))}

            {/* Bounce effect when filled */}
            {phase === 'fill' && (
              <motion.div
                className="absolute inset-0 z-5"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.08, 0.97, 1.03, 1] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              />
            )}

            {/* Brand text */}
            <motion.div
              className="text-center mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={
                phase === 'exit' ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }
              }
              transition={{ delay: phase === 'enter' ? 0.3 : 0, duration: 0.4 }}
            >
              <h1
                className="font-display font-black text-3xl sm:text-4xl tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #3c7b48 0%, #2d9e4b 40%, #ee922c 70%, #e8751a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                DISCCART
              </h1>
              <motion.p
                className="text-gray-400 text-sm font-medium mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Best Deals, Smart Savings
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
