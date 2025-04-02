import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiGrid, FiList, FiFilter } from 'react-icons/fi';
import NewMaintenanceButton from './NewMaintenanceButton';
import MaintenanceForm from './MaintenanceForm';
import WorkDetailsModal from '../WorkDetailsModal/WorkDetailsModal';
import { CLOUDINARY_CONFIG } from '../../../../config/cloudinary';
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import './Maintenance.css';

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
  },
  { 
    id: 'elevadores', 
    nome: 'Elevadores', 
    icone: '⬆️', 
    cor: '#0ea5e9',
    subcategorias: [
      'Manutenção preventiva regular',
      'Substituição de peças desgastadas',
      'Modernização de sistemas de segurança',
      'Reparação de avarias',
      'Inspeção técnica periódica'
    ]
  },
  { 
    id: 'avac', 
    nome: 'Sistemas AVAC', 
    icone: '❄️', 
    cor: '#0ea5e9',
    subcategorias: [
      'Limpeza de filtros e condutas',
      'Verificação de sistemas de refrigeração',
      'Manutenção de caldeiras e bombas de calor',
      'Substituição de componentes',
      'Otimização de eficiência energética'
    ]
  },
  { 
    id: 'seguranca', 
    nome: 'Sistemas de Segurança', 
    icone: '🔒', 
    cor: '#ef4444',
    subcategorias: [
      'Manutenção de sistemas de alarme',
      'Verificação de equipamentos contra incêndios',
      'Testes de funcionamento de sensores',
      'Atualização de software de segurança',
      'Substituição de baterias e componentes'
    ]
  },
  { 
    id: 'limpeza', 
    nome: 'Limpeza', 
    icone: '🧹', 
    cor: '#22c55e',
    subcategorias: [
      'Limpeza profunda de áreas comuns',
      'Lavagem de pavimentos e escadas',
      'Limpeza de vidros e fachadas',
      'Remoção de grafitis',
      'Tratamento e polimento de pavimentos'
    ]
  },
  { 
    id: 'hidraulica', 
    nome: 'Hidráulica', 
    icone: '🔧', 
    cor: '#0ea5e9',
    subcategorias: [
      'Verificação de fugas em canalizações',
      'Manutenção de bombas de água',
      'Limpeza de ralos e caleiras',
      'Desentupimento de esgotos',
      'Purga de ar em radiadores'
    ]
  },
  { 
    id: 'equipamentos', 
    nome: 'Equipamentos', 
    icone: '🏋️', 
    cor: '#64748b',
    subcategorias: [
      'Manutenção de sistemas de ginásio',
      'Verificação de equipamentos de lazer',
      'Reparação de mobiliário de áreas comuns',
      'Manutenção de piscinas e spas',
      'Calibração de equipamentos técnicos'
    ]
  }
];

function MaintenanceCard({ maintenance, onViewDetails }) {
  const getCategoryColor = (category) => {
    const normalizedCategory = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const categoryMap = {
      'infiltracao': '#3498db',
      'fissuras': '#e74c3c',
      'canalizacao': '#2ecc71',
      'jardinagem': '#27ae60',
      'fiscalizacao': '#9b59b6',
      'fachada': '#34495e',
      'eletricidade': '#f1c40f',
      'construcao': '#e67e22',
      'pintura': '#1abc9c',
      'elevadores': '#a569bd',
      'avac': '#3498db',
      'seguranca': '#ef4444',
      'limpeza': '#22c55e',
      'hidraulica': '#0ea5e9',
      'equipamentos': '#64748b'
    };
    
    for (const key in categoryMap) {
      if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
        return categoryMap[key];
      }
    }
    
    return '#6B7280';
  };
  
  const categoryColor = getCategoryColor(maintenance.category);

  return (
    <div 
      className="work-card"
      onClick={() => onViewDetails(maintenance)}
    >
      <h3 className="work-card-title">{maintenance.title}</h3>
      <p className="work-card-description">{maintenance.description}</p>
      <div>
        <span className={`work-card-status ${maintenance.status.toLowerCase()}`}>
          {maintenance.status}
        </span>
      </div>
      <div className="work-card-footer">
        <span className="work-card-date">
          {maintenance.date && new Date(maintenance.date).toLocaleDateString()}
        </span>
        <span className="work-card-category" style={{ 
          color: categoryColor,
          border: `1px solid ${categoryColor}`,
        }}>
          {maintenance.category}
        </span>
      </div>
    </div>
  );
}

const Maintenance = ({ maintenances = [], handleSubmitMaintenance, isLoading = false, user }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [localMaintenances, setLocalMaintenances] = useState(maintenances);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Efeito para carregar manutenções quando o componente montar
  useEffect(() => {
    const loadMaintenances = async () => {
      setIsLoadingData(true);
      try {
        if (!user) return;

        // Query simplificada sem orderBy
        const q = query(
          collection(db, 'maintenances'),
          where('userEmail', '==', user.email)
        );

        const querySnapshot = await getDocs(q);
        const maintenancesData = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            // Ordenação manual por data de criação
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return dateB - dateA;
          });

        setLocalMaintenances(maintenancesData);
      } catch (error) {
        console.error('Error loading maintenances:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadMaintenances();
  }, [user?.email]);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    try {
      console.log('Iniciando upload para Cloudinary:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro detalhado do Cloudinary:', errorData);
        throw new Error(`Upload falhou: ${errorData.error?.message || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      console.log('Upload bem-sucedido:', data);

      return {
        name: file.name,
        type: file.type.split('/')[0],
        url: data.secure_url,
        publicId: data.public_id,
        size: file.size
      };
    } catch (error) {
      console.error('Erro no upload para Cloudinary:', error);
      throw error;
    }
  };

  const handleFileUpload = async (e) => {
    try {
      console.log('Iniciando upload de arquivos...');
      
      // Obter os arquivos do evento (seja do input ou do drop)
      const files = e.dataTransfer 
        ? Array.from(e.dataTransfer.files) 
        : Array.from(e.target.files);
      
      console.log('Arquivos recebidos:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      if (!files || files.length === 0) {
        console.log('Nenhum arquivo selecionado');
        return;
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      
      const newFiles = [];
      for (const file of files) {
        console.log('Processando arquivo:', file.name);
        
        // Verificar o tipo do arquivo
        const fileType = file.type.split('/')[0];
        const allowedTypes = ['image', 'video', 'application'];
        
        if (!allowedTypes.includes(fileType)) {
          console.warn(`Tipo de arquivo não permitido: ${fileType} para ${file.name}`);
          alert(`O arquivo ${file.name} não é um tipo permitido. Apenas imagens, vídeos e documentos são aceitos.`);
          continue;
        }

        // Verificar o tamanho do arquivo
        if (file.size > MAX_FILE_SIZE) {
          console.warn(`Arquivo muito grande: ${file.name} (${file.size} bytes)`);
          alert(`O arquivo ${file.name} excede o limite de 10MB`);
          continue;
        }

        // Criar URL temporária para visualização
        const tempUrl = URL.createObjectURL(file);
        console.log('URL temporária criada:', tempUrl);
        
        newFiles.push({
          file: file,
          name: file.name,
          type: fileType,
          url: tempUrl,
          size: file.size
        });
      }

      return newFiles;
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      alert('Ocorreu um erro ao processar os arquivos. Por favor, tente novamente.');
      return [];
    }
  };

  const handleRemoveFile = (fileToRemove) => {
    if (fileToRemove.url && fileToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.url);
    }
  };

  const handleMaintenanceSubmit = async (maintenanceData) => {
    setIsSubmitting(true);
    try {
      const maintenanceDataToSave = {
        ...maintenanceData,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        files: []
      };

      if (maintenanceData.files && maintenanceData.files.length > 0) {
        const uploadedFiles = await Promise.all(
          maintenanceData.files.map(file => uploadToCloudinary(file.file || file))
        );
        maintenanceDataToSave.files = uploadedFiles;
      }

      const docRef = await addDoc(collection(db, 'maintenances'), maintenanceDataToSave);
      const newMaintenance = {
        id: docRef.id,
        ...maintenanceDataToSave,
        createdAt: new Date() // Para exibição imediata
      };

      setLocalMaintenances(prevMaintenances => [newMaintenance, ...prevMaintenances]);
      setShowMaintenanceForm(false);
      alert('Manutenção criada com sucesso!');
      return true;
    } catch (error) {
      console.error('Error creating maintenance:', error);
      alert('Erro ao criar manutenção. Por favor, tente novamente.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handleCategoryClick = (category) => {
    if (selectedCategory === category.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category.id);
    }
  };

  const handleCreateMaintenance = () => {
    setShowMaintenanceForm(true);
  };

  const handleViewDetails = (maintenance) => {
    setSelectedMaintenance(maintenance);
  };

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
      </div>

      <div className="categories-container">
        <h2>Categorias de Manutenção</h2>
        {renderCategoriesGrid()}
      </div>

      <div className="maintenance-list-container">
        <div className="maintenance-list-header">
          <h2>{selectedCategory 
              ? `Manutenções de ${categorias.find(cat => cat.id === selectedCategory)?.nome}` 
              : 'Todas as Manutenções'}
          </h2>
          <button 
            className="create-maintenance-btn-header"
            onClick={handleCreateMaintenance}
          >
            <FiPlus /> Nova Manutenção
          </button>
        </div>

        <div className="work-cards-grid">
          {isLoadingData ? (
            <div className="loading-container">
              <div className="loading">Carregando manutenções...</div>
            </div>
          ) : filteredMaintenances.length > 0 ? (
            filteredMaintenances.map(maintenance => (
              <MaintenanceCard 
                key={maintenance.id} 
                maintenance={maintenance} 
                onViewDetails={handleViewDetails}
              />
            ))
          ) : (
            <div className="no-items-message">
              {selectedCategory ? (
                <p>Nenhuma manutenção encontrada nesta categoria</p>
              ) : (
                <>
                  <p>Nenhuma manutenção encontrada</p>
                  <button onClick={handleCreateMaintenance} className="create-btn">
                    <FiPlus /> Criar Nova Manutenção
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedMaintenance && (
        <WorkDetailsModal
          work={selectedMaintenance}
          onClose={() => setSelectedMaintenance(null)}
          onEdit={(maintenance) => {
            // Implementar edição
            console.log('Editar manutenção:', maintenance);
          }}
          onDelete={(maintenanceId) => {
            // Implementar exclusão
            console.log('Excluir manutenção:', maintenanceId);
          }}
          onComplete={(maintenanceId) => {
            // Implementar conclusão
            console.log('Concluir manutenção:', maintenanceId);
          }}
          onStatusChange={(maintenanceId, newStatus) => {
            // Implementar mudança de status
            console.log('Mudar status da manutenção:', maintenanceId, newStatus);
          }}
          onFileDownload={(file) => {
            // Implementar download de arquivo
            console.log('Download de arquivo:', file);
          }}
        />
      )}

      {showMaintenanceForm && (
        <MaintenanceForm 
          onSubmit={handleMaintenanceSubmit}
          onCancel={() => setShowMaintenanceForm(false)}
          isSubmitting={isSubmitting}
          editMode={false}
          handleFileUpload={handleFileUpload}
          handleRemoveFile={handleRemoveFile}
          initialData={{
            title: '',
            description: '',
            category: '',
            subcategoria: '',
            priority: '',
            date: new Date().toISOString().split('T')[0],
            status: 'disponivel',
            files: [],
            location: {
              morada: '',
              codigoPostal: '',
              cidade: '',
              andar: ''
            },
            orcamentos: {
              minimo: '',
              maximo: ''
            },
            prazoOrcamentos: ''
          }}
        />
      )}
    </div>
  );
};

export default Maintenance; 