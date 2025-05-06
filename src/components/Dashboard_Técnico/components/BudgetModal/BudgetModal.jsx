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
    timeEstimate: '',
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

  // Validate time estimate format
  const validateTimeEstimate = (value) => {
    const errors = {};
    const timePattern = /^(\d+)\s*(dia|dias|semana|semanas|mês|meses)$/i;
    
    if (value && !timePattern.test(value)) {
      errors.timeEstimate = 'Formato inválido. Use: "X dias", "X semanas" ou "X meses"';
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
    } else if (name === 'timeEstimate') {
      const errors = validateTimeEstimate(value);
      setValidationErrors(prev => ({
        ...prev,
        timeEstimate: errors.timeEstimate
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
  const submitBudget = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setErrorMessage('');
    setSuccessMessage('');
    
    // Validate all fields
    const amountErrors = validateAmount(budgetData.amount);
    const timeErrors = validateTimeEstimate(budgetData.timeEstimate);
    
    const errors = {
      ...amountErrors,
      ...timeErrors,
      description: !budgetData.description.trim() ? 'A descrição é obrigatória' : undefined
    };

    // Check for validation errors
    const hasErrors = Object.values(errors).some(error => error !== undefined);
    if (hasErrors) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Upload files to Cloudinary first
      let processedFiles = [];
      if (budgetData.files.length > 0) {
        try {
          console.log(`Iniciando upload de ${budgetData.files.length} arquivos com múltiplos métodos...`);
          
          // Processa cada arquivo individualmente para melhor tratamento de erros
          const uploadPromises = budgetData.files.map(fileObj => 
            uploadSingleFileWithRetry(fileObj.file)
          );
          
          processedFiles = await Promise.all(uploadPromises);
          console.log('Todos os arquivos foram enviados com sucesso:', processedFiles);
        } catch (error) {
          console.error('Todos os métodos de upload falharam para pelo menos um arquivo:', error);
          setErrorMessage('Erro ao enviar arquivos. Por favor, tente novamente.');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Create budget data
      const orcamentoData = {
        workId: job.id,
        gestorId: job.userId,
        technicianId: auth.currentUser.uid,
        amount: parseFloat(budgetData.amount.replace(',', '.')),
        description: budgetData.description.trim(),
        timeEstimate: budgetData.timeEstimate,
        status: 'pending',
        createdAt: serverTimestamp(),
        viewed: false,
        files: processedFiles // Add the uploaded files
      };
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'orcamentos'), orcamentoData);
      
      // Update work status if needed
      if (job.status === 'disponivel') {
        const workRef = doc(db, 'works', job.id);
        await updateDoc(workRef, {
          hasOrcamentos: true
        });
      }
      
      setSuccessMessage('Orçamento enviado com sucesso!');
      
      // Close modal after success
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
      }, 1500);
      
    } catch (error) {
      console.error("Erro ao enviar orçamento:", error);
      setErrorMessage('Erro ao enviar orçamento. Por favor, tente novamente.');
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
          
          <form onSubmit={submitBudget}>
            <div className="form-group">
              <label htmlFor="amount">
                <FiDollarSign /> Valor do Orçamento (R$)
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
              <label htmlFor="timeEstimate">
                <FiClock /> Tempo Estimado
              </label>
              <input
                type="text"
                id="timeEstimate"
                name="timeEstimate"
                placeholder="ex: 5 dias, 2 semanas"
                value={budgetData.timeEstimate}
                onChange={handleBudgetChange}
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