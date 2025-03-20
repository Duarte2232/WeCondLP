import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiGrid, FiList, FiFilter } from 'react-icons/fi';
import NewMaintenanceButton from './NewMaintenanceButton';
import MaintenanceForm from './MaintenanceForm';
import './Maintenance.css';

const Maintenance = ({ maintenances = [], handleSubmitMaintenance, isLoading = false }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [showNewMaintenanceForm, setShowNewMaintenanceForm] = useState(false);
  const [localMaintenances, setLocalMaintenances] = useState(maintenances);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({
    title: '',
    description: '',
    category: '',
    priority: '',
    location: {
      morada: '',
      codigoPostal: '',
      cidade: '',
      andar: ''
    },
    date: new Date().toISOString().split('T')[0],
    status: 'Pendente',
    files: [],
    isMaintenance: true,
    frequency: ''
  });

  // Update local maintenances when prop changes
  useEffect(() => {
    setLocalMaintenances(maintenances);
  }, [maintenances]);

  // Definir categorias - usando as mesmas das Obras
  const categorias = [
    { 
      id: 'infiltracao', 
      nome: 'Infiltração', 
      icone: '💧', 
      cor: '#3498db'
    },
    { 
      id: 'fissuras', 
      nome: 'Fissuras e rachaduras', 
      icone: '🧱', 
      cor: '#e74c3c'
    },
    { 
      id: 'canalizacao', 
      nome: 'Canalização', 
      icone: '🚿', 
      cor: '#2ecc71'
    },
    { 
      id: 'jardinagem', 
      nome: 'Jardinagem', 
      icone: '🌱', 
      cor: '#27ae60'
    },
    { 
      id: 'fiscalizacao', 
      nome: 'Fiscalização', 
      icone: '📋', 
      cor: '#9b59b6'
    },
    { 
      id: 'fachada', 
      nome: 'Reabilitação de Fachada', 
      icone: '🏢', 
      cor: '#34495e'
    },
    { 
      id: 'eletricidade', 
      nome: 'Eletricidade', 
      icone: '⚡', 
      cor: '#f1c40f'
    },
    { 
      id: 'construcao', 
      nome: 'Construção', 
      icone: '🏗️', 
      cor: '#e67e22'
    },
    { 
      id: 'pintura', 
      nome: 'Pintura', 
      icone: '🎨', 
      cor: '#1abc9c'
    },
    { 
      id: 'elevadores', 
      nome: 'Elevadores', 
      icone: '🛗', 
      cor: '#a569bd'
    },
    { 
      id: 'avac', 
      nome: 'Sistemas AVAC', 
      icone: '❄️', 
      cor: '#3498db'
    },
    { 
      id: 'seguranca', 
      nome: 'Sistemas de Segurança', 
      icone: '🚨', 
      cor: '#e74c3c'
    },
    { 
      id: 'limpeza', 
      nome: 'Limpeza', 
      icone: '🧹', 
      cor: '#2ecc71'
    },
    { 
      id: 'hidraulica', 
      nome: 'Hidráulica', 
      icone: '🔧', 
      cor: '#3498db'
    },
    { 
      id: 'equipamentos', 
      nome: 'Equipamentos', 
      icone: '🔌', 
      cor: '#e67e22'
    }
  ];

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
    }
  };

  const handleCreateMaintenance = () => {
    // If a category is selected, pre-populate the form with it
    if (selectedCategory) {
      const selectedCategoryObj = categorias.find(cat => cat.id === selectedCategory);
      if (selectedCategoryObj) {
        setNewMaintenance(prev => ({
          ...prev,
          category: selectedCategoryObj.nome
        }));
      }
    }
    setShowNewMaintenanceForm(true);
  };

  const handleFileUpload = (e) => {
    // Logic to handle file uploads
    const files = Array.from(e.target.files).map(file => ({
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      url: URL.createObjectURL(file),
      file: file
    }));
    
    setNewMaintenance(prev => ({
      ...prev,
      files: [...(prev.files || []), ...files]
    }));
  };

  const handleRemoveFile = (fileToRemove) => {
    setNewMaintenance(prev => ({
      ...prev,
      files: prev.files.filter(file => file.name !== fileToRemove.name)
    }));
  };

  const handleSubmitMaintenanceForm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Use the function from props to save the maintenance to Firestore
      if (handleSubmitMaintenance) {
        const result = await handleSubmitMaintenance(newMaintenance);
        
        if (result) {
          // Add the newly created maintenance to the local state if not already added by props
          setLocalMaintenances(prev => {
            // Check if already exists
            if (!prev.find(m => m.id === result.id)) {
              return [result, ...prev];
            }
            return prev;
          });
          
          // Reset form and close modal
          setNewMaintenance({
            title: '',
            description: '',
            category: '',
            priority: '',
            location: {
              morada: '',
              codigoPostal: '',
              cidade: '',
              andar: ''
            },
            date: new Date().toISOString().split('T')[0],
            status: 'Pendente',
            files: [],
            isMaintenance: true,
            frequency: ''
          });
          
          setShowNewMaintenanceForm(false);
        }
      } else {
        console.error("handleSubmitMaintenance function not provided as prop");
        alert("Erro: função de submissão não disponível");
      }
    } catch (error) {
      console.error("Error submitting maintenance:", error);
      alert("Erro ao criar manutenção. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para renderizar o grid de categorias de forma horizontal
  const renderCategoriesGrid = () => {
    return (
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
            <div className="category-content">
              <div className="category-name">{categoria.nome}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Filtrar manutenções pela categoria selecionada (como em Jobs)
  const filteredMaintenances = selectedCategory 
    ? localMaintenances.filter(maintenance => {
        const categoryNome = categorias.find(cat => cat.id === selectedCategory)?.nome || '';
        return maintenance.category === categoryNome;
      })
    : localMaintenances;

  return (
    <div className="maintenance-container">
      <div className="maintenance-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1>Manutenções</h1>
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
        <h2>Categorias de Manutenções</h2>
        {renderCategoriesGrid()}
      </div>

      <div className="maintenance-list-container">
        <div className="maintenance-list-header">
          <h2>{selectedCategory 
              ? `Manutenções de ${categorias.find(cat => cat.id === selectedCategory)?.nome}` 
              : 'Manutenções'}
          </h2>
          <NewMaintenanceButton onClick={handleCreateMaintenance} />
        </div>

        {selectedCategory || viewMode === 'list' ? (
          <div className="maintenance-table">
            {isLoading ? (
              <div className="loading-message">Carregando manutenções...</div>
            ) : filteredMaintenances.length > 0 ? (
              <table className="maintenance-table-content">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Categoria</th>
                    <th>Data</th>
                    <th>Frequência</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenances.map(maintenance => (
                    <tr key={maintenance.id} className="maintenance-table-row">
                      <td>{maintenance.title}</td>
                      <td>
                        <span className={`category-badge ${maintenance.category?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {maintenance.category}
                        </span>
                      </td>
                      <td>{maintenance.date && new Date(maintenance.date).toLocaleDateString()}</td>
                      <td>{maintenance.frequency || 'Única'}</td>
                      <td>
                        <span className={`priority-badge ${maintenance.priority?.toLowerCase()}`}>
                          {maintenance.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${maintenance.status?.toLowerCase().replace(' ', '-')}`}>
                          {maintenance.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-maintenances-message">
                <p>Nenhuma manutenção encontrada</p>
                <NewMaintenanceButton onClick={handleCreateMaintenance} />
              </div>
            )}
          </div>
        ) : (
          <div className="maintenance-grid">
            {isLoading ? (
              <div className="loading-message">Carregando manutenções...</div>
            ) : filteredMaintenances.length > 0 ? (
              filteredMaintenances.map(maintenance => (
                <div 
                  key={maintenance.id} 
                  className="maintenance-card"
                >
                  <div className="maintenance-card-header">
                    <h3>{maintenance.title}</h3>
                    <span className={`status-badge ${maintenance.status?.toLowerCase().replace(' ', '-')}`}>
                      {maintenance.status}
                    </span>
                  </div>
                  <p className="maintenance-card-description">
                    {maintenance.description}
                  </p>
                  <div className="maintenance-card-details">
                    <div className="maintenance-card-detail">
                      <span className="detail-label">Frequência:</span>
                      <span className="detail-value">{maintenance.frequency || 'Única'}</span>
                    </div>
                    <div className="maintenance-card-detail">
                      <span className="detail-label">Data:</span>
                      <span className="detail-value">{maintenance.date && new Date(maintenance.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="maintenance-card-footer">
                    <span className={`priority-badge ${maintenance.priority?.toLowerCase()}`}>
                      {maintenance.priority}
                    </span>
                    <span className={`category-badge ${maintenance.category?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {maintenance.category}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-maintenances-message">
                <p>Nenhuma manutenção encontrada</p>
                <NewMaintenanceButton onClick={handleCreateMaintenance} />
              </div>
            )}
          </div>
        )}
      </div>

      {showNewMaintenanceForm && (
        <MaintenanceForm
          newMaintenance={newMaintenance}
          setNewMaintenance={setNewMaintenance}
          handleFileUpload={handleFileUpload}
          handleRemoveFile={handleRemoveFile}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitMaintenanceForm}
          onCancel={() => setShowNewMaintenanceForm(false)}
          editMode={false}
        />
      )}
    </div>
  );
};

export default Maintenance; 