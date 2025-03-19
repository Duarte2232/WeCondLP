import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiFilter, FiGrid, FiList } from 'react-icons/fi';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/auth';
import WorksTable from '../WorksTable/WorksTable';
import WorkForm from '../WorkForm/WorkForm';
import './Jobs.css';

const Jobs = ({ 
  works = [], 
  handleSubmit,
  setNewWork,
  newWork,
  handleFileUpload,
  handleRemoveFile,
  handleViewDetails,
  expandedWorks,
  isLoading = false,
  handleEdit,
  handleDelete,
  handleComplete,
  handleStatusChange,
  handleFileDownload,
  onSendMessage
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [showNewWorkForm, setShowNewWorkForm] = useState(false);
  const [localNewWork, setLocalNewWork] = useState(newWork);

  // Definir todas as categorias possíveis
  const categorias = [
    { 
      id: 'infiltracao', 
      nome: 'Infiltração', 
      icone: '💧', 
      cor: '#3498db',
      subcategorias: [
        'Infiltração em coberturas e terraços',
        'Infiltração em paredes e fachadas',
        'Infiltração em garagens e caves',
        'Diagnóstico e identificação de causas',
        'Soluções de impermeabilização'
      ]
    },
    { 
      id: 'fissuras', 
      nome: 'Fissuras e rachaduras', 
      icone: '🧱', 
      cor: '#e74c3c',
      subcategorias: [
        'Fissuras estruturais',
        'Rachaduras em paredes interiores e exteriores',
        'Rachaduras em fachadas e varandas',
        'Monitorização e avaliação periódica',
        'Técnicas de reparação e reforço estrutural'
      ]
    },
    { 
      id: 'canalizacao', 
      nome: 'Canalização', 
      icone: '🚿', 
      cor: '#2ecc71',
      subcategorias: [
        'Deteção e reparação de fugas de água',
        'Substituição e manutenção de tubagens',
        'Limpeza e desobstrução de esgotos',
        'Sistemas de pressurização e bombagem',
        'Manutenção de reservatórios e depósitos de água'
      ]
    },
    { 
      id: 'manutencao', 
      nome: 'Manutenção', 
      icone: '🔧', 
      cor: '#f39c12',
      subcategorias: [
        'Manutenção geral do edifício',
        'Manutenção preventiva e corretiva',
        'Reparações em áreas comuns',
        'Limpeza de algerozes e caleiras',
        'Serviços de emergência'
      ]
    },
    { 
      id: 'jardinagem', 
      nome: 'Jardinagem', 
      icone: '🌱', 
      cor: '#27ae60',
      subcategorias: [
        'Manutenção e conservação de jardins comuns',
        'Poda e remoção de árvores e arbustos',
        'Instalação e manutenção de sistemas de rega',
        'Controlo de pragas e doenças',
        'Requalificação de espaços verdes'
      ]
    },
    { 
      id: 'fiscalizacao', 
      nome: 'Fiscalização', 
      icone: '📋', 
      cor: '#9b59b6',
      subcategorias: [
        'Inspeção periódica de infraestruturas',
        'Fiscalização do cumprimento de normas e regulamentos',
        'Relatórios técnicos e auditorias',
        'Avaliação da qualidade dos serviços prestados',
        'Gestão de obras e intervenções externas'
      ]
    },
    { 
      id: 'fachada', 
      nome: 'Reabilitação de Fachada', 
      icone: '🏢', 
      cor: '#34495e',
      subcategorias: [
        'Recuperação e restauro de fachadas',
        'Tratamento de fissuras e infiltrações',
        'Impermeabilização de superfícies externas',
        'Pintura e renovação estética',
        'Limpeza de fachadas e remoção de grafitis'
      ]
    },
    { 
      id: 'eletricidade', 
      nome: 'Eletricidade', 
      icone: '⚡', 
      cor: '#f1c40f',
      subcategorias: [
        'Manutenção de instalações elétricas do condomínio',
        'Substituição de quadros elétricos e cablagens',
        'Iluminação de áreas comuns (escadas, garagem, elevadores)',
        'Sistemas de emergência e iluminação de segurança',
        'Inspeção e conformidade com normas elétricas'
      ]
    },
    { 
      id: 'construcao', 
      nome: 'Construção', 
      icone: '🏗️', 
      cor: '#e67e22',
      subcategorias: [
        'Pequenas obras e remodelações em áreas comuns',
        'Reparação de estruturas e fundações',
        'Substituição de revestimentos e pavimentos',
        'Ampliação e melhoria de infraestruturas',
        'Gestão de licenças e autorizações'
      ]
    },
    { 
      id: 'pintura', 
      nome: 'Pintura', 
      icone: '🎨', 
      cor: '#1abc9c',
      subcategorias: [
        'Pintura de fachadas e zonas comuns',
        'Pintura de garagens e parques de estacionamento',
        'Marcação de lugares e sinalização em pavimentos',
        'Preparação e tratamento de superfícies antes da pintura',
        'Utilização de tintas específicas para exterior e interior'
      ]
    }
  ];

  // Sincronizar o estado local do newWork quando as props mudam
  useEffect(() => {
    setLocalNewWork(newWork);
  }, [newWork]);

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handleCategoryClick = (category) => {
    if (selectedCategory === category.id) {
      setSelectedCategory(null); // Desselecionar se clicar na mesma categoria
    } else {
      setSelectedCategory(category.id);
      // Mudamos automaticamente para o modo de tabela quando uma categoria é selecionada
      setViewMode('list');
      
      // Pré-configurar o novo trabalho com a categoria selecionada
      const updatedWork = {
        ...localNewWork,
        category: category.nome
      };
      setLocalNewWork(updatedWork);
      setNewWork(updatedWork);
    }
  };

  const handleCreateWork = () => {
    setShowNewWorkForm(true);
  };

  const handleLocalSubmit = (e) => {
    handleSubmit(e);
    setShowNewWorkForm(false);
  };

  // Função auxiliar para normalizar strings para comparação de categorias
  const normalizeString = (str) => {
    return str.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, ''); // Remove caracteres especiais
  };

  // Filtrar obras pela categoria selecionada
  const filteredWorks = selectedCategory 
    ? works.filter(work => {
        const categoryNome = categorias.find(cat => cat.id === selectedCategory)?.nome || '';
        return normalizeString(work.category).includes(normalizeString(selectedCategory)) ||
               normalizeString(work.category) === normalizeString(categoryNome);
      })
    : works;

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1>Obras</h1>
        {!selectedCategory && (
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={() => setViewMode('grid')}
            >
              <FiGrid />
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} 
              onClick={() => setViewMode('list')}
            >
              <FiList />
            </button>
          </div>
        )}
      </div>

      <div className="categories-container">
        <h2>Categorias de Obras</h2>
        <div className="categories-grid">
          {categorias.map(categoria => (
            <div 
              key={categoria.id}
              className={`category-card ${selectedCategory === categoria.id ? 'active' : ''}`}
              style={{ 
                borderColor: selectedCategory === categoria.id ? categoria.cor : 'transparent',
                backgroundColor: selectedCategory === categoria.id ? `${categoria.cor}20` : '#f9fafb'
              }}
              onClick={() => handleCategoryClick(categoria)}
            >
              <div className="category-icon" style={{ backgroundColor: categoria.cor }}>
                {categoria.icone}
              </div>
              <div className="category-name">{categoria.nome}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="works-list-container">
        <div className="works-list-header">
          <h2>{selectedCategory 
              ? `Obras de ${categorias.find(cat => cat.id === selectedCategory)?.nome}` 
              : 'Obras'}
          </h2>
          <button 
            className="create-work-btn-header"
            onClick={handleCreateWork}
          >
            <FiPlus /> Nova Obra
          </button>
        </div>

        {/* Se uma categoria estiver selecionada OU o modo de visualização for 'list', 
            exibimos a tabela de obras. Caso contrário, exibimos a grade de cards */}
        {selectedCategory || viewMode === 'list' ? (
          <WorksTable 
            works={filteredWorks}
            expandedWorks={expandedWorks}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onComplete={handleComplete}
            onStatusChange={handleStatusChange}
            onFileDownload={handleFileDownload}
            onSendMessage={onSendMessage}
            isSimplified={false}
          />
        ) : (
          <div className="works-grid">
            {filteredWorks.length > 0 ? (
              filteredWorks.map(work => (
                <div 
                  key={work.id} 
                  className="work-card"
                  onClick={() => handleViewDetails(work.id)}
                >
                  <div className="work-card-header">
                    <h3>{work.title}</h3>
                    <span className={`status-badge ${work.status.toLowerCase().replace(' ', '-')}`}>
                      {work.status}
                    </span>
                  </div>
                  <p className="work-card-description">
                    {work.description.length > 120 
                      ? `${work.description.substring(0, 120)}...` 
                      : work.description}
                  </p>
                  <div className="work-card-footer">
                    <span className="work-card-date">
                      {new Date(work.date).toLocaleDateString()}
                    </span>
                    <span className={`category-badge ${work.category.toLowerCase().replace(/\s+/g, '-')}`}>
                      {work.category}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-works-message">
                Nenhuma obra encontrada
              </p>
            )}
          </div>
        )}
      </div>

      {showNewWorkForm && (
        <WorkForm 
          newWork={localNewWork}
          setNewWork={(work) => {
            setLocalNewWork(work);
            setNewWork(work);
          }}
          handleFileUpload={handleFileUpload}
          handleRemoveFile={handleRemoveFile}
          onSubmit={handleLocalSubmit}
          onCancel={() => setShowNewWorkForm(false)}
          editMode={false}
          isSubmitting={isLoading}
        />
      )}
    </div>
  );
};

export default Jobs; 