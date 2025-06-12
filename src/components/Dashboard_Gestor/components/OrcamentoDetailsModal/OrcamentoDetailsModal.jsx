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
      const orcamentoWithWorkId = {
        ...orcamento,
        workId: workId
      };
      
      console.log('OrcamentoDetailsModal - Enviando mensagem para técnico:', {
        technicianId: orcamento.technicianId,
        workId: workId,
        orcamento: orcamentoWithWorkId
      });
      
      onMessageTechnician(orcamentoWithWorkId);
    }
  };

  const handleViewTechnicianProfile = () => {
    if (onViewTechnicianProfile) {
      onViewTechnicianProfile(orcamento.technicianId, orcamento);
    }
  };

  // Função para formatar a data no formato dd/mm/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return 'Não fornecida';
    
    try {
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      // Formatar manualmente para garantir o formato dd/mm/yyyy
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Janeiro é 0
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return 'Data inválida';
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

          {/* Seção de disponibilidade */}
          <div className="orcamento-details-section">
            <h3>Disponibilidade</h3>
            <p>
              <strong>Data de Disponibilidade:</strong> {formatDate(orcamento.availabilityDate)}
              {orcamento.isMultipleDays && orcamento.endDate && (
                <>
                  <br />
                  <strong>Obra de Múltiplos Dias</strong><br />
                  <strong>Data Final:</strong> {formatDate(orcamento.endDate)}
                </>
              )}
            </p>
          </div>
          
          {orcamento.files && orcamento.files.length > 0 && (
            <div className="orcamento-details-section">
              <h3>Orçamento (PDF)</h3>
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