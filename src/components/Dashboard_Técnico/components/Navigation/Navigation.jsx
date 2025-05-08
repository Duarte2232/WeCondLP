import React from 'react';
import { FiHome, FiBriefcase, FiCalendar, FiMessageSquare, FiUser } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="top-nav">
      <div className="nav-brand">
        <FiBriefcase className="nav-icon" />
        <span>Portal do Prestador</span>
      </div>
      <div className="nav-links">
        <button 
          className={`nav-link ${isActive('/dashtecnico') ? 'active' : ''}`} 
          onClick={() => navigate('/dashtecnico')}
        >
          <FiHome />
          Painel
        </button>
        <button 
          className={`nav-link ${isActive('/obras') ? 'active' : ''}`}
          onClick={() => navigate('/obras')}
        >
          <FiBriefcase />
          Obras
        </button>
        <button 
          className={`nav-link ${isActive('/calendario') ? 'active' : ''}`}
          onClick={() => navigate('/calendario')}
        >
          <FiCalendar />
          Calendário
        </button>
        <button 
          className={`nav-link ${isActive('/mensagens') ? 'active' : ''}`}
          onClick={() => navigate('/mensagens')}
        >
          <FiMessageSquare />
          Mensagens
        </button>
        <button 
          className={`nav-link ${isActive('/perfil-tecnico') ? 'active' : ''}`}
          onClick={() => navigate('/perfil-tecnico')}
        >
          <FiUser />
          Perfil
        </button>
      </div>
    </nav>
  );
};

export default Navigation; 