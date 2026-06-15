import React, { useEffect, useRef } from 'react';
import { useFeatures } from '../contexts/FeaturesContext';

const Turnstile = ({ onVerify }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const { features, loading } = useFeatures();

  useEffect(() => {
    if (loading) return;

    if (!features.captcha) {
      onVerify('captcha-disabled');
      return;
    }

    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.warn('VITE_TURNSTILE_SITE_KEY is missing in environment variables.');
      onVerify('captcha-disabled');
      return;
    }

    const renderWidget = () => {
      if (window.turnstile && containerRef.current) {
        try {
          if (widgetIdRef.current !== null) {
            window.turnstile.remove(widgetIdRef.current);
          }
          const widgetId = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => onVerify(token),
            'expired-callback': () => onVerify(null),
            'error-callback': () => onVerify(null)
          });
          widgetIdRef.current = widgetId;
        } catch (err) {
          console.error('Failed to render Turnstile widget:', err);
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.querySelector('script[src*="turnstile"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [onVerify, loading, features.captcha]);

  if (loading) return null;

  if (!features.captcha) {
    return (
      <div
        className="turnstile-wrapper"
        style={{ margin: '12px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}
      >
        CAPTCHA verification is currently disabled.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="turnstile-wrapper" style={{ margin: '12px 0', minHeight: '65px' }}></div>
  );
};

export default Turnstile;
