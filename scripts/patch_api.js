const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'customer-web', 'src', 'services', 'api.ts');
let code = fs.readFileSync(filePath, 'utf8');

// Replace resolveBackendBase() block: from 'function resolveBackendBase(): string {' to 'const API_BASE = `${BACKEND_BASE}/api/v1`;'
const startToken = 'function resolveBackendBase(): string {';
const endToken = 'const API_BASE = `${BACKEND_BASE}/api/v1`;';

const startIndex = code.indexOf(startToken);
const endIndex = code.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
  const newHeader = `function resolveBackendBase(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('parkshare_custom_backend');
    if (custom) return custom.replace(/\\/+$/, '');
  }

  // If running inside Capacitor Native Android/iOS App
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.platform === 'android' || (window as any).Capacitor?.platform === 'ios');
  if (isCapacitor) {
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('parkshare_active_backend');
      if (active) return active;
    }
    // Default to localhost:8000 (ADB reverse over USB)
    return 'http://localhost:8000';
  }

  if (rawApiUrl) {
    return rawApiUrl.replace(/\\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port === '5173' || port === '5174') {
      return '';
    }
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    if (host === '10.0.2.2') {
      return 'http://10.0.2.2:8000';
    }
    if (/^(192\\.168\\.|10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.)/.test(host)) {
      return \`http://\${host}:8000\`;
    }
  }
  return 'http://localhost:8000';
}

export let BACKEND_BASE = resolveBackendBase();
const API_BASE = \`\${BACKEND_BASE}/api/v1\`;

if (typeof window !== 'undefined') {
  const isCapacitor = Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.platform === 'android' || (window as any).Capacitor?.platform === 'ios');
  if (isCapacitor) {
    fetch(\`\${BACKEND_BASE}/health\`, { method: 'GET' }).catch(() => {
      const fallback = BACKEND_BASE.includes('localhost') ? 'http://192.168.1.17:8000' : 'http://localhost:8000';
      fetch(\`\${fallback}/health\`, { method: 'GET' })
        .then(() => {
          BACKEND_BASE = fallback;
          localStorage.setItem('parkshare_active_backend', fallback);
        })
        .catch(() => {});
    });
  }
}`;

  code = code.substring(0, startIndex) + newHeader + code.substring(endIndex + endToken.length);
  console.log('Successfully replaced resolveBackendBase');
} else {
  console.error('Could not find start/end tokens for resolveBackendBase');
}

// Replace safeFetch function
const safeFetchStart = 'async function safeFetch(url: string, options?: RequestInit): Promise<Response> {';
const safeFetchEnd = 'export const api = {';

const sfStartIndex = code.indexOf(safeFetchStart);
const sfEndIndex = code.indexOf(safeFetchEnd);

if (sfStartIndex !== -1 && sfEndIndex !== -1) {
  const newSafeFetch = `async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.platform === 'android' || (window as any).Capacitor?.platform === 'ios');

  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (isCapacitor && (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch'))) {
      const candidates = [
        'http://localhost:8000',
        'http://192.168.1.17:8000',
      ];
      for (const cand of candidates) {
        if (!url.startsWith(cand)) {
          const altUrl = url.replace(BACKEND_BASE, cand);
          try {
            const res = await fetch(altUrl, options);
            BACKEND_BASE = cand;
            if (typeof window !== 'undefined') {
              localStorage.setItem('parkshare_active_backend', cand);
            }
            return res;
          } catch {}
        }
      }
    }
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch')) {
      throw new Error(\`Unable to reach ParkCo server at \${BACKEND_BASE}. Please ensure your PC backend is running and USB or Wi-Fi is connected.\`);
    }
    throw err;
  }
}

`;
  code = code.substring(0, sfStartIndex) + newSafeFetch + code.substring(sfEndIndex);
  console.log('Successfully replaced safeFetch');
} else {
  console.error('Could not find start/end tokens for safeFetch');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Finished updating api.ts');
