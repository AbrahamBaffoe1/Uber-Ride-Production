/**
 * Simple UUID polyfill for environments without crypto.getRandomValues support
 */
export function generateUUID(): string {
  const chars = '0123456789abcdef';
  let uuid = '';
  
  // Generate a simple random UUID pattern
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4 UUID
    } else {
      const randomIndex = Math.floor(Math.random() * 16);
      uuid += chars[randomIndex];
    }
  }
  
  return uuid;
}

// Polyfill for crypto.getRandomValues if not available
if (typeof global !== 'undefined' && 
    (!global.crypto || !global.crypto.getRandomValues)) {
  // Define a simple polyfill
  global.crypto = {
    ...global.crypto,
    // Use any to bypass the strict TypeScript checking
    getRandomValues: function<T extends ArrayBufferView | null>(array: T): T {
      if (!array) return array;
      
      const length = (array as any).length;
      if (length) {
        for (let i = 0; i < length; i++) {
          (array as any)[i] = Math.floor(Math.random() * 256);
        }
      }
      return array;
    }
  } as any;
  
  console.log('[UUID Polyfill] Applied crypto.getRandomValues polyfill');
}
