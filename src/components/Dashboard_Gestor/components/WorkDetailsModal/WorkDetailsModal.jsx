import React from 'react';
import { FiX, FiEdit2, FiTrash2, FiCheck, FiDownload } from 'react-icons/fi';
import './WorkDetailsModal.css';

const WorkDetailsModal = ({ work, onClose, onEdit, onDelete, onComplete, onFileDownload }) => {
  if (!work) return null;

  return (
    <div className="work-details-modal-overlay" onClick={onClose}>
      <div className="work-details-modal-content" onClick={e => e.stopPropagation()}>
        <div className="work-details-modal-header">
          <h2>{work.title}</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="work-details-modal-body">
          <div className="work-details-status-row">
            <div className="status-badges">
              <span className={`status-badge ${work.status.toLowerCase()}`}>
                {work.status}
              </span>
              <span className="category-badge">
                {work.category}
              </span>
            </div>
            <div className="action-buttons">
              <button onClick={() => onEdit(work)} className="action-btn edit">
                <FiEdit2 /> Editar
              </button>
              <button onClick={() => onDelete(work.id)} className="action-btn delete">
                <FiTrash2 /> Excluir
              </button>
              {work.status !== 'Concluído' && (
                <button onClick={() => onComplete(work.id)} className="action-btn complete">
                  <FiCheck /> Concluir
                </button>
              )}
            </div>
          </div>

          <div className="work-details-section">
            <h3>Descrição</h3>
            <p>{work.description}</p>
          </div>

          <div className="work-details-section">
            <h3>Data</h3>
            <p>{work.date}</p>
          </div>

          <div className="work-details-section">
            <h3>Localização</h3>
            <div className="location-details">
              <p><strong>Morada:</strong> {work.location?.morada}</p>
              <p><strong>Código Postal:</strong> {work.location?.codigoPostal}</p>
              <p><strong>Cidade:</strong> {work.location?.cidade}</p>
              {work.location?.andar && (
                <p><strong>Andar:</strong> {work.location.andar}</p>
              )}
            </div>
          </div>

          {work.orcamentos && (
            <div className="work-details-section">
              <h3>Orçamentos</h3>
              <div className="orcamentos-details">
                <p><strong>Mínimo:</strong> {work.orcamentos?.minimo || '-'}</p>
                <p><strong>Máximo:</strong> {work.orcamentos?.maximo || '-'}</p>
                {work.prazoOrcamentos && (
                  <p><strong>Prazo:</strong> {work.prazoOrcamentos}</p>
                )}
              </div>
            </div>
          )}

          {work.files && work.files.length > 0 && (
            <div className="work-details-section">
              <h3>Arquivos</h3>
              <div className="files-grid">
                {work.files.map((file, index) => (
                  <div 
                    key={index} 
                    className="file-item"
                    onClick={() => onFileDownload(file)}
                  >
                    {file.type === 'image' ? (
                      <div className="file-preview">
                        <img src={file.url} alt={file.name} />
                        <div className="file-overlay">
                          <FiDownload />
                        </div>
                      </div>
                    ) : (
                      <div className="file-preview document">
                        <span className="file-name">{file.name}</span>
                        <FiDownload />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkDetailsModal; 