/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRODUCT_LIVE_PIN?: string;
  readonly VITE_LIVE_CAMERA_STREAM_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_DATABASE_URL?: string;
}

declare module '*.mp4' {
  const url: string;
  export default url;
}

declare module '*.PNG' { const url: string; export default url; }
