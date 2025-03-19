import React from 'react';
import './WorksTable.css';
import { FiEdit2, FiCheck, FiX, FiAlertCircle, FiDownload, FiFile, FiEye, FiMessageCircle } from 'react-icons/fi';
import LoadingAnimation from '../../../LoadingAnimation/LoadingAnimation';

function WorksTable({ 
  isLoading, 
  works, 
  expandedWorks, 
  onViewDetails, 
  onEdit, 
  onComplete, 
  onDelete, 
  unviewedOrcamentos,
  onFileDownload,
  onAcceptOrcamento,
  onStatusChange,
  searchTerm,
  selectedFilters,
  groupFilesByType,
  isSimplified = false,
  onSendMessage
}) {
  // Filter works based on search term and filters
  const filteredWorks = works ? works.filter(work => {
    const matchesSearch = searchTerm ? (
      work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      work.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) : true;
    
    const matchesStatus = selectedFilters?.status ? 
      work.status.toLowerCase() === selectedFilters.status.toLowerCase() : true;
    
    const matchesCategory = selectedFilters?.category ? 
      work.category.toLowerCase() === selectedFilters.category.toLowerCase() : true;
    
    const matchesPriority = selectedFilters?.priority ? 
      work.priority.toLowerCase() === selectedFilters.priority.toLowerCase() : true;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  }) : [];

  if (!works) {
    return (
      <section className="works-table-container">
        <div className="loading-container">
          <LoadingAnimation />
        </div>
      </section>
    );
  }

  return (
    <section className="works-table-container">
      {!works ? (
        <div className="loading-container">
          <LoadingAnimation />
        </div>
      ) : (
        <table className="works-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Data</th>
              <th>Categoria</th>
              <th>Prioridade</th>
              <th>Status</th>
              {!isSimplified && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredWorks.map((work, index) => (
              <React.Fragment key={`${work.id}-${index}`}>
                <tr 
                  className={`work-row ${work.status === 'Concluído' ? 'concluida' : ''} ${unviewedOrcamentos && unviewedOrcamentos[work.id] ? 'work-row-with-notification' : ''}`}
                  onClick={() => onViewDetails(work.id)}
                >
                  <td data-label="Título">
                    <div className="title-with-notification">
                      <span className="work-title">{work.title}</span>
                      {Array.isArray(work.orcamentos) && work.orcamentos.length > 0 && !isSimplified && (
                        <span className="orcamentos-count" title={`${work.orcamentos.length} orçamento(s) disponível(is)`}>
                          {work.orcamentos.length}
                        </span>
                      )}
                      {unviewedOrcamentos && unviewedOrcamentos[work.id] && !isSimplified && (
                        <span 
                          className="orcamento-notification" 
                          title={`${unviewedOrcamentos[work.id]} novo(s) orçamento(s)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(work.id);
                          }}
                        >
                          <FiAlertCircle />
                          <span className="notification-count">{unviewedOrcamentos[work.id]}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label="Data">{new Date(work.date).toLocaleDateString()}</td>
                  <td data-label="Categoria">
                    <span className={`category-badge ${work.category.toLowerCase().replace(/\s+/g, '-')}`}>
                      {work.category}
                    </span>
                    {work.subcategoria && (
                      <span className="subcategoria-info">
                        <span className="subcategoria-arrow">›</span> {work.subcategoria}
                      </span>
                    )}
                  </td>
                  <td data-label="Prioridade">
                    <span className={`priority-badge ${work.priority.toLowerCase()}`}>
                      {work.priority}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge ${work.status.toLowerCase().replace(' ', '-')}`}>
                      {work.status}
                    </span>
                  </td>
                  {!isSimplified && (
                    <td data-label="Ações" className="actions-cell" onClick={e => e.stopPropagation()}>
                      <button 
                        className="action-btn" 
                        title="Editar"
                        onClick={() => onEdit(work)}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="action-btn" 
                        title="Marcar como concluído"
                        onClick={() => onComplete(work.id)}
                      >
                        <FiCheck />
                      </button>
                      <button 
                        className="action-btn delete-btn" 
                        title="Excluir"
                        onClick={() => onDelete(work.id)}
                      >
                        <FiX />
                      </button>
                    </td>
                  )}
                </tr>
                {expandedWorks.has(work.id) && !isSimplified && (
                  <tr className="details-row">
                    <td colSpan="6">
                      <div className="work-details">
                        <div className="work-details-container">
                          <div className="work-details-main">
                            <div className="details-content">
                              <div className="details-section">
                                <h4>Descrição</h4>
                                <p>{work.description}</p>
                              </div>
                              <div className="details-section">
                                <h4>Categoria</h4>
                                <p>
                                  <span className={`category-badge ${work.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {work.category}
                                  </span>
                                  {work.subcategoria && (
                                    <span className="subcategoria-info">
                                      <span className="subcategoria-arrow">›</span> {work.subcategoria}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="details-section">
                                <h4>Localização</h4>
                                <p>
                                  {work.location.morada}, {work.location.andar && `${work.location.andar}, `}
                                  {work.location.codigoPostal}, {work.location.cidade}
                                </p>
                              </div>
                              {work.status !== 'Concluído' && (
                                <div className="details-section">
                                  <h4>Alterar Status</h4>
                                  <div className="status-selector">
                                    <button 
                                      className={`status-btn ${work.status === 'Pendente' ? 'active' : ''}`}
                                      onClick={() => onStatusChange(work.id, 'Pendente')}
                                    >
                                      Pendente
                                    </button>
                                    <button 
                                      className={`status-btn ${work.status === 'Em Andamento' ? 'active' : ''}`}
                                      onClick={() => onStatusChange(work.id, 'Em Andamento')}
                                    >
                                      Em Andamento
                                    </button>
                                    <button 
                                      className={`status-btn ${work.status === 'Concluído' ? 'active' : ''}`}
                                      onClick={() => onStatusChange(work.id, 'Concluído')}
                                    >
                                      Concluído
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {work.files && work.files.length > 0 && (
                                <div className="details-section">
                                  <h4>Arquivos</h4>
                                  <div className="files-preview-sections">
                                    {['image', 'video', 'document'].map(fileType => {
                                      // Use the groupFilesByType function to organize files
                                      const filesByType = groupFilesByType(work.files);
                                      const filesOfType = fileType === 'image' 
                                        ? filesByType.images 
                                        : fileType === 'video' 
                                          ? filesByType.videos 
                                          : filesByType.documents;
                                      
                                      if (!filesOfType || filesOfType.length === 0) return null;
                                      
                                      return (
                                        <div key={fileType} className="file-type-section">
                                          <h4>{fileType === 'image' ? 'Imagens' : fileType === 'video' ? 'Vídeos' : 'Documentos'}</h4>
                                          <div className="files-grid">
                                            {filesOfType.map((file, idx) => (
                                              <div key={idx} className={`file-preview-item ${fileType}`}>
                                                {fileType === 'image' && (
                                                  <img src={file.url} alt={file.name} />
                                                )}
                                                {fileType === 'video' && (
                                                  <video src={file.url} controls />
                                                )}
                                                {fileType === 'document' && (
                                                  <div className="document-icon">
                                                    <FiFile size={48} />
                                                    <span className="file-name">{file.name}</span>
                                                  </div>
                                                )}
                                                <div className="file-preview-overlay">
                                                  <span className="file-name">{file.name}</span>
                                                  <a 
                                                    href={file.url} 
                                                    download={file.name}
                                                    className="download-btn"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onFileDownload(file);
                                                    }}
                                                  >
                                                    <FiDownload /> Baixar
                                                  </a>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {work.orcamentos && Array.isArray(work.orcamentos) && work.orcamentos.length > 0 && (
                            <div className="orcamentos-sidebar">
                              <div className="orcamentos-header">
                                <h3>Orçamentos</h3>
                                <p className="orcamentos-tip">Clique em "Aceitar" para aprovar um orçamento</p>
                              </div>
                              <div className="orcamentos-list">
                                {work.orcamentos.map((orcamento, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`orcamento-card ${orcamento.aceito ? 'orcamento-aceito' : ''}`}
                                  >
                                    <div className="orcamento-info">
                                      <h4>{orcamento.fornecedor}</h4>
                                      <span className="orcamento-date">
                                        {new Date(orcamento.data).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="orcamento-value">
                                      {orcamento.valor.toLocaleString('pt-PT', {
                                        style: 'currency',
                                        currency: 'EUR'
                                      })}
                                    </div>
                                    <div className="orcamento-actions">
                                      {orcamento.aceito ? (
                                        <div className="orcamento-aceito-badge">
                                          <FiCheck /> Aceito
                                        </div>
                                      ) : (
                                        <>
                                          <button 
                                            className="orcamento-download"
                                            onClick={() => onFileDownload(orcamento.arquivo)}
                                          >
                                            <FiDownload /> Ver PDF
                                          </button>
                                          <button 
                                            className="orcamento-mensagem"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (onSendMessage) {
                                                onSendMessage(work.id, orcamento.fornecedorId, orcamento.fornecedor);
                                              }
                                            }}
                                            title="Enviar mensagem ao fornecedor"
                                          >
                                            <FiMessageCircle /> Mensagem
                                          </button>
                                          <button 
                                            className="orcamento-aceitar"
                                            onClick={() => onAcceptOrcamento(work.id, idx)}
                                            title="Aceitar este orçamento"
                                          >
                                            <FiCheck style={{ strokeWidth: 3 }} /> Aceitar
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default WorksTable; 