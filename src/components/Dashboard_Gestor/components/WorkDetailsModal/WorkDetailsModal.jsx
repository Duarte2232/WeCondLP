import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiTrash2, FiCheck, FiDownload, FiRotateCcw, FiCheckCircle } from 'react-icons/fi';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import './WorkDetailsModal.css';

const WorkDetailsModal = ({ work, onClose, onEdit, onDelete, onComplete, onFileDownload, onAcceptOrcamento, workOrcamentos }) => {
  if (!work) return null;
  
  const [technicianNames, setTechnicianNames] = useState({});
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch orcamentos and technician names when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Priorizar orçamentos passados como prop antes de buscar do Firestore
        if (Array.isArray(workOrcamentos) && workOrcamentos.length > 0) {
          console.log("Usando orçamentos da prop workOrcamentos:", workOrcamentos);
          setOrcamentos(workOrcamentos);
        }
        // Buscar da coleção 'orcamentos' se não tiver orçamentos nas props
        else {
          console.log("Buscando orçamentos do Firestore para workId:", work.id);
          const orcamentosRef = collection(db, 'orcamentos');
          const q = query(orcamentosRef, where('workId', '==', work.id));
          const querySnapshot = await getDocs(q);
          
          const orcamentosData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log(`Encontrados ${orcamentosData.length} orçamentos no Firestore:`, orcamentosData);
          setOrcamentos(orcamentosData);
        }
      } catch (error) {
        console.error('Erro ao buscar orçamentos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [work.id, workOrcamentos]);
  
  // Fetch technician names when orcamentos are loaded
  useEffect(() => {
    const fetchTechnicianNames = async () => {
      if (orcamentos.length > 0) {
        const namesMap = { ...technicianNames };
        
        for (const orcamento of orcamentos) {
          if (orcamento.technicianId && !namesMap[orcamento.technicianId]) {
            try {
              const techDoc = await getDoc(doc(db, 'users', orcamento.technicianId));
              if (techDoc.exists()) {
                const techData = techDoc.data();
                namesMap[orcamento.technicianId] = 
                  techData.empresaNome || 
                  techData.name || 
                  'Técnico';
              }
            } catch (error) {
              console.error('Error fetching technician data:', error);
            }
          }
        }
        setTechnicianNames(namesMap);
      }
    };
    
    fetchTechnicianNames();
  }, [orcamentos]);

  // Log work data as a side effect, but handle it in a way that won't cause React errors
  if (process.env.NODE_ENV === 'development') {
    // Safe console logging without hooks
    console.log('[DEBUG] WorkDetailsModal rendered with work:', {
      id: work.id,
      title: work.title,
      hasOrcamentos: Array.isArray(work.orcamentos),
      orcamentosCount: Array.isArray(work.orcamentos) ? work.orcamentos.length : 'N/A',
      orcamentosType: typeof work.orcamentos,
      orcamentosIsObject: work.orcamentos && typeof work.orcamentos === 'object',
      orcamentosIsArray: Array.isArray(work.orcamentos),
    });
    
    console.log('[DEBUG] WorkDetailsModal using orcamentos:', orcamentos);
  }

  const handleComplete = () => {
    const newStatus = work.status === 'concluido' ? 'disponivel' : 'concluido';
    onComplete(work.id, newStatus);
  };
  
  const handleAcceptOrcamento = (orcamentoId) => {
    if (onAcceptOrcamento) {
      onAcceptOrcamento(work.id, orcamentoId);
    } else {
      console.error('onAcceptOrcamento function not provided');
    }
  };

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
              <button 
                className={`action-btn ${work.status === 'concluido' ? 'undo' : 'complete'}`}
                onClick={handleComplete}
              >
                {work.status === 'concluido' ? (
                  <>
                    <FiRotateCcw />
                    Anular
                  </>
                ) : (
                  <>
                    <FiCheck />
                    Concluir
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="work-details-content-container">
            <div className="work-details-main-content">
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

              {work.orcamentos && typeof work.orcamentos === 'object' && !Array.isArray(work.orcamentos) && (
                <div className="work-details-section">
                  <h3>Valores Estimados</h3>
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

            {/* Display orcamentos array if it exists */}
            <div className="orcamentos-sidebar">
              <div className="orcamentos-header">
                <h3>Orçamentos Recebidos ({orcamentos.length})</h3>
              </div>
              {loading ? (
                <div className="loading-indicator">Carregando orçamentos...</div>
              ) : orcamentos.length > 0 ? (
                <div className="orcamentos-list">
                  {orcamentos.map((orcamento, index) => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[DEBUG] Rendering orcamento at index ${index}:`, orcamento);
                    }
                    
                    // Determine the display name
                    let displayName = orcamento.empresa || 'Empresa';
                    if (orcamento.technicianId && technicianNames[orcamento.technicianId]) {
                      displayName = technicianNames[orcamento.technicianId];
                    }
                    
                    return (
                      <div key={orcamento.id || index} className={`orcamento-card ${orcamento.aceito ? 'orcamento-aceito' : ''}`}>
                        <div className="orcamento-info">
                          <h4>{displayName}</h4>
                          <span className="orcamento-date">
                            {orcamento.data 
                              ? new Date(orcamento.data).toLocaleDateString()
                              : orcamento.createdAt 
                                ? new Date(orcamento.createdAt.seconds * 1000).toLocaleDateString()
                                : 'Data não disponível'}
                          </span>
                        </div>
                        <div className="orcamento-value">
                          {orcamento.valor || orcamento.amount || 0}€
                        </div>
                        {orcamento.description && (
                          <div className="orcamento-description">
                            {orcamento.description}
                          </div>
                        )}
                        <div className="orcamento-actions">
                          {orcamento.documento && (
                            <div className="orcamento-document">
                              <a 
                                href={orcamento.documento.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="document-link"
                              >
                                <FiDownload /> Ver documento
                              </a>
                            </div>
                          )}
                          {orcamento.files && orcamento.files.length > 0 && (
                            <div className="orcamento-files">
                              {orcamento.files.map((file, fileIndex) => (
                                <a 
                                  key={fileIndex}
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="document-link"
                                >
                                  <FiDownload /> {file.name || `Arquivo ${fileIndex + 1}`}
                                </a>
                              ))}
                            </div>
                          )}
                          {!orcamento.aceito && work.status === 'disponivel' && (
                            <button
                              className="orcamento-aceitar"
                              onClick={() => handleAcceptOrcamento(orcamento.id)}
                            >
                              <FiCheckCircle /> ACEITAR
                            </button>
                          )}
                          {orcamento.aceito && (
                            <div className="orcamento-aceito-badge">
                              <FiCheckCircle /> Aceito
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-orcamentos">
                  <p>Nenhum orçamento recebido ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkDetailsModal; 