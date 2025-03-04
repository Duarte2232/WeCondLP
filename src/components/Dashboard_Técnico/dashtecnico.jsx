import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.jsx';
import { getAuth } from 'firebase/auth';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Navigation from './components/Navigation/Navigation';
import Metrics from './components/Metrics/Metrics';
import Jobs from './components/Jobs/Jobs';
import './dashtecnico.css';

const DashTecnico = () => {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perfilCompleto, setPerfilCompleto] = useState(true);
  const [userData, setUserData] = useState(null);
  const [secoesPendentes, setSecoesPendentes] = useState([]);
  const auth = getAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verificarPerfil = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const userData = userDoc.data();
        setUserData(userData);

        const secoesPendentes = [];

        const temTodosDocumentos = userData.documentos && Object.keys(userData.documentos).length >= 6;
        if (!temTodosDocumentos) {
          secoesPendentes.push('Documentos obrigatórios por lei');
        }

        const temEspecialidades = userData.especialidades && userData.especialidades.length > 0;
        if (!temEspecialidades) {
          secoesPendentes.push('Especialidades e serviços oferecidos');
        }

        const temContactos = userData.empresaTelefone && userData.empresaEmail;
        if (!temContactos) {
          secoesPendentes.push('Contactos da empresa');
        }

        setPerfilCompleto(secoesPendentes.length === 0);
        setSecoesPendentes(secoesPendentes);
      }
    };

    verificarPerfil();
  }, [auth.currentUser]);

  useEffect(() => {
    const fetchObras = async () => {
      try {
        const obrasRef = collection(db, 'works');
        const q = query(obrasRef, where("status", "==", "disponivel"));
        const querySnapshot = await getDocs(q);
        
        const obrasData = [];
        querySnapshot.forEach((doc) => {
          obrasData.push({ id: doc.id, ...doc.data() });
        });

        setObras(obrasData);
      } catch (error) {
        console.error("Erro ao buscar obras:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchObras();
  }, []);

  const metrics = {
    pending: obras.filter(w => w.status === "disponivel").length,
    completed: obras.filter(w => w.status === "concluido").length,
    thisMonth: obras.length,
    rating: "4.8"
  };

  const handleViewAllJobs = () => {
    navigate('/obras');
  };

  const isHomePage = location.pathname === '/dashtecnico';

  return (
    <Layout>
      <Navigation />
      {!perfilCompleto && (
        <div className="perfil-incompleto-alert">
          <div className="alert-content">
            <h3>Perfil Incompleto</h3>
            <p>Para ter acesso completo à plataforma, é necessário completar seu perfil com as seguintes informações:</p>
            <ul>
              {secoesPendentes.map((secao, index) => (
                <li key={index}>{secao}</li>
              ))}
            </ul>
            <button 
              className="completar-perfil-btn"
              onClick={() => navigate('/perfil-tecnico')}
            >
              Completar Perfil
            </button>
          </div>
        </div>
      )}
      {isHomePage ? (
        <>
          <h1 className="welcome-title">Bem-vindo de Volta</h1>
          <Metrics metrics={metrics} />
          <Jobs 
            jobs={obras}
            loading={loading}
            onViewAll={handleViewAllJobs}
          />
        </>
      ) : (
        <Outlet />
      )}
    </Layout>
  );
};

export default DashTecnico;