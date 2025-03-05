import React from 'react';
import './WorksTable.css';
import { FiEdit2, FiCheck, FiX, FiAlertCircle, FiDownload, FiFile, FiEye } from 'react-icons/fi';
import LoadingAnimation from '../../../LoadingAnimation/LoadingAnimation';

function WorksTable({ 
  isLoading, 
  filteredWorks, 
  expandedWorks, 
  handleViewDetails, 
  handleEdit, 
  handleComplete, 
  handleDelete, 
  unviewedOrcamentos,
  handleFileDownload,
  handleAceitarOrcamento,
  markOrcamentosAsViewed
}) {
  return (
    <section className="works-table-container">
      {isLoading ? (
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorks.map((work, index) => (
              <React.Fragment key={`${work.id}-${index}`}>
                <tr 
                  className={`work-row ${work.status === 'Concluído' ? 'concluida' : ''} ${unviewedOrcamentos[work.id] ? 'work-row-with-notification' : ''}`}
                  onClick={() => handleViewDetails(work.id)}
                >
                  <td>
                    <div className="title-with-notification">
                      <span className="work-title">{work.title}</span>
                      {Array.isArray(work.orcamentos) && work.orcamentos.length > 0 && (
                        <span className="orcamentos-count" title={`${work.orcamentos.length} orçamento(s) disponível(is)`}>
                          {work.orcamentos.length}
                        </span>
                      )}
                      {unviewedOrcamentos[work.id] && (
                        <span 
                          className="orcamento-notification" 
                          title={`${unviewedOrcamentos[work.id]} novo(s) orçamento(s)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(work.id);
                          }}
                        >
                          <FiAlertCircle />
                          <span className="notification-count">{unviewedOrcamentos[work.id]}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{new Date(work.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`category-badge ${work.category.toLowerCase()}`}>
                      {work.category}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge ${work.priority.toLowerCase()}`}>
                      {work.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${work.status.toLowerCase().replace(' ', '-')}`}>
                      {work.status}
                    </span>
                  </td>
                  <td className="actions-cell" onClick={e => e.stopPropagation()}>
                    <button 
                      className="action-btn" 
                      title="Editar"
                      onClick={() => handleEdit(work)}
                    >
                      <FiEdit2 />
                    </button>
                    <button 
                      className="action-btn" 
                      title="Marcar como concluído"
                      onClick={() => handleComplete(work.id)}
                    >
                      <FiCheck />
                    </button>
                    <button 
                      className="action-btn delete-btn" 
                      title="Excluir"
                      onClick={() => handleDelete(work.id)}
                    >
                      <FiX />
                    </button>
                  </td>
                </tr>
                {expandedWorks.has(work.id) && (
                  <tr className="details-row">
                    <td colSpan="6">
                      <div className="work-details">
                        {unviewedOrcamentos[work.id] && markOrcamentosAsViewed(work.id)}
                        <div className="work-details-container">
                          <div className="work-details-main">
                            <div className="details-content">
                              <div className="details-section">
                                <h4>Descrição</h4>
                                <p>{work.description}</p>
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
                                      onClick={() => handleStatusChange(work.id, 'Pendente')}
                                    >
                                      Pendente
                                    </button>
                                    <button 
                                      className={`status-btn ${work.status === 'Em Andamento' ? 'active' : ''}`}
                                      onClick={() => handleStatusChange(work.id, 'Em Andamento')}
                                    >
                                      Em Andamento
                                    </button>
                                    <button 
                                      className={`status-btn ${work.status === 'Concluído' ? 'active' : ''}`}
                                      onClick={() => handleStatusChange(work.id, 'Concluído')}
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
                                      const filesOfType = work.files.filter(file => file.type === fileType);
                                      if (filesOfType.length === 0) return null;
                                      
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
                                                      handleFileDownload(file);
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
                          
                          {work.orcamentos && work.orcamentos.length > 0 && (
                            <div className="orcamentos-sidebar">
                              <div className="orcamentos-header">
                                <h3>Orçamentos</h3>
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
                                            onClick={() => handleFileDownload(orcamento.arquivo)}
                                          >
                                            <FiDownload /> Ver PDF
                                          </button>
                                          <button 
                                            className="orcamento-aceitar"
                                            onClick={() => handleAceitarOrcamento(work.id, idx)}
                                          >
                                            <FiCheck />
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