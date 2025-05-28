import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiX, FiUpload, FiFile, FiDollarSign, FiClock, FiAlignLeft, FiFileText, FiPaperclip, FiTrash2, FiCheck, FiCalendar } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { doc, addDoc, collection, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import { 
  uploadToCloudinary, 
  uploadToCloudinaryWithSignature,
  uploadToCloudinaryDirectSigned,
  deleteFromCloudinary 
} from '../../../../services/cloudinary.service.js';
import { v4 as uuidv4 } from 'uuid';
import './BudgetModal.css';
import { CLOUDINARY_CONFIG } from '../../../../config/cloudinary';

// Constants for validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf'];
const MAX_FILES = 5;

const BudgetModal = ({ job, onClose, onSuccess, existingBudget = null, isEditMode = false }) => {
  const auth = getAuth();
  const [budgetData, setBudgetData] = useState({
    availabilityDate: '',
    endDate: '',
    isMultipleDays: false,
    files: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Initialize form with existing budget data if in edit mode
  useEffect(() => {
    if (isEditMode && existingBudget) {
      setBudgetData({
        availabilityDate: existingBudget.availabilityDate || '',
        endDate: existingBudget.endDate || '',
        isMultipleDays: existingBudget.isMultipleDays || false,
        files: existingBudget.files ? existingBudget.files.map(file => ({
          ...file,
          file: null, // We don't have the original file object, just the metadata
          preview: null,
          isExisting: true // Flag to identify existing files
        })) : []
      });
    }
  }, [isEditMode, existingBudget]);

  // Initialize endDate when isMultipleDays is enabled
  useEffect(() => {
    if (budgetData.isMultipleDays && budgetData.availabilityDate && !budgetData.endDate) {
      // Set endDate to day after availabilityDate
      const nextDay = new Date(budgetData.availabilityDate);
      if (!isNaN(nextDay.getTime())) { // Check if date is valid
        nextDay.setDate(nextDay.getDate() + 1);
        setBudgetData(prev => ({
          ...prev,
          endDate: nextDay.toISOString().split('T')[0]
        }));
      }
    }
  }, [budgetData.isMultipleDays, budgetData.availabilityDate]);

  // Cleanup function for file previews
  useEffect(() => {
    return () => {
      budgetData.files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [budgetData.files]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSubmitting, onClose]);

  // Validate form data
  const validateForm = () => {
    const errors = {};

    // Validate availability date
    if (!budgetData.availabilityDate) {
      errors.availabilityDate = 'Data de disponibilidade é obrigatória';
    }

    // Validate end date for multiple days
    if (budgetData.isMultipleDays) {
      if (!budgetData.endDate) {
        errors.endDate = 'Data final é obrigatória para obras de múltiplos dias';
      } else if (budgetData.availabilityDate && new Date(budgetData.endDate) <= new Date(budgetData.availabilityDate)) {
        errors.endDate = 'A data final deve ser posterior à data de disponibilidade';
      }
    }

    // Validate files
    if (!budgetData.files || budgetData.files.length === 0) {
      errors.files = 'Pelo menos um arquivo PDF deve ser anexado';
    }

    return errors;
  };

  // Handle budget data changes with validation
  const handleBudgetChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox separately
    if (type === 'checkbox') {
      setBudgetData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    setBudgetData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear specific error when field is modified
    setValidationErrors(prev => ({
      ...prev,
      [name]: undefined
    }));
  };

  // Validate file
  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} excede o tamanho máximo permitido (5MB)`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `${file.name} deve ser um arquivo PDF`;
    }
    return null;
  };

  // Handle file upload with validation
  const handleFileUpload = (e) => {
    const fileList = e.target.files;
    if (fileList.length === 0) return;
    
    const newFiles = Array.from(fileList).map(file => {
      const error = validateFile(file);
      return {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: error ? null : URL.createObjectURL(file),
        error
      };
    });

    // Filter out files with errors and check total count
    const validFiles = newFiles.filter(file => !file.error);
    const totalFiles = budgetData.files.length + validFiles.length;

    if (totalFiles > MAX_FILES) {
      setErrorMessage(`Máximo de ${MAX_FILES} arquivos permitido`);
      return;
    }

    // Show errors for invalid files
    const errors = newFiles.filter(file => file.error).map(file => file.error);
    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
    }

    setBudgetData(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles]
    }));
  };

  // Extract publicId from Cloudinary URL
  const extractPublicIdFromUrl = useCallback((url) => {
    try {
      if (!url) return null;
      
      // URL format: https://res.cloudinary.com/cloudname/resource_type/upload/v123456/publicId.ext
      // or: https://res.cloudinary.com/cloudname/resource_type/upload/publicId.ext
      const parts = url.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      
      if (uploadIndex !== -1 && uploadIndex + 1 < parts.length) {
        let publicIdPart = parts[uploadIndex + 1];
        
        // Skip version if present (starts with 'v' followed by numbers)
        if (publicIdPart.startsWith('v') && /^v\d+$/.test(publicIdPart)) {
          publicIdPart = parts[uploadIndex + 2];
        }
        
        if (publicIdPart) {
          // Remove file extension
          const publicId = publicIdPart.split('.')[0];
          console.log(`Extracted publicId: ${publicId} from URL: ${url}`);
          return publicId;
        }
      }
      
      console.warn(`Could not extract publicId from URL: ${url}`);
      return null;
    } catch (error) {
      console.error('Error extracting publicId from URL:', error);
      return null;
    }
  }, []);

  // Remove file
  const removeFile = useCallback(async (index) => {
    setBudgetData(prev => {
      const newFiles = [...prev.files];
      const fileToRemove = newFiles[index];
      
      // Handle cleanup for different file types
      if (fileToRemove.isExisting && fileToRemove.url) {
        // For existing files, delete from Cloudinary asynchronously
        (async () => {
          try {
            const publicId = extractPublicIdFromUrl(fileToRemove.url);
            if (publicId) {
              console.log(`Removendo arquivo existente do Cloudinary: ${publicId}`);
              const deleteResult = await deleteFromCloudinary(publicId, 'raw');
              
              if (deleteResult) {
                console.log(`✅ Arquivo existente removido com sucesso do Cloudinary: ${publicId}`);
              } else {
                console.warn(`⚠️ Possível falha ao deletar arquivo existente do Cloudinary: ${publicId}`);
              }
            }
          } catch (error) {
            console.error(`❌ Erro ao deletar arquivo existente do Cloudinary:`, error);
          }
        })();
      } else if (fileToRemove.preview && !fileToRemove.isExisting) {
        // Only revoke URL for new files with preview
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      newFiles.splice(index, 1);
      return {
        ...prev,
        files: newFiles
      };
    });
  }, [extractPublicIdFromUrl]);

  // Format file size
  const formatFileSize = useCallback((bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }, []);

  // Upload de um único arquivo com retry nos três métodos
  const uploadSingleFileWithRetry = async (file) => {
    console.log(`Iniciando upload de ${file.name} com múltiplos métodos...`);
    
    // Método 1: Upload padrão não assinado
    try {
      console.log(`Tentando método 1 (upload_preset não assinado) para ${file.name}...`);
      const result = await uploadToCloudinary(file);
      console.log(`Método 1 bem-sucedido para ${file.name}`);
      return result;
    } catch (error1) {
      console.error(`Método 1 falhou para ${file.name}:`, error1);
      
      // Método 2: Upload com preset assinado
      try {
        console.log(`Tentando método 2 (upload_preset assinado) para ${file.name}...`);
        const result = await uploadToCloudinaryWithSignature(file);
        console.log(`Método 2 bem-sucedido para ${file.name}`);
        return result;
      } catch (error2) {
        console.error(`Método 2 falhou para ${file.name}:`, error2);
        
        // Método 3: Upload direto assinado sem preset
        console.log(`Tentando método 3 (assinatura direta sem preset) para ${file.name}...`);
        const result = await uploadToCloudinaryDirectSigned(file);
        console.log(`Método 3 bem-sucedido para ${file.name}`);
        return result;
      }
    }
  };

  // Submit budget with validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // Clean up orphaned files from Cloudinary when editing
      if (isEditMode && existingBudget?.files) {
        console.log('Verificando arquivos órfãos para limpeza...');
        
        // Get current file URLs (both existing and new files)
        const currentFileUrls = budgetData.files
          .map(f => f.url)
          .filter(Boolean);
        
        // Find files that were removed (exist in original but not in current)
        const removedFiles = existingBudget.files.filter(
          existingFile => existingFile.url && !currentFileUrls.includes(existingFile.url)
        );
        
        console.log(`Encontrados ${removedFiles.length} arquivos para remover do Cloudinary`);
        
        // Delete removed files from Cloudinary
        for (const removedFile of removedFiles) {
          try {
            const publicId = extractPublicIdFromUrl(removedFile.url);
            if (publicId) {
              console.log(`Tentando deletar arquivo do Cloudinary: ${publicId}`);
              const deleteResult = await deleteFromCloudinary(publicId, 'raw'); // PDFs são 'raw'
              
              if (deleteResult) {
                console.log(`✅ Arquivo removido com sucesso do Cloudinary: ${publicId}`);
              } else {
                console.warn(`⚠️ Possível falha ao deletar arquivo do Cloudinary: ${publicId}`);
              }
            } else {
              console.warn(`⚠️ Não foi possível extrair publicId da URL: ${removedFile.url}`);
            }
          } catch (error) {
            console.error(`❌ Erro ao deletar arquivo do Cloudinary:`, error);
            // Continue mesmo se falhar a deleção - não deve interromper o processo
          }
        }
      }

      // Process files - separate existing files from new files
      let processedFiles = [];
      
      if (budgetData.files && budgetData.files.length > 0) {
        console.log('Processando', budgetData.files.length, 'arquivos...');
        
        for (const fileData of budgetData.files) {
          if (fileData.isExisting) {
            // Keep existing files as they are
            processedFiles.push({
              name: fileData.name,
              url: fileData.url,
              type: fileData.type,
              size: fileData.size
            });
          } else if (fileData.file) {
            // Upload new files
            try {
              console.log('Fazendo upload do novo arquivo:', fileData.name);
              const response = await uploadSingleFileWithRetry(fileData.file);
              console.log('Upload concluído para:', fileData.name, response);
              processedFiles.push({
                name: fileData.name,
                url: response.url,
                type: fileData.type,
                size: fileData.size
              });
            } catch (error) {
              console.error('Erro ao fazer upload do arquivo:', fileData.name, error);
              throw new Error(`Falha ao fazer upload do arquivo ${fileData.name}: ${error.message}`);
            }
          }
        }
        
        console.log('Todos os arquivos foram processados:', processedFiles);
      }

      // Create/Update budget object
      const budgetObject = {
        workId: job.id,
        technicianId: auth.currentUser.uid,
        technicianEmail: auth.currentUser.email,
        availabilityDate: budgetData.availabilityDate,
        isMultipleDays: budgetData.isMultipleDays,
        endDate: budgetData.isMultipleDays ? budgetData.endDate : null,
        files: processedFiles,
        aceito: false,
        tipo: job.isMaintenance ? 'manutencao' : 'obra'
      };

      // Add creation timestamp only for new budgets
      if (!isEditMode) {
        budgetObject.createdAt = serverTimestamp();
      } else {
        budgetObject.updatedAt = serverTimestamp();
      }

      // Add manutencaoId if it's maintenance
      if (job.isMaintenance) {
        budgetObject.manutencaoId = job.id;
      }

      const collectionName = job.isMaintenance ? 'ManutençãoOrçamentos' : 'ObrasOrçamentos';

      if (isEditMode && existingBudget?.id) {
        // Update existing budget
        const budgetRef = doc(db, collectionName, existingBudget.id);
        await updateDoc(budgetRef, budgetObject);
        console.log('Orçamento atualizado com sucesso. ID:', existingBudget.id);
        setSuccessMessage('Orçamento atualizado com sucesso!');
      } else {
        // Create new budget
        const docRef = await addDoc(collection(db, collectionName), budgetObject);
        console.log('Orçamento salvo com sucesso. ID:', docRef.id);
        setSuccessMessage('Orçamento enviado com sucesso!');
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting budget:', error);
      setErrorMessage('Erro ao ' + (isEditMode ? 'atualizar' : 'enviar') + ' orçamento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para fechar o modal quando clicar fora dele
  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target) && !isSubmitting) {
      onClose();
    }
  };

  // Determinar classe do botão de enviar
  const submitButtonClass = isSubmitting ? 'submit-btn loading' : 'submit-btn';

  // Reset form function
  const resetForm = () => {
    setBudgetData({
      availabilityDate: '',
      endDate: '',
      isMultipleDays: false,
      files: []
    });
    setValidationErrors({});
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="modal-overlay" onClick={handleOutsideClick}>
      <div className="budget-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Editar Orçamento' : 'Enviar Orçamento'}</h2>
          <button className="close-btn" onClick={onClose} disabled={isSubmitting}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="job-info">
            <h3>{job.title}</h3>
          </div>
          
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div className="success-message">
              <FiCheck />
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="availabilityDate">
                <FiCalendar /> Data de Disponibilidade
              </label>
              <input
                type="date"
                id="availabilityDate"
                name="availabilityDate"
                value={budgetData.availabilityDate}
                onChange={handleBudgetChange}
                required
                disabled={isSubmitting}
              />
              {validationErrors.availabilityDate && (
                <span className="error-text">{validationErrors.availabilityDate}</span>
              )}
            </div>
            
            <div className="form-group checkbox-group">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="isMultipleDays"
                  name="isMultipleDays"
                  checked={budgetData.isMultipleDays}
                  onChange={handleBudgetChange}
                  disabled={isSubmitting}
                />
                <label htmlFor="isMultipleDays">
                  Obra com duração de múltiplos dias
                </label>
              </div>
            </div>
            
            {budgetData.isMultipleDays && (
              <div className="form-group">
                <label htmlFor="endDate">
                  <FiCalendar /> Data Final
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={budgetData.endDate}
                  onChange={handleBudgetChange}
                  min={budgetData.availabilityDate} 
                  required={budgetData.isMultipleDays}
                  disabled={isSubmitting}
                />
                {validationErrors.endDate && (
                  <span className="error-text">{validationErrors.endDate}</span>
                )}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="file-upload">
                <FiUpload /> Anexar Orçamento (PDF)
              </label>
              <div className="file-upload-container">
                <div className="file-upload-btn">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isSubmitting}
                    ref={fileInputRef}
                  />
                  <label htmlFor="file-upload" className="custom-file-upload">
                    <FiUpload /> Selecionar Arquivos PDF
                  </label>
                </div>
                
                {budgetData.files.length > 0 && (
                  <div className="file-list">
                    {budgetData.files.map((file, index) => (
                      <div key={index} className={`file-item ${file.isExisting ? 'existing-file' : 'new-file'}`}>
                        <div className="file-info">
                          <span className="file-name">
                            {file.isExisting && <span className="file-badge existing">Existente</span>}
                            {!file.isExisting && <span className="file-badge new">Novo</span>}
                            {file.name}
                          </span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                          title={file.isExisting ? "Remover arquivo existente" : "Remover arquivo novo"}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {validationErrors.files && (
                  <span className="error-text">{validationErrors.files}</span>
                )}
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className={submitButtonClass} disabled={isSubmitting}>
                {isSubmitting && <span className="loading-spinner"></span>}
                {isSubmitting ? (isEditMode ? 'Atualizando...' : 'Enviando...') : (isEditMode ? 'Atualizar Orçamento' : 'Enviar Orçamento')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal; 