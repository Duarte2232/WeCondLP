import React, { useState } from 'react';
import './WorksTable.css';
import { FiEdit2, FiCheck, FiX, FiAlertCircle, FiDownload, FiFile, FiEye, FiMessageCircle, FiTrash2 } from 'react-icons/fi';
import LoadingAnimation from '../../../LoadingAnimation/LoadingAnimation';
import WorkDetailsModal from '../WorkDetailsModal/WorkDetailsModal';

function WorksTable({ 
  isLoading, 
  works, 
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
  onSendMessage,
  expandedWorks,
  workOrcamentos
}) {
  const [selectedWork, setSelectedWork] = useState(null);

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

  const handleWorkClick = (workId) => {
    const work = works.find(w => w.id === workId);
    setSelectedWork(work);
    if (onViewDetails) {
      onViewDetails(workId);
    }
  };

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
        <>
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
                    onClick={() => handleWorkClick(work.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td data-label="Título">
                      <div className="title-with-notification">
                        <span className="work-title">{work.title}</span>
                        {workOrcamentos[work.id] && workOrcamentos[work.id].length > 0 && !isSimplified && (
                          <span className="orcamentos-count" title={`${workOrcamentos[work.id].length} orçamento(s) disponível(is)`}>
                            {workOrcamentos[work.id].length}
                          </span>
                        )}
                        {unviewedOrcamentos && unviewedOrcamentos[work.id] && !isSimplified && (
                          <span 
                            className="orcamento-notification" 
                            title={`${unviewedOrcamentos[work.id]} novo(s) orçamento(s)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWorkClick(work.id);
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
                      <td className="actions-cell" onClick={e => e.stopPropagation()}>
                        <button 
                          className="action-btn view-btn" 
                          title="Ver detalhes"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWorkClick(work.id);
                          }}
                        >
                          <FiEye />
                        </button>
                        <button 
                          className="action-btn edit-btn" 
                          title="Editar"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(work);
                          }}
                        >
                          <FiEdit2 />
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          title="Excluir"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(work.id);
                          }}
                        >
                          <FiTrash2 />
                        </button>
                        {work.status !== 'Concluído' && (
                          <button 
                            className="action-btn complete-btn" 
                            title="Marcar como concluído"
                            onClick={(e) => {
                              e.stopPropagation();
                              onComplete(work.id);
                            }}
                          >
                            <FiCheck />
                          </button>
                        )}
                        {onSendMessage && (
                          <button 
                            className="action-btn message-btn" 
                            title="Enviar mensagem"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendMessage(work);
                            }}
                          >
                            <FiMessageCircle />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  {expandedWorks.has(work.id) && (
                    <tr className="expanded-details">
                      <td colSpan="5">
                        <div className="work-details">
                          <h4>Detalhes da Obra</h4>
                          <p><strong>Descrição:</strong> {work.description}</p>
                          {work.location && (
                            <p>
                              <strong>Localização:</strong> {work.location.morada}, {work.location.cidade}
                            </p>
                          )}
                          
                          {/* Orçamentos Section */}
                          <div className="orcamentos-section">
                            <h4>Orçamentos Recebidos</h4>
                            {workOrcamentos[work.id] && workOrcamentos[work.id].length > 0 ? (
                              <div className="orcamentos-list">
                                {workOrcamentos[work.id].map((orcamento) => (
                                  <div key={orcamento.id} className="orcamento-item">
                                    <div className="orcamento-info">
                                      <p><strong>Técnico:</strong> {orcamento.technicianName}</p>
                                      <p><strong>Valor:</strong> €{orcamento.valor}</p>
                                      <p><strong>Data:</strong> {new Date(orcamento.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                      {orcamento.observacoes && (
                                        <p><strong>Observações:</strong> {orcamento.observacoes}</p>
                                      )}
                                    </div>
                                    {work.status === "disponivel" && !orcamento.aceito && (
                                      <button 
                                        className="accept-btn"
                                        onClick={() => onAcceptOrcamento(work.id, orcamento.id)}
                                      >
                                        Aceitar Orçamento
                                      </button>
                                    )}
                                    {orcamento.aceito && (
                                      <span className="accepted-badge">Orçamento Aceito</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p>Nenhum orçamento recebido ainda.</p>
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

          {selectedWork && (
            <WorkDetailsModal
              work={selectedWork}
              onClose={() => setSelectedWork(null)}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onStatusChange={onStatusChange}
              onFileDownload={onFileDownload}
              workOrcamentos={workOrcamentos[selectedWork.id] || []}
            />
          )}
        </>
      )}
    </section>
  );
}

export default WorksTable; 