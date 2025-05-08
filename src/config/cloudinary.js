export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'wecondteste',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '769279478968421',
  apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET || 'NrEvGrXzKpH62su_vmJtjwEqsXk',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'wecondteste',
  
  // Verifique no Dashboard do Cloudinary se existem estes presets configurados
  // Para criar um preset unsigned: Settings -> Upload -> Upload presets -> Add upload preset
  // Em Signing Mode, selecione "Unsigned"
  unsignedUploadPreset: import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET || 'wecondteste',
  
  // Para criar um preset signed: Settings -> Upload -> Upload presets -> Add upload preset
  // Em Signing Mode, selecione "Signed"
  signedUploadPreset: import.meta.env.VITE_CLOUDINARY_SIGNED_PRESET || 'wecondteste_signed'
}; 