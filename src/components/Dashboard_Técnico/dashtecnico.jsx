import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
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
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);
  const auth = getAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const triggerProfileUpdate = () => {
    setProfileUpdateTrigger(prev => prev + 1);
  };

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
        setLoading(true);
        
        if (!auth.currentUser) {
          console.log("Usuário não autenticado");
          setObras([]);
          setLoading(false);
          return;
        }

        // Buscar os dados do usuário para obter especialidades
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const userData = userDoc.data();
        
        console.log("Especialidades do técnico:", userData?.especialidades);
        
        if (!userData || !userData.especialidades || userData.especialidades.length === 0) {
          console.log("Técnico sem especialidades definidas");
          setObras([]);
          setLoading(false);
          return;
        }

        // Normalizar as especialidades do técnico (converter para minúsculas e remover acentos)
        const especialidadesNormalizadas = userData.especialidades.map(esp => 
          esp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        );
        
        console.log("Especialidades normalizadas:", especialidadesNormalizadas);

        // Buscar todas as obras da coleção ObrasPedidos
        const obrasRef = collection(db, 'ObrasPedidos');
        const obrasQuerySnapshot = await getDocs(obrasRef);
        
        // Buscar todas as manutenções da coleção ManutençãoPedidos
        const manutencoesRef = collection(db, 'ManutençãoPedidos');
        const manutencoesQuerySnapshot = await getDocs(manutencoesRef);
        
        console.log("Total de obras encontradas:", obrasQuerySnapshot.size);
        console.log("Total de manutenções encontradas:", manutencoesQuerySnapshot.size);
        
        // Função para filtrar trabalhos com base nas especialidades
        const filterBySpecialties = (trabalho) => {
          // Se a obra já tiver um técnico atribuído que não seja o usuário atual, pular
          if (trabalho.technicianId && trabalho.technicianId !== auth.currentUser.uid) {
            console.log("Trabalho já atribuído a outro técnico:", trabalho.title);
            return false;
          }
          
          // Se o trabalho não tiver status ou não for "disponivel", mas tiver técnico atribuído igual ao usuário atual, mostrar
          const statusCompativel = !trabalho.status || 
                                  trabalho.status === "disponivel" || 
                                  trabalho.status === "em-andamento" ||
                                  (trabalho.technicianId === auth.currentUser.uid);
          
          if (!statusCompativel) {
            console.log("Status incompatível:", trabalho.status);
            return false;
          }
          
          // Normalizar categoria do trabalho
          const categoriaNormalizada = trabalho.category 
            ? trabalho.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            : "";
          
          // Mapeamento de categorias para palavras-chave de especialidades
          const categoriaKeywords = {
            "eletricidade": ["eletr", "eletric", "eletron"],
            "hidraulica": ["hidraul", "agua", "encanamento", "canos", "tubos"],
            "pintura": ["pintura", "pintor", "tintas"],
            "carpintaria": ["carpintaria", "madeira", "marcenaria"],
            "alvenaria": ["alvenaria", "construcao", "pedreiro", "tijolos", "cimento"],
            "limpeza": ["limpeza", "faxineiro", "limpar"],
            "jardim": ["jardim", "jardinagem", "paisagismo", "plantas"],
            "vidros": ["vidros", "vidraceiro", "janelas"],
            "metal": ["metal", "ferro", "aluminio", "serralheiro"],
            "ceramica": ["ceramica", "azulejos", "pisos", "revestimentos"],
            "gesso": ["gesso", "gessos", "forro", "sancas"],
            "isolamento": ["isolamento", "isolamento termico", "isolamento acustico"],
            "impermeabilizacao": ["impermeabilizacao", "impermeabilizante", "infiltracao"],
            "desentupimento": ["desentupimento", "desentupir", "entupimento"],
            "desratizacao": ["desratizacao", "pragas", "ratos", "insetos"],
            "outros": ["outros", "diversos", "geral"]
          };

          // Verificar se a categoria do trabalho corresponde a alguma especialidade do técnico
          let correspondeEspecialidade = false;
          
          // Primeiro, verificar correspondência direta
          correspondeEspecialidade = especialidadesNormalizadas.some(esp => 
            categoriaNormalizada.includes(esp) || esp.includes(categoriaNormalizada)
          );

          // Se não houver correspondência direta, verificar palavras-chave
          if (!correspondeEspecialidade && categoriaKeywords[categoriaNormalizada]) {
            const keywords = categoriaKeywords[categoriaNormalizada];
            correspondeEspecialidade = especialidadesNormalizadas.some(esp =>
              keywords.some(keyword => esp.includes(keyword) || keyword.includes(esp))
            );
          }

          return correspondeEspecialidade;
        };

        // Processar obras
        const obrasData = [];
        obrasQuerySnapshot.forEach((doc) => {
          const obraData = { id: doc.id, ...doc.data(), isMaintenance: false };
          if (filterBySpecialties(obraData)) {
            obrasData.push(obraData);
          }
        });

        // Processar manutenções
        const manutencoesData = [];
        manutencoesQuerySnapshot.forEach((doc) => {
          const manutencaoData = { id: doc.id, ...doc.data(), isMaintenance: true };
          if (filterBySpecialties(manutencaoData)) {
            manutencoesData.push(manutencaoData);
          }
        });

        // Combinar obras e manutenções
        const allTrabalhos = [...obrasData, ...manutencoesData];
        
        console.log("Obras filtradas:", obrasData.length);
        console.log("Manutenções filtradas:", manutencoesData.length);
        console.log("Total de trabalhos:", allTrabalhos.length);
        
        setObras(allTrabalhos);
      } catch (error) {
        console.error("Erro ao buscar trabalhos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchObras();
  }, [auth.currentUser, profileUpdateTrigger]);

  // Executar uma vez para corrigir categorias de obras (isso não afeta a interface do usuário)
  useEffect(() => {
    const corrigirCategoriasObras = async () => {
      try {
        console.log("Verificando e corrigindo categorias de obras...");
        const obrasRef = collection(db, 'works');
        const querySnapshot = await getDocs(obrasRef);
        
        const batch = writeBatch(db);
        let contadorAtualizacoes = 0;
        
        querySnapshot.forEach((docSnapshot) => {
          const obraData = docSnapshot.data();
          let precisaAtualizar = false;
          const atualizacoes = {};
          
          // Corrigir categoria para variações de "Eletricidade"
          if (obraData.category && typeof obraData.category === 'string') {
            const categoriaNormalizada = obraData.category.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            if (categoriaNormalizada.includes("eletr") && obraData.category !== "Eletricidade") {
              atualizacoes.category = "Eletricidade";
              precisaAtualizar = true;
              console.log(`Corrigindo categoria de obra ${docSnapshot.id} para "Eletricidade"`);
            }
          }
          
          // Se não tiver status, adicionar como "disponivel"
          if (!obraData.status) {
            atualizacoes.status = "disponivel";
            precisaAtualizar = true;
            console.log(`Adicionando status "disponivel" à obra ${docSnapshot.id}`);
          }
          
          if (precisaAtualizar) {
            const obraRef = doc(db, 'works', docSnapshot.id);
            batch.update(obraRef, atualizacoes);
            contadorAtualizacoes++;
          }
        });
        
        if (contadorAtualizacoes > 0) {
          await batch.commit();
          console.log(`${contadorAtualizacoes} obras foram atualizadas.`);
        } else {
          console.log("Nenhuma obra precisou ser atualizada.");
        }
      } catch (error) {
        console.error("Erro ao corrigir categorias:", error);
      }
    };
    
    corrigirCategoriasObras();
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
      <div className="dashboard-content" style={{ padding: location.pathname.includes('/mensagens') ? 0 : undefined }}>
        <Routes>
          <Route path="/" element={renderHomePage()} />
          <Route path="/obras" element={<Jobs jobs={obras} loading={loading} />} />
          <Route path="/calendario" element={<Calendar obras={obras} loading={loading} />} />
          <Route path="/mensagens" element={<Messages />} />
          <Route path="/perfil" element={<PerfilTecnico onProfileUpdate={triggerProfileUpdate} />} />
        </Routes>
      </div>
    </div>
  );
};

export default DashTecnico; 