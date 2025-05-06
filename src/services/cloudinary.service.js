import { CLOUDINARY_CONFIG } from '../config/cloudinary';

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} resourceType - Resource type (auto, image, video, raw)
 * @returns {Promise<Object>} - Upload result with url, publicId, etc.
 */
export const uploadToCloudinary = async (file, resourceType = 'auto') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.unsignedUploadPreset);
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  
  // Adicionar timestamp para garantir que a requisição não seja considerada expirada
  const timestamp = Math.floor(Date.now() / 1000);
  formData.append('timestamp', timestamp.toString());

  console.log('Tentando upload para Cloudinary:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    cloudName: CLOUDINARY_CONFIG.cloudName,
    uploadPreset: CLOUDINARY_CONFIG.unsignedUploadPreset,
    resourceType,
    apiKey: CLOUDINARY_CONFIG.apiKey.substring(0, 5) + '...' // Exibe apenas parte da chave por segurança
  });

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
  console.log('URL de upload:', uploadUrl);

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        // Não incluir 'Content-Type' pois o browser definirá automaticamente com o boundary correto para o FormData
      },
      body: formData
    });
    
    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resposta de erro do Cloudinary:', errorText);
      
      // Tenta analisar o JSON de erro, se possível
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Detalhes do erro:', errorJson);
      } catch (e) {
        // Se não for JSON, apenas loga o texto
      }
      
      throw new Error(`Upload falhou: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Upload bem-sucedido:', data);
    
    return {
      name: file.name,
      type: file.type.split('/')[0],
      url: data.secure_url,
      publicId: data.public_id,
      size: file.size
    };
  } catch (error) {
    console.error('Erro detalhado no upload para Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @returns {Promise<boolean>} - Whether the deletion was successful
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    console.error('Tentativa de deletar arquivo sem publicId');
    return false;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await generateSignature(`public_id=${publicId}&timestamp=${timestamp}`);
    
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    const result = await response.json();
    console.log('Resultado da deleção:', result);
    
    return result.result === 'ok';
  } catch (error) {
    console.error('Erro ao deletar arquivo do Cloudinary:', error);
    return false;
  }
};

/**
 * Generate a signature for Cloudinary API requests that require authentication
 * Note: For security, this should be done server-side
 * @param {string} paramsToSign - Parameters to include in the signature
 * @returns {Promise<string>} - The signature
 */
const generateSignature = async (paramsToSign) => {
  // This is a simplified client-side implementation
  // In a production environment, this should be done server-side
  console.warn('Signature generation should be done server-side for security');
  
  // Note: This is not secure for production use
  // A proper backend endpoint should be used to generate signatures
  const encoder = new TextEncoder();
  const data = encoder.encode(paramsToSign + CLOUDINARY_CONFIG.apiSecret);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Versão alternativa do upload para Cloudinary usando assinatura
 * @param {File} file - The file to upload
 * @param {string} resourceType - Resource type (auto, image, video, raw)
 * @returns {Promise<Object>} - Upload result with url, publicId, etc.
 */
export const uploadToCloudinaryWithSignature = async (file, resourceType = 'auto') => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "uploads"; // Pasta onde os arquivos serão armazenados
  
  // Gerar assinatura - esta é a parte crítica
  // Para assinaturas, incluímos todos os parâmetros relevantes
  const params = `folder=${folder}&timestamp=${timestamp}&upload_preset=${CLOUDINARY_CONFIG.signedUploadPreset}`;
  const signature = await generateSignature(params);
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('upload_preset', CLOUDINARY_CONFIG.signedUploadPreset);
  
  console.log('Tentando upload com assinatura para Cloudinary:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    cloudName: CLOUDINARY_CONFIG.cloudName,
    resourceType,
    timestamp,
    signatureLength: signature.length,
    uploadPreset: CLOUDINARY_CONFIG.signedUploadPreset
  });

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
  console.log('URL de upload:', uploadUrl);

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    });
    
    console.log('Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resposta de erro do Cloudinary (assinado):', errorText);
      
      // Tenta analisar o JSON de erro, se possível
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Detalhes do erro (assinado):', errorJson);
      } catch (e) {
        // Se não for JSON, apenas loga o texto
      }
      
      throw new Error(`Upload assinado falhou: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Upload assinado bem-sucedido:', data);
    
    return {
      name: file.name,
      type: file.type.split('/')[0],
      url: data.secure_url,
      publicId: data.public_id,
      size: file.size
    };
  } catch (error) {
    console.error('Erro detalhado no upload assinado para Cloudinary:', error);
    throw error;
  }
};

/**
 * Terceira alternativa de upload que não usa presets, apenas assinatura direta
 * @param {File} file - The file to upload
 * @param {string} resourceType - Resource type (auto, image, video, raw)
 * @returns {Promise<Object>} - Upload result with url, publicId, etc.
 */
export const uploadToCloudinaryDirectSigned = async (file, resourceType = 'auto') => {
  // Gerar timestamp
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Parâmetros para assinatura
  const params = `timestamp=${timestamp}`;
  const signature = await generateSignature(params);
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  
  console.log('Tentando upload direto com assinatura para Cloudinary (sem preset):', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    cloudName: CLOUDINARY_CONFIG.cloudName,
    resourceType,
    timestamp
  });

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
  console.log('URL de upload direto:', uploadUrl);

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    });
    
    console.log('Status da resposta direto:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resposta de erro do Cloudinary (direto):', errorText);
      
      // Tenta analisar o JSON de erro, se possível
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Detalhes do erro (direto):', errorJson);
      } catch (e) {
        // Se não for JSON, apenas loga o texto
      }
      
      throw new Error(`Upload direto falhou: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Upload direto bem-sucedido:', data);
    
    return {
      name: file.name,
      type: file.type.split('/')[0],
      url: data.secure_url,
      publicId: data.public_id,
      size: file.size
    };
  } catch (error) {
    console.error('Erro detalhado no upload direto para Cloudinary:', error);
    throw error;
  }
}; 