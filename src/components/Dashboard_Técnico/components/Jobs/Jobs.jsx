import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft, FiTag, FiInfo, FiAlertCircle, FiMessageSquare, FiFile, FiImage, FiDownload, FiEdit2 } from 'react-icons/fi';
import { db } from '../../../../services/firebase';
import { collection, doc, getDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../../../contexts/auth';
import './Jobs.css';

const Jobs = ({ jobs, loading }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { user } = useAuth();
  const [expandedWorks, setExpandedWorks] = useState(new Set());
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Depurar as obras recebidas
  console.log("Jobs recebidos no componente:", jobs);
  
  if (loading) {
    return <div className="loading">Carregando obras...</div>;
  }

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  // Função para visualizar detalhes da obra
  const handleViewDetails = (workId) => {
    setExpandedWorks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workId)) {
        newSet.delete(workId);
      } else {
        newSet.add(workId);
      }
      return newSet;
    });
  };

  // Função para fazer download de arquivos
  const handleFileDownload = async (file) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      alert('Erro ao fazer download do arquivo. Por favor, tente novamente.');
    }
  };

  // Função para iniciar uma conversa com o gestor da obra
  const startConversation = async (job) => {
    try {
      setIsMessageLoading(true);
      console.log('Starting conversation for job:', job);
      console.log('Full job data:', JSON.stringify(job, null, 2));
      
      // Get the gestor ID from the job's userId (the creator of the job)
      const gestorId = job.userId;
      console.log('Gestor ID found:', gestorId);
      
      if (!gestorId) {
        console.error('No gestor ID found for this job. Available properties:', Object.keys(job));
        return;
      }

      // Fetch gestor data from Firestore
      const gestorDoc = await getDoc(doc(db, 'users', gestorId));
      
      if (!gestorDoc.exists()) {
        console.error('Gestor document not found for ID:', gestorId);
        return;
      }

      const gestorData = gestorDoc.data();
      console.log('Gestor data:', gestorData);

      // Assign the technician to the work
      const workRef = doc(db, 'works', job.id);
      await updateDoc(workRef, {
        technicianId: auth.currentUser.uid,
        status: 'confirmada'
      });

      // Navigate to messages with gestor information
      navigate('/dashtecnico/mensagens', { 
        state: { 
          gestorId: gestorId,
          gestorName: gestorData.email || 'Gestor',
          obraId: job.id,
          obraTitle: job.title
        }
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Erro ao iniciar conversa. Tente novamente.');
    } finally {
      setIsMessageLoading(false);
    }
  };

  // Função para atualizar o status da obra
  const handleStatusUpdate = async (jobId, newStatus) => {
    try {
      const workRef = doc(db, 'works', jobId);
      await updateDoc(workRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Atualizar o estado local
      const updatedJobs = jobs.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      );
      setJobs(updatedJobs);
      
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  // Função auxiliar para agrupar arquivos por tipo
  const groupFilesByType = (files = []) => {
    return {
      images: files.filter(file => file?.type === 'image'),
      videos: files.filter(file => file?.type === 'video'),
      documents: files.filter(file => file?.type !== 'image' && file?.type !== 'video')
    };
  };

  // Filtrar obras por status
  const filteredJobs = selectedStatus
    ? jobs.filter(job => job.status === selectedStatus)
    : jobs;

  return (
    <div className="main-content obras-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1 className="page-title">Obras</h1>
        <div className="status-filter">
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="disponivel">Disponíveis</option>
            <option value="confirmada">Confirmadas</option>
            <option value="em-andamento">Em Andamento</option>
            <option value="concluida">Concluídas</option>
          </select>
        </div>
      </div>
      
      <div className="jobs-list">
        {filteredJobs && filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <h2>{job.title}</h2>
                <span className={`status-badge ${job.status || 'disponivel'}`}>
                  {!job.status ? "Disponível" :
                   job.status === "disponivel" ? "Disponível" : 
                   job.status === "confirmada" ? "Confirmada" : 
                   job.status === "concluida" ? "Concluída" : 
                   job.status === "em-andamento" ? "Em Andamento" :
                   job.status}
                </span>
              </div>
              
              <div className="job-details">
                <div className="job-category">
                  <FiTag />
                  <span>{job.category}</span>
                </div>
                <div className="job-location">
                  <FiMapPin />
                  <span>{job.location?.cidade ? `${job.location.morada}, ${job.location.cidade}` : 'Localização não especificada'}</span>
                </div>
                <div className="job-time">
                  <FiClock />
                  <span>{job.date} • {job.time || 'Horário não especificado'}</span>
                </div>
                {expandedWorks.has(job.id) && (
                  <div className="expanded-details">
                    <div className="expanded-section">
                      <h3 className="expanded-title">Descrição</h3>
                      <p>{job.description}</p>
                    </div>
                    
                    <div className="expanded-section">
                      <h3 className="expanded-title">Localização</h3>
                      <div className="location-details">
                        <p><strong>Morada:</strong> {job.location?.morada || 'Não especificada'}</p>
                        <p><strong>Código Postal:</strong> {job.location?.codigoPostal || 'Não especificado'}</p>
                        <p><strong>Cidade:</strong> {job.location?.cidade || 'Não especificada'}</p>
                        <p><strong>Andar:</strong> {job.location?.andar || 'Não especificado'}</p>
                      </div>
                    </div>
                    
                    {job.files && job.files.length > 0 && (
                      <div className="expanded-section">
                        <h3 className="expanded-title">Arquivos</h3>
                        <div className="files-container">
                          {groupFilesByType(job.files).images.length > 0 && (
                            <div className="files-section">
                              <h4 className="files-title">Imagens</h4>
                              <div className="files-grid">
                                {groupFilesByType(job.files).images.map((file, index) => (
                                  <div key={index} className="file-item">
                                    <div className="file-preview">
                                      <img src={file.url} alt={file.name} />
                                    </div>
                                    <div className="file-info">
                                      <span className="file-name">{file.name}</span>
                                      <button 
                                        className="file-download-btn"
                                        onClick={() => handleFileDownload(file)}
                                      >
                                        <FiDownload />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {groupFilesByType(job.files).documents.length > 0 && (
                            <div className="files-section">
                              <h4 className="files-title">Documentos</h4>
                              <div className="documents-list">
                                {groupFilesByType(job.files).documents.map((file, index) => (
                                  <div key={index} className="document-item">
                                    <div className="document-icon">
                                      <FiFile />
                                    </div>
                                    <div className="document-info">
                                      <span className="document-name">{file.name}</span>
                                    </div>
                                    <button 
                                      className="document-download-btn"
                                      onClick={() => handleFileDownload(file)}
                                    >
                                      <FiDownload />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {job.orcamentos && (
                      <div className="expanded-section">
                        <h3 className="expanded-title">Orçamentos</h3>
                        <div className="orcamentos-details">
                          <p><strong>Mínimo:</strong> {job.orcamentos.minimo ? `${job.orcamentos.minimo}€` : 'Não especificado'}</p>
                          <p><strong>Máximo:</strong> {job.orcamentos.maximo ? `${job.orcamentos.maximo}€` : 'Não especificado'}</p>
                          <p><strong>Prazo:</strong> {job.prazoOrcamentos || 'Não especificado'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="job-actions">
                <button 
                  className="view-details-btn"
                  onClick={() => handleViewDetails(job.id)}
                >
                  {expandedWorks.has(job.id) ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                </button>
                
                {job.status === 'confirmada' && (
                  <button 
                    className="status-update-btn"
                    onClick={() => handleStatusUpdate(job.id, 'em-andamento')}
                  >
                    Iniciar Obra
                  </button>
                )}
                
                {job.status === 'em-andamento' && (
                  <button 
                    className="status-update-btn"
                    onClick={() => handleStatusUpdate(job.id, 'concluida')}
                  >
                    Concluir Obra
                  </button>
                )}
                
                <button 
                  className={`chat-gestor-btn ${isMessageLoading ? 'loading' : ''}`}
                  onClick={() => startConversation(job)}
                  disabled={isMessageLoading}
                >
                  <FiMessageSquare />
                  {isMessageLoading ? 'Iniciando conversa...' : 'Conversar com o gestor'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-jobs-message">
            <div className="no-jobs-icon">
              <FiAlertCircle />
            </div>
            <h3>Nenhuma obra disponível para suas especialidades no momento</h3>
            <p>As obras aparecerão aqui quando:</p>
            <ul className="no-jobs-list">
              <li><FiInfo /> Gestores criarem obras com categorias que correspondam às suas especialidades</li>
              <li><FiInfo /> As obras estiverem com status "disponível" no sistema</li>
              <li><FiInfo /> Seu perfil estiver completo com todas as especialidades desejadas</li>
            </ul>
            <button className="check-profile-btn" onClick={() => navigate('/dashtecnico/perfil')}>
              Verificar meu perfil
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs; 