import React from 'react';
import { FiX, FiMapPin, FiClock, FiPhone, FiTag, FiCalendar, FiFileText, FiCheckCircle, FiAward, FiPaperclip, FiDownload, FiFile } from 'react-icons/fi';
import './JobDetailsModal.css';

const JobDetailsModal = ({ job, onClose }) => {
  // Function to handle document download
  const handleDownload = (fileUrl, fileName) => {
    // Create an anchor element
    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = fileName || 'document';
    anchor.target = '_blank';
    anchor.click();
  };

  return (
    <div className="job-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Detalhes da Obra</h2>
          <button className="close-modal-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="modal-status">
            <span className={`status-badge ${job.status || 'disponivel'}`}>
              {!job.status ? "Disponível" :
               job.status === "disponivel" ? "Disponível" :
               job.status === "confirmada" ? "Confirmada" :
               job.status === "concluida" ? "Concluída" :
               job.status === "em-andamento" ? "Em Andamento" :
               job.status}
            </span>
          </div>
          
          <div className="modal-section">
            <h1 className="job-title">{job.title}</h1>
          </div>
          
          <div className="modal-section details-section">
            {job.location && (
              <div className="detail-row">
                <div className="detail-item full-width">
                  <FiMapPin />
                  <span className="detail-label">Localização:</span>
                  <span className="detail-value">{job.location.cidade || 'Não especificada'}{job.location.bairro ? `, ${job.location.bairro}` : ''}</span>
                </div>
              </div>
            )}

            <div className="detail-row">
              <div className="detail-item full-width">
                <FiTag />
                <span className="detail-label">Categoria:</span>
                <span className="detail-value">{job.category}</span>
              </div>
            </div>
            
            <div className="detail-row">
              <div className="detail-item full-width">
                <FiCalendar />
                <span className="detail-label">Data:</span>
                <span className="detail-value">{job.date || 'Não especificada'}</span>
              </div>
            </div>
            
            {job.time && (
              <div className="detail-row">
                <div className="detail-item full-width">
                  <FiClock />
                  <span className="detail-label">Horário:</span>
                  <span className="detail-value">{job.time}</span>
                </div>
              </div>
            )}
            
            {job.contact && (
              <div className="detail-row">
                <div className="detail-item full-width">
                  <FiPhone />
                  <span className="detail-label">Contacto:</span>
                  <span className="detail-value">{job.contact}</span>
                </div>
              </div>
            )}
            
            {job.priority && (
              <div className="detail-row">
                <div className="detail-item full-width">
                  <FiAward />
                  <span className="detail-label">Prioridade:</span>
                  <span className={`detail-value priority-${job.priority.toLowerCase()}`}>
                    {job.priority === 'ALTA' ? 'Alta' : 
                     job.priority === 'MEDIA' ? 'Média' : 
                     job.priority === 'BAIXA' ? 'Baixa' : job.priority}
                  </span>
                </div>
              </div>
            )}

            {job.budget && (
              <div className="detail-row">
                <div className="detail-item full-width">
                  <span className="detail-label">Orçamento:</span>
                  <span className="detail-value">{job.budget}</span>
                </div>
              </div>
            )}
          </div>
          
          {job.requirements && (
            <div className="modal-section requirements-section">
              <h3 className="section-title">
                <FiCheckCircle />
                Requisitos
              </h3>
              <p className="job-requirements">{job.requirements}</p>
            </div>
          )}
        </div>
        
        {job.description && (
          <div className="description-container">
            <h3 className="description-title">
              <FiFileText />
              Descrição
            </h3>
            <div className="description-content">
              <p>{job.description}</p>
            </div>
          </div>
        )}

        {/* Files/Documents section */}
        <div className="files-container">
          <h3 className="files-title">
            <FiPaperclip />
            Ficheiros
          </h3>
          <div className="files-content">
            {job.files && job.files.length > 0 ? (
              <div className="files-list">
                {job.files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <FiFile className="file-icon" />
                      <span className="file-name">{file.name}</span>
                    </div>
                    <button 
                      className="download-btn"
                      onClick={() => handleDownload(file.url, file.name)}
                      title="Baixar arquivo"
                    >
                      <FiDownload />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-files-message">Nenhum ficheiro anexado a esta obra.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal; 