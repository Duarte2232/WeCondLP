import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft, FiTag, FiInfo, FiAlertCircle } from 'react-icons/fi';
import './Jobs.css';

const Jobs = ({ jobs, loading }) => {
  const navigate = useNavigate();
  
  // Depurar as obras recebidas
  console.log("Jobs recebidos no componente:", jobs);
  
  if (loading) {
    return <div className="loading">Carregando obras...</div>;
  }

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
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