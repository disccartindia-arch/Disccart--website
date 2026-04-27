import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics Measurement ID (GA4)
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Facebook Pixel ID
const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.log('Google Analytics: No measurement ID configured');
    return;
  }

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    send_page_view: false // We'll send page views manually
  });

  console.log('Google Analytics initialized:', GA_MEASUREMENT_ID);
};

// Track page views
export const trackPageView = (path) => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path
  });
};

// Track custom events
export const trackEvent = (action, category, label, value) => {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  });
};

// Track coupon reveal
export const trackCouponReveal = (couponId, brandName, discountValue) => {
  trackEvent('coupon_reveal', 'engagement', brandName, discountValue);
  fbTrackEvent('ViewContent', {
    content_ids: [couponId],
    content_type: 'coupon',
    content_name: brandName
  });
};

// Track coupon copy
export const trackCouponCopy = (couponId, brandName, code) => {
  trackEvent('coupon_copy', 'conversion', `${brandName}_${code}`);
  fbTrackEvent('Lead', {
    content_ids: [couponId],
    content_name: brandName
  });
};

// Track affiliate click
export const trackAffiliateClick = (couponId, brandName, url) => {
  trackEvent('affiliate_click', 'conversion', brandName);
  fbTrackEvent('InitiateCheckout', {
    content_ids: [couponId],
    content_name: brandName
  });
};

// Initialize Facebook Pixel
export const initFBPixel = () => {
  if (!FB_PIXEL_ID) {
    console.log('Facebook Pixel: No pixel ID configured');
    return;
  }

  // Facebook Pixel base code
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  
  window.fbq('init', FB_PIXEL_ID);
  window.fbq('track', 'PageView');

  console.log('Facebook Pixel initialized:', FB_PIXEL_ID);
};

// Track Facebook Pixel events
export const fbTrackEvent = (eventName, params = {}) => {
  if (!FB_PIXEL_ID || !window.fbq) return;
  
  window.fbq('track', eventName, params);
};

// Track Facebook page view
export const fbTrackPageView = () => {
  if (!FB_PIXEL_ID || !window.fbq) return;
  
  window.fbq('track', 'PageView');
};

// Analytics Provider Component
export function AnalyticsProvider({ children }) {
  const location = useLocation();

  // Initialize analytics on mount
  useEffect(() => {
    initGA();
    initFBPixel();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname + location.search);
    fbTrackPageView();
  }, [location]);

  return children;
}

// Hook to use analytics
export function useAnalytics() {
  return {
    trackEvent,
    trackCouponReveal,
    trackCouponCopy,
    trackAffiliateClick,
    fbTrackEvent
  };
}

export default AnalyticsProvider;
