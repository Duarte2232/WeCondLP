import React from 'react';
import { FiX, FiDownload, FiMessageSquare, FiUser } from 'react-icons/fi';
import './OrcamentoDetailsModal.css';

const OrcamentoDetailsModal = ({ orcamento, technicianName, workId, workTitle, onClose, onFileDownload, onMessageTechnician, onViewTechnicianProfile }) => {
  if (!orcamento) return null;

  const handleFileDownload = (file) => {
    if (onFileDownload) {
      onFileDownload(file);
    }
  };

  const handleMessageTechnician = () => {
    if (onMessageTechnician) {
      onMessageTechnician(orcamento);
    }
  };

  const handleViewTechnicianProfile = () => {
    if (onViewTechnicianProfile) {
      onViewTechnicianProfile(orcamento.technicianId, orcamento);
    }
  };

  return (
    <div className="orcamento-details-modal-overlay" onClick={onClose}>
      <div className="orcamento-details-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="orcamento-details-modal-header">
          <h2>Detalhes do Orçamento</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="orcamento-details-modal-body">
          <div className="orcamento-details-section">
            <h3>Técnico</h3>
            <p>{technicianName || 'Técnico'}</p>
          </div>

          <div className="orcamento-details-section">
            <h3>Valor</h3>
            <p className="orcamento-value-large">{orcamento.valor || orcamento.amount || 0}€</p>
          </div>

          <div className="orcamento-details-section">
            <h3>Data</h3>
            <p>
              {orcamento.data 
                ? new Date(orcamento.data).toLocaleDateString()
                : orcamento.createdAt 
                  ? new Date(orcamento.createdAt.seconds * 1000).toLocaleDateString()
                  : 'Data não disponível'}
            </p>
          </div>

          {orcamento.description && (
            <div className="orcamento-details-section">
              <h3>Descrição</h3>
              <div className="orcamento-description-full">
                {orcamento.description}
              </div>
            </div>
          )}
          
          {orcamento.files && orcamento.files.length > 0 && (
            <div className="orcamento-details-section">
              <h3>Ficheiros anexados</h3>
              <div className="files-list">
                {orcamento.files.map((file, idx) => (
                  <div key={idx} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <div className="file-actions">
                      <button 
                        className="file-download-btn" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileDownload(file);
                        }}
                        title="Descarregar ficheiro"
                      >
                        <FiDownload />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="orcamento-details-actions">
            <button
              className="action-btn mensagens"
              onClick={handleMessageTechnician}
            >
              <FiMessageSquare /> Enviar Mensagem
            </button>
            <button
              className="action-btn ver-perfil"
              onClick={handleViewTechnicianProfile}
            >
              <FiUser /> Ver Perfil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrcamentoDetailsModal; 