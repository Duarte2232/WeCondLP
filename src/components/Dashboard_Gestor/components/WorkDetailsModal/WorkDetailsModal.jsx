import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiTrash2, FiCheck, FiDownload, FiRotateCcw, FiCheckCircle, FiShare2, FiMessageSquare, FiUser, FiEye } from 'react-icons/fi';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import './WorkDetailsModal.css';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import RatingModal from '../RatingModal/RatingModal';
import OrcamentoDetailsModal from '../OrcamentoDetailsModal/OrcamentoDetailsModal';

const WorkDetailsModal = ({ work, onClose, onEdit, onDelete, onComplete, onFileDownload, onAcceptOrcamento, workOrcamentos, onCancelarAceitacao }) => {
  // Declarar todos os hooks primeiro, independentemente da condição
  const [technicianNames, setTechnicianNames] = useState({});
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [technician, setTechnician] = useState(null);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();
  
  // Atualiza editData quando work mudar
  useEffect(() => {
    if (work) {
      setEditData({ ...work });
    }
  }, [work]);
  
  // Fetch orcamentos and technician names when component mounts
  useEffect(() => {
    if (!work) return; // Guarda de segurança dentro do useEffect
    
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
          if (work?.isMaintenance) {
            console.log("Buscando orçamentos do Firestore para manutencaoId:", work.id);
            const orcamentosRef = collection(db, 'ManutençãoOrçamentos');
            const q = query(orcamentosRef, where('manutencaoId', '==', work.id));
            const querySnapshot = await getDocs(q);
            const orcamentosData = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log(`Encontrados ${orcamentosData.length} orçamentos no Firestore (ManutençãoOrçamentos):`, orcamentosData);
            setOrcamentos(orcamentosData);
          } else {
            console.log("Buscando orçamentos do Firestore para workId:", work.id);
            const orcamentosRef = collection(db, 'ObrasOrçamentos');
            const q = query(orcamentosRef, where('workId', '==', work.id));
            const querySnapshot = await getDocs(q);
            const orcamentosData = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log(`Encontrados ${orcamentosData.length} orçamentos no Firestore (ObrasOrçamentos):`, orcamentosData);
            setOrcamentos(orcamentosData);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar orçamentos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  
    // Buscar dados do técnico associado à obra, se existir
    const fetchTechnicianData = async () => {
      if (work?.technicianId) {
        try {
          const technicianDoc = await getDoc(doc(db, 'users', work.technicianId));
          if (technicianDoc.exists()) {
            setTechnician(technicianDoc.data());
          }
        } catch (error) {
          console.error('Erro ao buscar dados do técnico:', error);
        }
      }
    };
    
    fetchTechnicianData();
  }, [work, workOrcamentos]);
  
  
  // Fetch technician names when orcamentos are loaded
  useEffect(() => {
    if (!work) return; // Adicionar guarda de segurança para evitar erros
    if (orcamentos.length > 0) {
      const fetchTechnicianNames = async () => {
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
      };
      
      fetchTechnicianNames();
    }
  }, [orcamentos, work]);

  // Log work data as a side effect, but handle it in a way that won't cause React errors
  useEffect(() => {
    if (!work) return; // Guarda de segurança
    
    if (process.env.NODE_ENV === 'development') {
      // Safe console logging dentro de um useEffect
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
  }, [work, orcamentos]);

  // Se work for null, renderiza null após a declaração de todos os hooks e useEffects
  if (!work) {
    return null;
  }

  const handleComplete = () => {
    // Verificar se estamos mudando de um status diferente para concluído
    const mudandoParaConcluido = work.status !== 'concluido';
    
    console.log('Status atual:', work.status);
    console.log('Técnico associado:', work.technicianId);
    console.log('Mudando para concluído:', mudandoParaConcluido);
    
    // Se estamos mudando para "concluido" e temos um técnico associado, mostrar modal de avaliação
    if (mudandoParaConcluido && work.technicianId) {
      console.log('Abrindo modal de avaliação');
      // Verificar dados do técnico
      if (technician) {
        console.log('Dados do técnico disponíveis:', technician);
      } else {
        console.log('Dados do técnico não disponíveis, apenas ID:', work.technicianId);
      }
      
      setShowRatingModal(true);
    } else {
      // Caso esteja revertendo de concluído para disponível ou não tenha técnico associado
      const newStatus = work.status === 'concluido' ? 'disponivel' : 'concluido';
      console.log('Atualizando status diretamente para:', newStatus);
      onComplete(work.id, newStatus);
    }
  };
  
  const handleRatingSubmit = async (ratingData) => {
    try {
      console.log('Iniciando o envio da avaliação:', ratingData);
      console.log('Dados da obra:', work);
      console.log('UID do usuário atual:', auth.currentUser?.uid);
      
      setShowRatingModal(false);
      
      // Verificações de dados críticos antes de salvar
      if (!work.technicianId) {
        console.error('Erro: technicianId não disponível');
        throw new Error('ID do técnico não disponível');
      }
      
      if (!auth.currentUser?.uid) {
        console.error('Erro: usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }
      
      // Criar a avaliação na coleção "avaliacoes" com dados validados
      const avaliacaoData = {
        technicianId: work.technicianId,
        userId: auth.currentUser.uid,
        workId: work.id,
        servicoTitulo: work.title || 'Serviço sem título',
        rating: ratingData.rating,
        comentario: ratingData.comment || '',
        createdAt: serverTimestamp(),
        isMaintenance: work.isMaintenance || false
      };
      
      console.log('Dados da avaliação a serem salvos:', avaliacaoData);
      
      // Salvar no Firestore
      const docRef = await addDoc(collection(db, 'avaliacoes'), avaliacaoData);
      console.log('Avaliação salva com sucesso! ID do documento:', docRef.id);
      
      // Atualizar o status da obra para concluído
      onComplete(work.id, 'concluido');
      
      toast.success('Avaliação enviada com sucesso!', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#4CAF50',
          color: '#fff',
          fontWeight: 'bold',
          padding: '16px',
          borderRadius: '8px',
        },
      });
    } catch (error) {
      console.error('Erro detalhado ao enviar avaliação:', error);
      console.error('Stack trace:', error.stack);
      toast.error('Erro ao enviar avaliação: ' + error.message, {
        duration: 4000,
        position: 'top-right',
      });
    }
  };
  
  const handleAcceptOrcamento = (orcamentoId) => {
    if (onAcceptOrcamento) {
      // Update local state immediately to improve UX
      setOrcamentos(prevOrcamentos => 
        prevOrcamentos.map(orc => 
          orc.id === orcamentoId ? { 
            ...orc, 
            aceito: true, 
            dataAceitacao: new Date() 
          } : orc
        )
      );
      
      // Call the parent handler with the correct parameters
      onAcceptOrcamento(work.id, orcamentoId, work.isMaintenance);
    } else {
      console.error('onAcceptOrcamento function not provided');
      toast.error('Não foi possível aceitar o orçamento. Função de aceitação não fornecida.', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const handleFileDownload = (file) => {
    try {
      // Verificar se o arquivo tem a URL antes de tentar baixar
      if (file.url || file.downloadURL) {
        // Usar a URL disponível no arquivo
        const fileURL = file.url || file.downloadURL;
        // Se tiver URL, criar um link temporário para download direto
        const tempLink = document.createElement('a');
        tempLink.href = fileURL;
        tempLink.setAttribute('download', file.name);
        tempLink.setAttribute('target', '_blank');
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        
        console.log('Download direto via URL:', fileURL);
        toast.success(`A transferir ficheiro: ${file.name}`, {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        // Se não tiver URL direta, usar a função de callback
        console.log('Usando callback onFileDownload para:', file);
        if (typeof onFileDownload === 'function') {
          onFileDownload(file);
          toast.success(`A transferir ficheiro: ${file.name}`, {
            duration: 3000,
            position: 'top-right',
          });
        } else {
          console.error('Função onFileDownload não fornecida ou inválida');
          toast.error('Não foi possível transferir o ficheiro. Função de download não disponível.', {
            duration: 4000,
            position: 'top-right',
          });
        }
      }
    } catch (error) {
      console.error('Erro ao transferir ficheiro:', error);
      toast.error(`Erro ao transferir ficheiro: ${error.message}`, {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const handleEditClick = () => {
    setEditData({ ...work });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const collectionName = work.isMaintenance ? 'ManutençãoPedidos' : 'ObrasPedidos';
      const workRef = doc(db, collectionName, work.id);
      await updateDoc(workRef, editData);
      setIsEditing(false);
      toast.success('Dados atualizados com sucesso!', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#4CAF50',
          color: '#fff',
          fontWeight: 'bold',
          padding: '16px',
          borderRadius: '8px',
        },
      });
      window.location.reload(); // Força atualização dos dados (pode ser melhorado para atualizar só o estado)
    } catch (error) {
      toast.error('Erro ao atualizar: ' + error.message, {
        duration: 4000,
        position: 'top-right',
      });
    } finally {
      setSaving(false);
    }
  };

  // Função para iniciar conversa com o técnico do orçamento
  const handleMessageTechnician = async (orcamento) => {
    if (!orcamento || !orcamento.technicianId) {
      toast.error('Não foi possível identificar o técnico para iniciar a conversa.');
      return;
    }
    
    try {
      // Redirecionar para a página de mensagens com o técnico selecionado
      navigate(`/dashgestor/mensagens?tecnico=${orcamento.technicianId}`);
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      toast.error('Erro ao iniciar conversa. Por favor, tente novamente.');
    }
  };

  const handleViewTechnicianProfile = (technicianId, orcamento) => {
    if (!technicianId) {
      toast.error('ID do técnico não disponível');
      return;
    }
    
    // Navegar para a página de perfil do técnico com parâmetros adicionais
    // hideServices=true - não mostrar serviços recentes
    // workId - ID do serviço atual para filtrar avaliações
    navigate(`/dashgestor/tecnico/${technicianId}?hideServices=true&workId=${work.id}&workTitle=${encodeURIComponent(work.title)}`);
  };

  const handleViewOrcamentoDetails = (orcamento) => {
    setSelectedOrcamento(orcamento);
  };

  const handleCloseOrcamentoDetails = () => {
    setSelectedOrcamento(null);
  };

  return (
    <div className="work-details-modal-overlay" onClick={(e) => {
      // Only close if clicking directly on the overlay
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="work-details-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="work-details-modal-header">
          <h2>{isEditing ? 'Editar' : work.title}</h2>
          <button className="close-button" onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}>
            <FiX />
          </button>
        </div>

        <div className="work-details-modal-body" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <form className="edit-work-form" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
              <div className="work-details-section">
                <label>Título</label>
                <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} required />
              </div>
              <div className="work-details-section">
                <label>Descrição</label>
                <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} required />
              </div>
              <div className="work-details-section">
                <label>Categoria</label>
                <input type="text" value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} required />
              </div>
              <div className="work-details-section">
                <label>Prioridade</label>
                <input type="text" value={editData.priority} onChange={e => setEditData({ ...editData, priority: e.target.value })} required />
              </div>
              <div className="work-details-section">
                <label>Data</label>
                <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} required />
              </div>
              <div className="work-details-section">
                <label>Morada</label>
                <input type="text" value={editData.location?.morada || ''} onChange={e => setEditData({ ...editData, location: { ...editData.location, morada: e.target.value } })} required />
              </div>
              <div className="work-details-section">
                <label>Código Postal</label>
                <input type="text" value={editData.location?.codigoPostal || ''} onChange={e => setEditData({ ...editData, location: { ...editData.location, codigoPostal: e.target.value } })} required />
              </div>
              <div className="work-details-section">
                <label>Cidade</label>
                <input type="text" value={editData.location?.cidade || ''} onChange={e => setEditData({ ...editData, location: { ...editData.location, cidade: e.target.value } })} required />
              </div>
              <div className="work-details-section">
                <label>Andar</label>
                <input type="text" value={editData.location?.andar || ''} onChange={e => setEditData({ ...editData, location: { ...editData.location, andar: e.target.value } })} />
              </div>
              <div className="action-buttons">
                <button type="button" className="action-btn delete" onClick={handleEditCancel}>Cancelar</button>
                <button type="submit" className="action-btn complete" disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          ) : (
            <div className="work-details-status-row">
              <div className="status-badges">
                <span className={`status-badge ${work?.status ? work.status.toLowerCase() : 'disponivel'}`}>
                  {work?.status || 'Disponível'}
                </span>
                <span className="category-badge">
                  {work?.category || 'Não categorizado'}
                </span>
              </div>
              <div className="action-buttons">
                <button onClick={handleEditClick} className="action-btn edit">
                  <FiEdit2 /> Editar
                </button>
                <button onClick={() => onDelete(work.id)} className="action-btn delete">
                  <FiTrash2 /> Eliminar
                </button>
                <button 
                  className={`action-btn ${work?.status === 'concluido' ? 'undo' : 'complete'}`}
                  onClick={handleComplete}
                >
                  {work?.status === 'concluido' ? (
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
          )}

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
                  <h3>Ficheiros</h3>
                  <div className="files-list">
                    {work.files.map((file, index) => (
                      <div key={index} className="file-item">
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
            </div>

            {/* Modified orcamentos sidebar */}
            <div className="orcamentos-sidebar">
              <div className="orcamentos-header">
                <h3>Orçamentos Recebidos ({orcamentos.length})</h3>
              </div>
              {loading ? (
                <div className="loading-indicator">Carregando orçamentos...</div>
              ) : orcamentos.length > 0 ? (
                <div className="orcamentos-list">
                  {orcamentos.map((orcamento, index) => {
                    const displayName = technicianNames[orcamento.technicianId] || 'Técnico';
                    return (
                      <div key={orcamento.id || index} 
                           className={`orcamento-card ${orcamento.aceito ? 'orcamento-aceito' : ''}`}
                           onClick={(e) => e.stopPropagation()}>
                        <div className="orcamento-info" style={{flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
                          <h4>{displayName}</h4>
                        </div>
                        <div className="orcamento-value">
                          {orcamento.valor || orcamento.amount || 0}€
                        </div>
                        
                        <div className="orcamento-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn ver-detalhes"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewOrcamentoDetails(orcamento);
                            }}
                          >
                            <FiEye /> Ver Detalhes
                          </button>
                          
                          {orcamento.aceito ? (
                            <button
                              className="action-btn cancelar-orcamento"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Update local state immediately para melhorar a UX
                                setOrcamentos(prevOrcamentos => 
                                  prevOrcamentos.map(orc => 
                                    orc.id === orcamento.id ? { 
                                      ...orc, 
                                      aceito: false,
                                      dataAceitacao: null
                                    } : orc
                                  )
                                );
                                onCancelarAceitacao(work.id, orcamento.id, work.isMaintenance);
                              }}
                            >
                              <FiX /> Cancelar Orçamento
                            </button>
                          ) : work.status === 'disponivel' && !orcamento.aceito ? (
                            <button
                              className="action-btn aceitar-orcamento"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAcceptOrcamento(orcamento.id);
                              }}
                            >
                              <FiCheck /> Aceitar Orçamento
                            </button>
                          ) : null}
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
      
      {showRatingModal && (
        <RatingModal 
          onClose={() => setShowRatingModal(false)} 
          onSubmit={handleRatingSubmit}
          technician={technician}
        />
      )}

      {selectedOrcamento && (
        <OrcamentoDetailsModal
          orcamento={selectedOrcamento}
          technicianName={technicianNames[selectedOrcamento.technicianId]}
          workId={work.id}
          workTitle={work.title}
          onClose={handleCloseOrcamentoDetails}
          onFileDownload={handleFileDownload}
          onMessageTechnician={handleMessageTechnician}
          onViewTechnicianProfile={handleViewTechnicianProfile}
        />
      )}
    </div>
  );
};

export default WorkDetailsModal; 