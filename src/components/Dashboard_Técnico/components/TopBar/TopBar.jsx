import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiCalendar, FiBriefcase, FiMessageSquare, FiUser, FiSearch, FiTool, FiArrowLeft } from 'react-icons/fi';
import { getAuth, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import './TopBar.css';

const TopBar = () => {
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
            <Link to="/dashtecnico">
              <FiTool className="logo-icon" />
              <h1>{empresaNome || "Portal do Técnico"}</h1>
            </Link>
          </div>
        </div>
        
        <nav className="topbar-nav">
          <Link to="/dashtecnico" className={isActive('/dashtecnico') && !isActive('/obras') && !isActive('/calendario') && !isActive('/mensagens') && !isActive('/perfil') ? 'active' : ''}>
            <FiHome />
            <span>Painel</span>
          </Link>
          <Link to="/dashtecnico/obras" className={isActive('/obras') ? 'active' : ''}>
            <FiTool />
            <span>Obras</span>
          </Link>
          <Link to="/dashtecnico/calendario" className={isActive('/calendario') ? 'active' : ''}>
            <FiCalendar />
            <span>Calendário</span>
          </Link>
          <Link to="/dashtecnico/mensagens" className={isActive('/mensagens') ? 'active' : ''}>
            <FiMessageSquare />
            <span>Mensagens</span>
          </Link>
          <Link to="/dashtecnico/perfil" className={isActive('/perfil') ? 'active' : ''}>
            <FiUser />
            <span>Perfil</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default TopBar; 