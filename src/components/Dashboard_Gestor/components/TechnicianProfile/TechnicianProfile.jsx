import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FiArrowLeft, FiPhone, FiMail, FiMapPin, FiUser, FiBriefcase, FiCalendar, FiFileText, FiFile, FiEye, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';
import { CLOUDINARY_CONFIG } from '../../../../config/cloudinary';
import './TechnicianProfile.css';
import { toast } from 'react-hot-toast';

function TechnicianProfile() {
  const { technicianId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extrair parâmetros da URL
  const searchParams = new URLSearchParams(location.search);
  const hideServices = searchParams.get('hideServices') === 'true';
  const filterWorkId = searchParams.get('workId');
  const workTitle = searchParams.get('workTitle');
  
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [filteredAvaliacoes, setFilteredAvaliacoes] = useState([]);
  const [documentFilter, setDocumentFilter] = useState('todos'); // 'todos', 'enviados', 'pendentes'

  // Mapeamento de IDs de documento para nomes legíveis
  const documentTypesMap = {
    seguroRC: 'Seguro de responsabilidade civil profissional',
    seguroTrabalho: 'Seguro de acidentes de trabalho',
    alvara: 'Cópia de Alvará',
    declaracaoFinancas: 'Declaração de Não dívida das Finanças',
    declaracaoSS: 'Declaração de Não dívida da Segurança Social',
    cartaoEngenheiro: 'Cópia do Cartão do Engenheiro'
  };

  useEffect(() => {
    const fetchTechnicianData = async () => {
      try {
        setLoading(true);
        
        // Buscar dados do técnico
        const technicianDoc = await getDoc(doc(db, 'users', technicianId));
        
        if (!technicianDoc.exists()) {
          toast.error('Técnico não encontrado');
          navigate('/dashgestor');
          return;
        }
        
        const technicianData = technicianDoc.data();
        console.log('Technician data from TechnicianProfile:', technicianData);
        
        // Debug log para verificar as propriedades de imagem
        console.log('Image properties check:', {
          photoURL: technicianData.photoURL,
          profilePhoto: technicianData.profilePhoto,
          profilePhotoUrl: technicianData.profilePhoto?.url,
          logoUrl: technicianData.logoUrl,
          logo: technicianData.logo,
          logoURL: technicianData.logoURL,
          logoPublicId: technicianData.logoPublicId
        });
        
        setTechnician(technicianData);
        
        // Buscar obras associadas ao técnico
        const obrasQuery = query(
          collection(db, 'ObrasPedidos'),
          where('technicianId', '==', technicianId)
        );
        
        const obrasSnapshot = await getDocs(obrasQuery);
        const obrasData = obrasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setObras(obrasData);
        
        // Buscar manutenções associadas ao técnico
        const manutencoesQuery = query(
          collection(db, 'ManutençãoPedidos'),
          where('technicianId', '==', technicianId)
        );
        
        const manutencoesSnapshot = await getDocs(manutencoesQuery);
        const manutencoesData = manutencoesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setManutencoes(manutencoesData);
        
        // Buscar avaliações do técnico
        const avaliacoesQuery = query(
          collection(db, 'avaliacoes'),
          where('technicianId', '==', technicianId)
        );
        
        const avaliacoesSnapshot = await getDocs(avaliacoesQuery);
        const avaliacoesData = avaliacoesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAvaliacoes(avaliacoesData);
        
      } catch (error) {
        console.error('Erro ao buscar dados do técnico:', error);
        toast.error('Erro ao carregar dados do técnico');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTechnicianData();
  }, [technicianId, navigate]);
  
  // Filtrar avaliações com base no workId quando fornecido
  useEffect(() => {
    if (filterWorkId && avaliacoes.length > 0) {
      const filtered = avaliacoes.filter(avaliacao => 
        avaliacao.workId === filterWorkId
      );
      setFilteredAvaliacoes(filtered);
    } else {
      setFilteredAvaliacoes(avaliacoes);
    }
  }, [avaliacoes, filterWorkId]);

  const handleBack = () => {
    navigate('/dashgestor');
  };

  // Calcular média das avaliações
  const calcularMediaAvaliacoes = () => {
    // Usar sempre todas as avaliações, independente de filtros
    if (avaliacoes.length === 0) return 0;
    
    const soma = avaliacoes.reduce((total, avaliacao) => {
      return total + (avaliacao.rating || 0);
    }, 0);
    
    return (soma / avaliacoes.length).toFixed(1);
  };

  // Renderizar estrelas de avaliação
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        // Estrela preenchida
        stars.push(
          <BsStarFill 
            key={i}
            style={{ 
              color: '#ffd700',
              fontSize: '20px',
              marginRight: '2px'
            }} 
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        // Meia estrela
        stars.push(
          <BsStarHalf 
            key={i}
            style={{ 
              color: '#ffd700',
              fontSize: '20px',
              marginRight: '2px'
            }} 
          />
        );
      } else {
        // Estrela vazia
        stars.push(
          <BsStar 
            key={i}
            style={{ 
              color: '#ffd700',
              fontSize: '20px',
              marginRight: '2px'
            }} 
          />
        );
      }
    }
    
    return stars;
  };

  const filteredDocuments = () => {
    if (!technician || !documentTypesMap) return [];
    
    const allDocKeys = Object.keys(documentTypesMap);
    
    // Criar uma lista completa de documentos (presentes e ausentes)
    const allDocuments = allDocKeys.map(docKey => {
      const documento = technician.documentos && technician.documentos[docKey];
      const isPresent = documento && documento.url;
      
      return {
        key: docKey,
        name: documentTypesMap[docKey],
        documento: documento,
        isPresent: isPresent
      };
    });
    
    // Filtrar conforme a seleção
    if (documentFilter === 'enviados') {
      return allDocuments.filter(doc => doc.isPresent);
    } else if (documentFilter === 'pendentes') {
      return allDocuments.filter(doc => !doc.isPresent);
    }
    
    // Por padrão, retorna todos
    return allDocuments;
  };

  // Adicionar uma função auxiliar para gerar a URL do Cloudinary
  const getCloudinaryUrl = (publicId) => {
    if (!publicId) return null;
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${publicId}`;
  };

  if (loading) {
    return (
      <div className="technician-profile-container">
        <div className="loading-indicator">Carregando dados do técnico...</div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="technician-profile-container">
        <div className="error-message">Técnico não encontrado</div>
      </div>
    );
  }

  const mediaAvaliacoes = calcularMediaAvaliacoes();
  
  // Usar o número de avaliações como serviços concluídos
  const servicosConcluidos = avaliacoes.length;
  
  // Serviços em andamento são aqueles que não estão concluídos
  const servicosEmAndamento = [...obras, ...manutencoes].filter(servico => 
    servico.status === 'em-andamento'
  ).length;
  
  // Total de serviços = concluídos (avaliações) + em andamento
  const totalServicos = servicosConcluidos + servicosEmAndamento;

  // Determinar quais avaliações mostrar
  const avaliacoesToShow = filterWorkId ? filteredAvaliacoes : avaliacoes;

  return (
    <div className="technician-profile-container">
      <div className="technician-profile-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft /> Voltar
        </button>
        <h1>Perfil do Técnico</h1>
      </div>

      <div className="technician-profile-content">
        <div className="technician-profile-card">
          <div className="technician-profile-info">
            <div className="technician-profile-avatar">
              {technician.photoURL || 
                (technician.profilePhoto && technician.profilePhoto.url) || 
                technician.logoUrl || 
                technician.logoPublicId ? (
                <img 
                  src={technician.photoURL || 
                       (technician.profilePhoto && technician.profilePhoto.url) || 
                       technician.logoUrl || 
                       (technician.logoPublicId ? getCloudinaryUrl(technician.logoPublicId) : null)} 
                  alt={technician.empresaNome || technician.name} 
                />
              ) : (
                <div className="avatar-placeholder">
                  <FiUser size={40} />
                </div>
              )}
            </div>
            
            <div className="technician-profile-details">
              <h2>{technician.empresaNome || technician.name}</h2>
              
              <div className="technician-rating">
                <div className="stars-container">
                  {renderStars(mediaAvaliacoes)}
                </div>
                <span className="rating-value">{mediaAvaliacoes}</span>
                <span className="total-ratings">({avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'})</span>
              </div>
              
              <div className="technician-contact">
                {technician.phone && (
                  <div className="contact-item">
                    <FiPhone /> {technician.phone}
                  </div>
                )}
                
                {technician.email && (
                  <div className="contact-item">
                    <FiMail /> {technician.email}
                  </div>
                )}
                
                {technician.address && (
                  <div className="contact-item">
                    <FiMapPin /> {technician.address}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Dados da empresa */}
          <div className="company-info-section">
            <h3>Informação da Empresa</h3>
            <div className="company-info-grid">
              <div className="company-info-item">
                <div className="info-label">Telefone</div>
                <div className="info-value">{technician.empresaTelefone || 'Não disponível'}</div>
              </div>
              <div className="company-info-item">
                <div className="info-label">Email Comercial</div>
                <div className="info-value">{technician.emailComercial || technician.emailRegistro || technician.email || 'Não disponível'}</div>
              </div>
              <div className="company-info-item">
                <div className="info-label">NIF</div>
                <div className="info-value">{technician.empresaNIF || 'Não disponível'}</div>
              </div>
            </div>
          </div>
          
          <div className="technician-stats">
            <div className="stat-item">
              <h3>Total de Serviços</h3>
              <p>{totalServicos}</p>
            </div>
            
            <div className="stat-item">
              <h3>Serviços Concluídos</h3>
              <p>{servicosConcluidos}</p>
            </div>
            
            <div className="stat-item">
              <h3>Em Andamento</h3>
              <p>{servicosEmAndamento}</p>
            </div>
            
            <div className="stat-item">
              <h3>Taxa de Conclusão</h3>
              <p>{totalServicos > 0 ? Math.round((servicosConcluidos / totalServicos) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        <div className="technician-profile-sections">
          <div className="section">
            <h3><FiBriefcase /> Especialidades</h3>
            <div className="specialties-list">
              {technician.especialidades && technician.especialidades.length > 0 ? (
                technician.especialidades.map((especialidade, index) => (
                  <span key={index} className="specialty-tag">{especialidade}</span>
                ))
              ) : (
                <p>Nenhuma especialidade registrada</p>
              )}
            </div>
          </div>
          
          <div className="section">
            <h3><FiFileText /> Descrição</h3>
            <p>{technician.descricao || 'Nenhuma descrição disponível'}</p>
          </div>
          
          {technician.experiencia && (
            <div className="section">
              <h3><FiCalendar /> Experiência</h3>
              <p>{technician.experiencia}</p>
            </div>
          )}
        </div>

        <div className="technician-profile-sections">
          <div className="section">
            <h3><FiFileText /> Documentação</h3>
            <div className="documentos-status-summary">
              <div className="status-card status-enviados">
                <FiCheckCircle size={20} />
                <div className="status-count">
                  {technician.documentos ? Object.values(technician.documentos).filter(doc => doc && doc.url).length : 0}
                </div>
                <div className="status-label">Enviados</div>
              </div>
              <div className="status-card status-pendentes">
                <FiAlertCircle size={20} />
                <div className="status-count">
                  {Object.keys(documentTypesMap).length - (technician.documentos ? Object.values(technician.documentos).filter(doc => doc && doc.url).length : 0)}
                </div>
                <div className="status-label">Pendentes</div>
              </div>
            </div>
            
            <div className="documento-tabs">
              <div className="documento-tab-buttons">
                <button 
                  className={`documento-tab-button ${documentFilter === 'todos' ? 'active' : ''}`}
                  onClick={() => setDocumentFilter('todos')}
                >
                  Todos os Documentos
                </button>
                <button 
                  className={`documento-tab-button ${documentFilter === 'enviados' ? 'active' : ''}`}
                  onClick={() => setDocumentFilter('enviados')}
                >
                  Documentos Enviados
                </button>
                <button 
                  className={`documento-tab-button ${documentFilter === 'pendentes' ? 'active' : ''}`}
                  onClick={() => setDocumentFilter('pendentes')}
                >
                  Documentos Pendentes
                </button>
              </div>
            </div>
            
            <div className="documentos-grid">
              {filteredDocuments().map(doc => {
                return (
                  <div key={doc.key} className={`documento-card ${doc.isPresent ? 'documento-presente' : 'documento-ausente'}`}>
                    <div className="documento-header">
                      <div className="documento-tipo">
                        {doc.name}
                      </div>
                      <div className={`status-badge ${doc.isPresent ? 'status-presente' : 'status-ausente'}`}>
                        {doc.isPresent ? (
                          <>
                            <FiCheckCircle size={14} />
                            <span>Enviado</span>
                          </>
                        ) : (
                          <>
                            <FiAlertCircle size={14} />
                            <span>Pendente</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {doc.isPresent ? (
                      <div className="documento-content">
                        <div className="documento-info">
                          <div className="documento-nome">
                            <FiFile className="file-icon" />
                            <span>{doc.documento.nome || 'Documento'}</span>
                          </div>
                          <div className="documento-data">
                            {doc.documento.dataUpload ? 
                              new Date(doc.documento.dataUpload).toLocaleDateString() : 
                              'Data não disponível'}
                          </div>
                        </div>
                        <div className="documento-acoes">
                          <a href={doc.documento.url} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="btn-visualizar">
                            <FiEye />
                            Visualizar
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="documento-content documento-vazio">
                        <div className="documento-placeholder">
                          <FiFile size={24} className="placeholder-icon" />
                          <p>Documento pendente de envio</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="technician-profile-sections">
          <div className="section">
            <h3>Avaliações</h3>
            {avaliacoes.length > 0 ? (
              <div className="avaliacoes-list">
                {avaliacoes.map(avaliacao => (
                  <div key={avaliacao.id} className="avaliacao-card">
                    <div className="avaliacao-header">
                      <div className="avaliacao-stars">
                        {renderStars(avaliacao.rating)}
                      </div>
                      <div className="avaliacao-date">
                        {avaliacao.createdAt ? new Date(avaliacao.createdAt.seconds * 1000).toLocaleDateString() : 'Data não disponível'}
                      </div>
                    </div>
                    <div className="avaliacao-content">
                      <p>{avaliacao.comentario || 'Sem comentários'}</p>
                    </div>
                    <div className="avaliacao-servico">
                      <strong>Serviço:</strong> {avaliacao.servicoTitulo || 'Serviço não especificado'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Nenhuma avaliação disponível</p>
            )}
          </div>
        </div>

        {!hideServices && (
          <div className="technician-profile-sections">
            <div className="section">
              <h3>Serviços Recentes</h3>
              {totalServicos > 0 ? (
                <div className="servicos-list">
                  {[...obras, ...manutencoes]
                    .sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                      const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                      return dateB - dateA;
                    })
                    .slice(0, 5)
                    .map(servico => (
                      <div key={servico.id} className="servico-card">
                        <div className="servico-title">{servico.title}</div>
                        <div className="servico-details">
                          <div className="servico-category">{servico.category}</div>
                          <div className={`servico-status ${servico.status}`}>
                            {servico.status === 'concluido' ? 'Concluído' :
                             servico.status === 'em-andamento' ? 'Em andamento' :
                             'Disponível'}
                          </div>
                        </div>
                        <div className="servico-date">
                          {servico.date ? new Date(servico.date).toLocaleDateString() : 'Data não disponível'}
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p>Nenhum serviço realizado</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TechnicianProfile;