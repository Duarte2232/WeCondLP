import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft, FiTag, FiInfo, FiAlertCircle, FiMessageSquare, FiFile, FiImage, FiDownload } from 'react-icons/fi';
import { db } from '../../../../services/firebase';
import { collection, doc, getDoc, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../../contexts/auth';
import * as messageService from '../../../../services/messageService';
import './Jobs.css';

const Jobs = ({ jobs, loading }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedWorks, setExpandedWorks] = useState(new Set());
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  
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
  const handleSendMessage = async (workId, gestorId, workTitle) => {
    try {
      if (!user?.uid) {
        alert('Você precisa estar logado para enviar mensagens.');
        return;
      }
      
      setIsMessageLoading(true);
      console.log('Iniciando conversa com gestor:', { workId, gestorId, workTitle });
      
      // Usar o messageService para criar/obter a conversa
      const conversationId = await messageService.startTecnicoGestorConversation(
        user.uid,
        gestorId || 'gestor',
        workId,
        workTitle || 'Sem título'
      );
      
      console.log('Conversa iniciada com ID:', conversationId);
      
      // Para garantir que a conversa esteja disponível no componente Messages,
      // armazenamos temporariamente o ID da conversa
      localStorage.setItem('activeConversationId', conversationId);
      
      // Redirecionar para a página de mensagens
      navigate('/dashtecnico/mensagens');
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      alert('Não foi possível iniciar a conversa. Por favor, tente novamente.');
    } finally {
      setIsMessageLoading(false);
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

  return (
    <div className="main-content obras-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1 className="page-title">Obras</h1>
      </div>
      
      <div className="jobs-list">
        {jobs && jobs.length > 0 ? (
          jobs.map((job) => (
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
                  {expandedWorks.has(job.id) ? "Esconder Detalhes" : "Ver Detalhes"}
                </button>
                <button 
                  className="send-message-btn"
                  onClick={() => handleSendMessage(job.id, job.userId, job.title)}
                >
                  <FiMessageSquare /> Mensagem ao Gestor
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