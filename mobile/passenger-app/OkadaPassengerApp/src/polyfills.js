/**
 * Polyfills for React Native
 * Fixes URL.protocol and other missing web APIs
 */

// URL polyfill for React Native
if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    constructor(url, base) {
      if (base) {
        // Simple base URL resolution
        if (url.startsWith('/')) {
          const baseUrl = new URL(base);
          this.href = baseUrl.protocol + '//' + baseUrl.host + url;
        } else if (url.startsWith('http')) {
          this.href = url;
        } else {
          this.href = base.endsWith('/') ? base + url : base + '/' + url;
        }
      } else {
        this.href = url;
      }
      
      this._parse();
    }
    
    _parse() {
      try {
        const match = this.href.match(/^(https?:)\/\/([^\/]+)(\/.*)?$/);
        if (match) {
          this.protocol = match[1];
          this.host = match[2];
          this.pathname = match[3] || '/';
          
          const hostParts = this.host.split(':');
          this.hostname = hostParts[0];
          this.port = hostParts[1] || (this.protocol === 'https:' ? '443' : '80');
          
          const pathParts = this.pathname.split('?');
          this.pathname = pathParts[0];
          this.search = pathParts[1] ? '?' + pathParts[1] : '';
          
          const searchParts = this.search.split('#');
          this.search = searchParts[0];
          this.hash = searchParts[1] ? '#' + searchParts[1] : '';
          
          this.origin = this.protocol + '//' + this.host;
        } else {
          // Fallback for non-HTTP URLs
          this.protocol = 'file:';
          this.host = '';
          this.hostname = '';
          this.port = '';
          this.pathname = this.href;
          this.search = '';
          this.hash = '';
          this.origin = 'file://';
        }
      } catch (e) {
        // Fallback values
        this.protocol = 'http:';
        this.host = 'localhost';
        this.hostname = 'localhost';
        this.port = '80';
        this.pathname = '/';
        this.search = '';
        this.hash = '';
        this.origin = 'http://localhost';
      }
    }
    
    toString() {
      return this.href;
    }
  };
}

// URLSearchParams polyfill
if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
    constructor(init) {
      this.params = new Map();
      
      if (typeof init === 'string') {
        if (init.startsWith('?')) {
          init = init.slice(1);
        }
        
        init.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
          }
        });
      }
    }
    
    get(name) {
      return this.params.get(name);
    }
    
    set(name, value) {
      this.params.set(name, value);
    }
    
    has(name) {
      return this.params.has(name);
    }
    
    delete(name) {
      this.params.delete(name);
    }
    
    toString() {
      const pairs = [];
      for (const [key, value] of this.params) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
      }
      return pairs.join('&');
    }
  };
}

// Console polyfills for better debugging
if (typeof console.debug === 'undefined') {
  console.debug = console.log;
}

if (typeof console.info === 'undefined') {
  console.info = console.log;
}

console.log('[Polyfills] URL and URLSearchParams polyfills loaded');
