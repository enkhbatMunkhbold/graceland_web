import { useEffect, useRef } from 'react';

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
const SCRIPT_ID = 'cloudflare-turnstile-script';

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(window.turnstile), { once: true });
    script.addEventListener('error', reject, { once: true });
  });
}

function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return undefined;
    let widgetId;
    let active = true;
    loadTurnstile().then(turnstile => {
      if (!active || !turnstile || !containerRef.current) return;
      widgetId = turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: token => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    }).catch(() => onToken(''));
    return () => {
      active = false;
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="turnstile-widget" />;
}

export default TurnstileWidget;
