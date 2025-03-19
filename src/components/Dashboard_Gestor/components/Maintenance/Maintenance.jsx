import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './Maintenance.css';

const Maintenance = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashgestor');
  };

  return (
    <div className="maintenance-container">
      <div className="maintenance-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1>Manutenções</h1>
      </div>
      <div className="maintenance-content">
        <p>Componente de manutenções em desenvolvimento.</p>
      </div>
    </div>
  );
};

export default Maintenance; 