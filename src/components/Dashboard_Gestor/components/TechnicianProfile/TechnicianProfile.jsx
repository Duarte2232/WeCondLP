import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FiArrowLeft, FiStar, FiPhone, FiMail, FiMapPin, FiUser, FiBriefcase, FiCalendar, FiFileText } from 'react-icons/fi';
import './TechnicianProfile.css';
import { toast } from 'react-hot-toast';

function TechnicianProfile() {
  const { technicianId } = useParams();
  const navigate = useNavigate();
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);

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

  const handleBack = () => {
    navigate(-1);
  };

  // Calcular média das avaliações
  const calcularMediaAvaliacoes = () => {
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
        stars.push(<FiStar key={i} className="star filled" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FiStar key={i} className="star half-filled" />);
      } else {
        stars.push(<FiStar key={i} className="star" />);
      }
    }
    
    return stars;
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
  const totalServicos = obras.length + manutencoes.length;
  const servicosConcluidos = [...obras, ...manutencoes].filter(servico => 
    servico.status === 'concluido'
  ).length;

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
              {technician.photoURL ? (
                <img src={technician.photoURL} alt={technician.name} />
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
                <span className="total-ratings">({avaliacoes.length} avaliações)</span>
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
                    {avaliacao.servicoId && (
                      <div className="avaliacao-servico">
                        <strong>Serviço:</strong> {avaliacao.servicoTitulo || 'Serviço não especificado'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>Nenhuma avaliação disponível</p>
            )}
          </div>
        </div>

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
      </div>
    </div>
  );
}

export default TechnicianProfile;