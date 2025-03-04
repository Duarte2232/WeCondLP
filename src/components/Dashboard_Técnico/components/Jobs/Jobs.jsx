import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft } from 'react-icons/fi';
import './Jobs.css';

const Jobs = ({ jobs, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  return (
    <div className="main-content jobs-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1 className="page-title">Obras</h1>
      </div>
      
      <div className="jobs-list">
        {jobs?.map((job) => (
          <div key={job.id} className="job-card">
            <div className="job-header">
              <h2>{job.title}</h2>
              <span className={`status-badge ${job.status}`}>
                {job.status === "disponivel" ? "Pendente" : 
                 job.status === "confirmada" ? "Confirmada" : 
                 job.status === "concluida" ? "Concluída" : job.status}
              </span>
            </div>
            
            <div className="job-details">
              <div className="job-location">
                <FiMapPin />
                <span>{job.location.cidade}</span>
              </div>
              <div className="job-time">
                <FiClock />
                <span>{job.date} • {job.time}</span>
              </div>
              <div className="job-contact">
                <FiPhone />
                <span>{job.contact}</span>
              </div>
              <p className="job-description">{job.description}</p>
            </div>

            <div className="job-actions">
              <button className="status-update-btn">Atualizar Estado</button>
              <button className="view-details-btn">Ver Detalhes</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Jobs; 