export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'wecond',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '769279478968421',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'wecond'
}; 