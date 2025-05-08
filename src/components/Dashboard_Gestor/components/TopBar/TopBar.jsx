import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiCalendar, FiBriefcase, FiMessageSquare, FiUser, FiTool, FiArrowLeft, FiSettings } from 'react-icons/fi';
import { getAuth, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import './TopBar.css';

const TopBar = ({ unreadCount = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [empresaNome, setEmpresaNome] = useState('');
  const auth = getAuth();

  useEffect(() => {
    const carregarDadosUsuario = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.empresaNome) {
              setEmpresaNome(userData.empresaNome);
            } else if (userData.name) {
              setEmpresaNome(userData.name);
            }
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
        }
      }
    };

    carregarDadosUsuario();
  }, [auth.currentUser]);

  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div className="topbar-container">
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-button-topbar" onClick={handleLogout}>
            <FiArrowLeft />
          </button>
          <div className="topbar-logo">
            <Link to="/dashgestor">
              <FiSettings className="logo-icon" />
              <h1>{empresaNome || "Portal do Gestor"}</h1>
            </Link>
          </div>
        </div>
        
        <nav className="topbar-nav">
          <Link to="/dashgestor" className={isActive('/dashgestor') && !isActive('/obras') && !isActive('/calendario') && !isActive('/mensagens') && !isActive('/perfil') && !isActive('/manutencoes') ? 'active' : ''}>
            <FiHome />
            <span>Painel</span>
          </Link>
          <Link to="/dashgestor/obras" className={isActive('/obras') ? 'active' : ''}>
            <FiBriefcase />
            <span>Obras</span>
          </Link>
          <Link to="/dashgestor/manutencoes" className={isActive('/manutencoes') ? 'active' : ''}>
            <FiTool />
            <span>Manutenções</span>
          </Link>
          <Link to="/dashgestor/calendario" className={isActive('/calendario') ? 'active' : ''}>
            <FiCalendar />
            <span>Calendário</span>
          </Link>
          <Link to="/dashgestor/mensagens" className={isActive('/mensagens') ? 'active' : ''}>
            <FiMessageSquare />
            <span>Mensagens</span>
            {unreadCount > 0 && (
              <span className="messages-badge">{unreadCount}</span>
            )}
          </Link>
          <Link to="/dashgestor/perfil" className={isActive('/perfil') ? 'active' : ''}>
            <FiUser />
            <span>Perfil</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default TopBar; 