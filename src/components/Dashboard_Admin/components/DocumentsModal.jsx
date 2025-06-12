import React from 'react';
import { FiX, FiDownload, FiFile, FiImage, FiVideo } from 'react-icons/fi';
import './DocumentsModal.css';

const DocumentsModal = ({ work, isOpen, onClose, onDownload }) => {
  if (!isOpen || !work) return null;

  const getFileIcon = (file) => {
    if (file.type === 'image') return <FiImage />;
    if (file.type === 'video') return <FiVideo />;
    return <FiFile />;
  };

  const groupFilesByType = (files = []) => {
    return {
      images: files.filter(file => file?.type === 'image'),
      videos: files.filter(file => file?.type === 'video'),
      documents: files.filter(file => file?.type !== 'image' && file?.type !== 'video')
    };
  };

  const { images, videos, documents } = groupFilesByType(work.files || []);

  return (
    <div className="documents-modal-overlay" onClick={onClose}>
      <div className="documents-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="documents-modal-header">
          <h2>Documentos da Obra</h2>
          <button className="documents-modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="documents-modal-body">
          <div className="work-info-summary">
            <h3>{work.title}</h3>
            <p><strong>Categoria:</strong> {work.category}</p>
            <p><strong>Local:</strong> {work.location?.morada}, {work.location?.cidade}</p>
            <p><strong>Status:</strong> <span className={`status-badge ${work.status}`}>{work.status}</span></p>
          </div>

          {(!work.files || work.files.length === 0) ? (
            <div className="no-documents">
              <FiFile size={48} />
              <p>Nenhum documento anexado a esta obra</p>
            </div>
          ) : (
            <div className="documents-sections">
              {images.length > 0 && (
                <div className="document-section">
                  <h4><FiImage /> Imagens ({images.length})</h4>
                  <div className="documents-grid images-grid">
                    {images.map((file, index) => (
                      <div key={index} className="document-item image-item">
                        <div className="document-preview">
                          <img src={file.url} alt={file.name} />
                          <div className="document-overlay">
                            <button 
                              className="download-document-btn"
                              onClick={() => onDownload(file, file.name)}
                              title="Download"
                            >
                              <FiDownload />
                            </button>
                          </div>
                        </div>
                        <div className="document-info">
                          <span className="document-name" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {videos.length > 0 && (
                <div className="document-section">
                  <h4><FiVideo /> Vídeos ({videos.length})</h4>
                  <div className="documents-grid videos-grid">
                    {videos.map((file, index) => (
                      <div key={index} className="document-item video-item">
                        <div className="document-preview">
                          <video src={file.url} controls preload="metadata" />
                        </div>
                        <div className="document-info">
                          <span className="document-name" title={file.name}>
                            {file.name}
                          </span>
                          <button 
                            className="download-document-btn"
                            onClick={() => onDownload(file, file.name)}
                          >
                            <FiDownload /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {documents.length > 0 && (
                <div className="document-section">
                  <h4><FiFile /> Documentos ({documents.length})</h4>
                  <div className="documents-list">
                    {documents.map((file, index) => (
                      <div key={index} className="document-item document-file">
                        <div className="document-icon">
                          {getFileIcon(file)}
                        </div>
                        <div className="document-details">
                          <span className="document-name" title={file.name}>
                            {file.name}
                          </span>
                          <span className="document-size">
                            {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Tamanho desconhecido'}
                          </span>
                        </div>
                        <button 
                          className="download-document-btn"
                          onClick={() => onDownload(file, file.name)}
                        >
                          <FiDownload /> Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsModal; 