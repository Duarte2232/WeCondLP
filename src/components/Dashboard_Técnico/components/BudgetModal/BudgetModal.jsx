import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiX, FiUpload, FiFile, FiDollarSign, FiClock, FiAlignLeft, FiFileText, FiPaperclip, FiTrash2, FiCheck } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { doc, addDoc, collection, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import { 
  uploadToCloudinary, 
  uploadToCloudinaryWithSignature,
  uploadToCloudinaryDirectSigned 
} from '../../../../services/cloudinary.service.js';
import { v4 as uuidv4 } from 'uuid';
import './BudgetModal.css';
import { CLOUDINARY_CONFIG } from '../../../../config/cloudinary';

// Constants for validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const MAX_FILES = 5;

const BudgetModal = ({ job, onClose, onSuccess }) => {
  const auth = getAuth();
  const [budgetData, setBudgetData] = useState({
    amount: '',
    description: '',
    files: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

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

  // Validate amount format
  const validateAmount = (value) => {
    const amount = value.replace(/[^\d.,]/g, '');
    const errors = {};
    
    if (!amount) {
      errors.amount = 'O valor é obrigatório';
    } else if (isNaN(parseFloat(amount.replace(',', '.')))) {
      errors.amount = 'Valor inválido';
    }
    
    return errors;
  };

  // Handle budget data changes with validation
  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setBudgetData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear specific error when field is modified
    setValidationErrors(prev => ({
      ...prev,
      [name]: undefined
    }));

    // Validate on change
    if (name === 'amount') {
      const errors = validateAmount(value);
      setValidationErrors(prev => ({
        ...prev,
        amount: errors.amount
      }));
    }
  };

  // Validate file
  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} excede o tamanho máximo permitido (5MB)`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `${file.name} tem um formato não permitido`;
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

  // Remove file
  const removeFile = useCallback((index) => {
    setBudgetData(prev => {
      const newFiles = [...prev.files];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return {
        ...prev,
        files: newFiles
      };
    });
  }, []);

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
      const errors = {};
      if (!budgetData.amount || budgetData.amount <= 0) {
        errors.amount = 'Por favor, insira um valor válido para o orçamento';
      }
      if (!budgetData.description) {
        errors.description = 'Por favor, insira uma descrição do orçamento';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // Process files if any
      let processedFiles = [];
      if (budgetData.files && budgetData.files.length > 0) {
        console.log('Iniciando upload de', budgetData.files.length, 'arquivos...');
        processedFiles = await Promise.all(
          budgetData.files.map(async (fileData) => {
            try {
              console.log('Processando arquivo:', fileData.name);
              const response = await uploadSingleFileWithRetry(fileData.file);
              console.log('Upload concluído para:', fileData.name, response);
              return {
                name: fileData.name,
                url: response.url,
                type: fileData.type,
                size: fileData.size
              };
            } catch (error) {
              console.error('Erro ao fazer upload do arquivo:', fileData.name, error);
              throw new Error(`Falha ao fazer upload do arquivo ${fileData.name}: ${error.message}`);
            }
          })
        );
        console.log('Todos os arquivos foram processados:', processedFiles);
      }

      // Create budget document
      const budgetDoc = {
        workId: job.id,
        technicianId: auth.currentUser.uid,
        technicianEmail: auth.currentUser.email,
        amount: budgetData.amount,
        description: budgetData.description,
        files: processedFiles,
        createdAt: serverTimestamp(),
        status: 'pendente',
        isMaintenance: job.isMaintenance || false
      };

      // Adiciona o campo manutencaoId se for manutenção
      if (job.isMaintenance) {
        budgetDoc.manutencaoId = job.id;
      }

      // Store in appropriate collection based on whether it's a maintenance or work
      const collectionName = job.isMaintenance ? 'ManutençãoOrçamentos' : 'ObrasOrçamentos';
      const docRef = await addDoc(collection(db, collectionName), budgetDoc);
      console.log('Orçamento salvo com sucesso. ID:', docRef.id);

      setSuccessMessage('Orçamento enviado com sucesso!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting budget:', error);
      setErrorMessage('Erro ao enviar orçamento: ' + error.message);
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

  return (
    <div className="modal-overlay" onClick={handleOutsideClick}>
      <div className="budget-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>Enviar Orçamento</h2>
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
              <label htmlFor="amount">
                <FiDollarSign /> Valor do Orçamento 
              </label>
              <input
                type="text"
                id="amount"
                name="amount"
                placeholder="Digite o valor"
                value={budgetData.amount}
                onChange={handleBudgetChange}
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">
                <FiFileText /> Descrição do Orçamento
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Detalhes sobre o que está incluído no orçamento..."
                value={budgetData.description}
                onChange={handleBudgetChange}
                rows={5}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-group">
              <label>
                <FiPaperclip /> Arquivos Anexos
              </label>
              
              <div className="file-upload-container">
                <div className="file-upload-btn">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isSubmitting}
                    ref={fileInputRef}
                  />
                  <label htmlFor="file-upload" className="custom-file-upload">
                    <FiUpload /> Selecionar Arquivos
                  </label>
                </div>
                
                {budgetData.files.length > 0 && (
                  <div className="file-list">
                    {budgetData.files.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className={submitButtonClass} disabled={isSubmitting}>
                {isSubmitting && <span className="loading-spinner"></span>}
                {isSubmitting ? 'Enviando...' : 'Enviar Orçamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal; 