import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  return (
    <div className="main-content messages-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1 className="page-title">Mensagens</h1>
      </div>
      
      <div className="messages-container">
        <p>Nenhuma mensagem disponível no momento.</p>
      </div>
    </div>
  );
};

export default Messages; 