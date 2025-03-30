import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft, FiTag, FiInfo, FiAlertCircle, FiMessageSquare } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import './Jobs.css';

const Jobs = ({ jobs, loading }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  
  // Depurar as obras recebidas
  console.log("Jobs recebidos no componente:", jobs);
  
  if (loading) {
    return <div className="loading">Carregando obras...</div>;
  }

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  // Função para iniciar conversa com o gestor
  const startConversation = async (job) => {
    try {
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
    }
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
                  <span>{job.location?.cidade || 'Localização não especificada'}</span>
                </div>
                <div className="job-time">
                  <FiClock />
                  <span>{job.date} • {job.time || 'Horário não especificado'}</span>
                </div>
                <div className="job-contact">
                  <FiPhone />
                  <span>{job.contact || 'Contato não especificado'}</span>
                </div>
                <p className="job-description">{job.description}</p>
              </div>

              <div className="job-actions">
                <button className="status-update-btn">Atualizar Estado</button>
                <button className="view-details-btn">Ver Detalhes</button>
                <button 
                  className="chat-gestor-btn"
                  onClick={() => startConversation(job)}
                >
                  <FiMessageSquare />
                  Conversar com o gestor
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