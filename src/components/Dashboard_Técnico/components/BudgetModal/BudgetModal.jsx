import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiUpload, FiFile, FiDollarSign, FiClock, FiAlignLeft, FiFileText, FiPaperclip, FiTrash2, FiCheck } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { doc, addDoc, collection, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import { CLOUDINARY_CONFIG } from '../../../../config/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import './BudgetModal.css';

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
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  // Efeito para permitir o fechamento do modal com a tecla ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSubmitting, onClose]);

  // Função para fechar o modal quando clicar fora dele
  const handleOutsideClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target) && !isSubmitting) {
      onClose();
    }
  };

  // Função para lidar com mudanças nos campos do orçamento
  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setBudgetData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para lidar com upload de arquivos
  const handleFileUpload = (e) => {
    const fileList = e.target.files;
    if (fileList.length === 0) return;
    
    const newFiles = Array.from(fileList).map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: URL.createObjectURL(file)
    }));
    
    setBudgetData(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }));
  };

  // Função para remover um arquivo da lista
  const removeFile = (index) => {
    setBudgetData(prev => {
      const newFiles = [...prev.files];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return {
        ...prev,
        files: newFiles
      };
    });
  };

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Função para fazer upload de um arquivo para o Cloudinary
  const uploadFileToStorage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
      formData.append('timestamp', Math.floor(Date.now() / 1000));

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro detalhado:', errorData);
        throw new Error(`Falha no upload do arquivo: ${errorData.error?.message || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
        name: file.name,
        type: file.type.split('/')[0],
        size: file.size
      };
    } catch (error) {
      console.error("Erro ao fazer upload do arquivo:", error);
      throw error;
    }
  };

  // Função para enviar orçamento
  const submitBudget = async (e) => {
    e.preventDefault();
    
    // Limpar mensagens anteriores
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!budgetData.amount.trim()) {
      setErrorMessage("Por favor, informe o valor do orçamento.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Upload de arquivos
      const filePromises = budgetData.files.map(fileData => uploadFileToStorage(fileData.file));
      const uploadedFiles = await Promise.all(filePromises);
      const validFiles = uploadedFiles.filter(file => file !== null);
      
      // Criação do orçamento
      const orcamentoData = {
        workId: job.id,
        gestorId: job.userId,
        technicianId: auth.currentUser.uid,
        amount: budgetData.amount,
        description: budgetData.description,
        timeEstimate: budgetData.timeEstimate,
        files: validFiles,
        status: 'pending', // pending, accepted, rejected
        createdAt: serverTimestamp(),
        viewed: false
      };
      
      // Salvar no Firestore
      await addDoc(collection(db, 'orcamentos'), orcamentoData);
      
      // Atualizar status da obra se necessário
      if (job.status === 'disponivel') {
        const workRef = doc(db, 'works', job.id);
        await updateDoc(workRef, {
          hasOrcamentos: true
        });
      }
      
      setSuccessMessage('Orçamento enviado com sucesso!');
      
      // Fechar o modal após 1.5 segundos
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
      }, 1500);
      
    } catch (error) {
      console.error("Erro ao enviar orçamento:", error);
      setErrorMessage(`Erro ao enviar orçamento: ${error.message}`);
      setIsSubmitting(false);
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