import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.jsx';
import { getAuth } from 'firebase/auth';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import Metrics from './components/Metrics/Metrics';
import Jobs from './components/Jobs/Jobs';
import TopBar from './components/TopBar/TopBar';
import Messages from './components/Messages/Messages';
import Calendar from './components/Calendar/Calendar';
import PerfilTecnico from './components/Profile/PerfilTecnico';
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

        // Verifica documentos individualmente
        if (!userData.documentos) {
          secoesPendentes.push('Documentos obrigatórios');
        } else {
          // Documentos necessários
          const documentosNecessarios = [
            { id: 'seguroRC', nome: 'Seguro de Responsabilidade Civil' },
            { id: 'seguroTrabalho', nome: 'Seguro de Acidentes de Trabalho' }, 
            { id: 'alvara', nome: 'Alvará' }, 
            { id: 'declaracaoFinancas', nome: 'Declaração das Finanças' }, 
            { id: 'declaracaoSS', nome: 'Declaração da Segurança Social' }, 
            { id: 'cartaoEngenheiro', nome: 'Cartão de Engenheiro' }
          ];
          
          // Verifica se todos os documentos necessários estão presentes
          const documentosFaltantes = documentosNecessarios.filter(
            doc => !userData.documentos[doc.id] || !userData.documentos[doc.id].url
          );
          
          if (documentosFaltantes.length > 0) {
            const nomesDocs = documentosFaltantes.map(doc => doc.nome).join(', ');
            secoesPendentes.push(`Documentos obrigatórios (faltam: ${nomesDocs})`);
          }
        }

        // Verifica especialidades
        const temEspecialidades = userData.especialidades && userData.especialidades.length > 0;
        if (!temEspecialidades) {
          secoesPendentes.push('Especialidades e serviços oferecidos');
        }

        // Verifica dados da empresa e contactos
        const camposFaltantes = [];
        
        if (!userData.empresaNome && !userData.name) {
          camposFaltantes.push('nome da empresa');
        }
        
        if (!userData.empresaTelefone) {
          camposFaltantes.push('telefone');
        }
        
        if (!userData.empresaEmail) {
          camposFaltantes.push('email de contacto');
        }
        
        if (!userData.empresaNIF) {
          camposFaltantes.push('NIF');
        }
        
        if (camposFaltantes.length > 0) {
          secoesPendentes.push(`Dados da empresa (${camposFaltantes.join(', ')})`);
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

  // Renderiza o conteúdo da página inicial
  const renderHomePage = () => {
    return (
      <div className="home-page">
        {!perfilCompleto && (
          <div className="perfil-incompleto-alert">
            <div className="alert-content">
              <h3>Complete o seu perfil</h3>
              <p>Para poder receber e aceitar obras, é necessário completar o seu perfil com as seguintes informações:</p>
              <ul>
                {secoesPendentes.map((secao, index) => (
                  <li key={index}>
                    {secao}
                    {secao.includes('Documentos') && (
                      <button 
                        className="info-button" 
                        title="Documentos necessários: Seguro de Responsabilidade Civil, Seguro de Acidentes de Trabalho, Alvará, Declaração das Finanças, Declaração da Segurança Social, Cartão de Engenheiro"
                      >
                        i
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <button className="completar-perfil-btn" onClick={() => navigate('/dashtecnico/perfil')}>
                Completar Perfil
              </button>
            </div>
          </div>
        )}

        <section className="metrics-section">
          <Metrics metrics={metrics} />
        </section>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <TopBar />
      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={renderHomePage()} />
          <Route path="/obras" element={<Jobs jobs={obras} loading={loading} />} />
          <Route path="/calendario" element={<Calendar />} />
          <Route path="/mensagens" element={<Messages />} />
          <Route path="/perfil" element={<PerfilTecnico />} />
        </Routes>
      </div>
    </div>
  );
};

export default DashTecnico; 