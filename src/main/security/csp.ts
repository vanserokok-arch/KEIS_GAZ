export const APP_CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; " +
  "font-src 'self' data:; " +
  "connect-src 'self' http://127.0.0.1:5173 ws://127.0.0.1:5173; " +
  "object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
