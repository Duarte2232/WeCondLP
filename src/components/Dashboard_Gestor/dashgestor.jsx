import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './dashgestor.css';
import { FiPlusCircle, FiFilter, FiSearch, FiBell, FiEdit2, FiEye, FiCheck, FiX, FiCalendar, FiUpload, FiArrowLeft, FiFile, FiDownload, FiAlertCircle, FiTag, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../contexts/auth';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { CLOUDINARY_CONFIG } from '../../config/cloudinary';
import LoadingAnimation from '../LoadingAnimation/LoadingAnimation';
import sha1 from 'crypto-js/sha1';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

// Importação dos componentes
import Metrics from './components/Metrics/Metrics';
import SearchFilters from './components/SearchFilters/SearchFilters';
import NewWorkButton from './components/WorkForm/NewWorkButton';
import WorkForm from './components/WorkForm/WorkForm';
import WorksTable from './components/WorksTable/WorksTable';
import TopBar from './components/TopBar/TopBar';
import ProfileComponent from './components/Profile/Profile';
import Messages from './components/Messages/Messages';
import CalendarComponent from './components/Calendar/Calendar';
import JobsComponent from './components/Jobs/Jobs';
import MaintenanceComponent from './components/Maintenance/Maintenance';
import WorkDetailsModal from './components/WorkDetailsModal/WorkDetailsModal';


function DashGestor() {
  const { user } = useAuth();
  const [showNewWorkForm, setShowNewWorkForm] = useState(false);
  const [expandedWorks, setExpandedWorks] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    status: '',
    category: '',
    priority: '',
    date: '',
    location: ''
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [works, setWorks] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unviewedOrcamentos, setUnviewedOrcamentos] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [selectedRecentWork, setSelectedRecentWork] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null);

  const [newWork, setNewWork] = useState({
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
    isMaintenance: false,
    orcamentos: {
      minimo: '',
      maximo: ''
    },
    prazoOrcamentos: ''
  });

  const [editingWork, setEditingWork] = useState(null);

  const metrics = {
    total: works.length,
    pending: works.filter(w => w.status === 'Pendente').length,
    inProgress: works.filter(w => w.status === 'Em Andamento').length,
    completed: works.filter(w => w.status === 'Concluído').length
  };

  const navigate = useNavigate();
  const location = useLocation();

  // Função auxiliar para agrupar arquivos por tipo
  const groupFilesByType = (files = []) => {
    return {
      images: files.filter(file => file?.type === 'image'),
      videos: files.filter(file => file?.type === 'video'),
      documents: files.filter(file => file?.type !== 'image' && file?.type !== 'video')
    };
  };

  const handleViewDetails = (workId) => {
    setExpandedWorks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workId)) {
        newSet.delete(workId);
      } else {
        newSet.add(workId);
        // Marcar orçamentos como visualizados quando expandir os detalhes
        if (unviewedOrcamentos[workId]) {
          markOrcamentosAsViewed(workId);
        }
      }
      return newSet;
    });
  };

  const handleStatusChange = async (workId, newStatus) => {
    try {
      const workRef = doc(db, 'works', workId);
      await updateDoc(workRef, { status: newStatus });
      
      setWorks(works.map(w => 
        w.id === workId 
          ? { ...w, status: newStatus }
          : w
      ));
    } catch (error) {
      console.error('Error updating work status:', error);
      // Add error notification here
    }
  };

  const handleEdit = async (workId) => {
    try {
      const work = works.find((w) => w.id === workId);
      if (!work) {
        toast.error('Obra não encontrada');
        return;
      }
      navigate(`/edit-work/${workId}`);
    } catch (error) {
      console.error('Error editing work:', error);
      toast.error('Erro ao editar a obra');
    }
  };

  const handleComplete = async (workId, newStatus) => {
    try {
      // Aqui você deve implementar a chamada à API para atualizar o status
      // Por enquanto, vamos apenas atualizar o estado local
      setWorks(works.map(work => 
        work.id === workId 
          ? { ...work, status: newStatus }
          : work
      ));
      setSelectedWork(null);
    } catch (error) {
      console.error('Erro ao atualizar o status da obra:', error);
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error('Upload falhou');
      }

      const data = await response.json();
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
        
        // Adicionar o arquivo ao estado
        setNewWork(prev => {
          const newFiles = [...(prev.files || []), {
            name: file.name,
            type: fileType,
            url: tempUrl,
            file: file, // Manter referência ao arquivo original para upload posterior
            size: file.size
          }];
          console.log('Novos arquivos no estado:', newFiles);
          return {
            ...prev,
            files: newFiles
          };
        });

        console.log(`Arquivo ${file.name} adicionado com sucesso`);
      }
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      alert('Ocorreu um erro ao processar os arquivos. Por favor, tente novamente.');
    }
  };

  // Add file removal function
  const handleRemoveFile = (fileToRemove) => {
    setNewWork(prev => ({
      ...prev,
      files: prev.files.filter(file => file.url !== fileToRemove.url)
    }));
  };

  const handleSubmit = async (e) => {
    // Verifica se o evento existe antes de chamar preventDefault
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    setIsSubmitting(true);

    try {
      if (!editingWork) {
        // Processar os arquivos primeiro
        const processedFiles = [];
        if (newWork.files && newWork.files.length > 0) {
          for (const file of newWork.files) {
            // Se o arquivo já foi processado (tem url do Cloudinary), apenas adicione-o
            if (file.url && file.url.includes('cloudinary')) {
              processedFiles.push(file);
              continue;
            }
            
            // Se é um novo arquivo, faça o upload
            try {
              const fileData = await uploadToCloudinary(file.file);
              processedFiles.push(fileData);
            } catch (error) {
              console.error(`Erro ao fazer upload do arquivo ${file.name}:`, error);
              // Continue com os outros arquivos mesmo se um falhar
            }
          }
        }

        // Lógica existente para criar nova obra
        const workData = {
          ...newWork,
          files: processedFiles, // Use os arquivos processados
          userEmail: user.email,
          userId: user.uid,
          createdAt: serverTimestamp(),
          date: newWork.date || new Date().toISOString().split('T')[0],
          status: "disponivel", // Garantir que o status seja sempre "disponivel"
          isMaintenance: false // Sempre definido como false para obras
        };

        // Corrigir categoria para formatos conhecidos
        if (workData.category && workData.category.toLowerCase().includes("eletr")) {
          workData.category = "Eletricidade"; // Normalizar para o formato correto
          console.log("Categoria normalizada para 'Eletricidade'");
        }

        console.log("Criando nova obra:", workData);
        const workRef = await addDoc(collection(db, 'works'), workData);
        console.log("Obra criada com sucesso, ID:", workRef.id);
        setWorks(prevWorks => [...prevWorks, { ...workData, id: workRef.id }]);
        alert('Obra criada com sucesso!');
      } else {
        // Lógica para atualizar obra existente
        const workRef = doc(db, 'works', editingWork.id);
        const updateData = {
          ...newWork,
          updatedAt: serverTimestamp(),
          isMaintenance: false // Sempre definido como false para obras
        };

        await updateDoc(workRef, updateData);
        
        setWorks(prevWorks => 
          prevWorks.map(w => w.id === editingWork.id ? { ...updateData, id: editingWork.id } : w)
        );
        alert('Obra atualizada com sucesso!');
      }

      // Resetar o formulário
      setNewWork({
        title: '',
        description: '',
        status: 'Pendente',
        category: '',
        priority: '',
        location: {
          morada: '',
          codigoPostal: '',
          cidade: '',
          andar: ''
        },
        files: [],
        date: new Date().toISOString().split('T')[0],
        isMaintenance: false,
        orcamentos: {
          minimo: '',
          maximo: ''
        },
        prazoOrcamentos: ''
      });
      
      setShowNewWorkForm(false);
      setEditingWork(null);
      
      // Recarregar as obras após criar/editar
      loadWorks();
      
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      alert(error.message || 'Erro ao salvar obra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função atualizada para deletar obra e suas notificações
  const handleDelete = async (workId) => {
    if (!workId) {
      console.error('ID da obra não fornecido');
      return;
    }

    try {
      console.log('Estado atual das obras:', works.map(w => ({
        id: w.id,
        title: w.title
      })));
      console.log('Tentando deletar obra com ID:', workId);
      
      const workRef = doc(db, 'works', workId);
      const workDoc = await getDoc(workRef);

      if (!workDoc.exists()) {
        console.error('Obra não encontrada no Firestore. ID:', workId);
        // Log adicional para debug
        console.log('IDs disponíveis no estado:', works.map(w => w.id));
        return;
      }

      if (window.confirm('Tem certeza que deseja excluir esta obra?')) {
        setIsLoading(true);
        
        await deleteDoc(workRef);
        console.log('Obra deletada com sucesso. ID:', workId);
        
        setWorks(prevWorks => {
          const filtered = prevWorks.filter(w => w.id !== workId);
          console.log('Works após deleção:', filtered.map(w => ({
            id: w.id,
            title: w.title
          })));
          return filtered;
        });
      }
    } catch (error) {
      console.error('Erro ao deletar obra:', error);
      alert('Erro ao deletar obra: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Função genérica de download para qualquer tipo de arquivo
  const handleFileDownload = async (file, fileName) => {
    try {
      console.log('Iniciando download:', file);
      
      // Fazer o fetch do arquivo
      const response = await fetch(file.url);
      const blob = await response.blob();
      
      // Criar URL do blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link de download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || file.name;
      link.style.display = 'none';
      
      // Adicionar à página, clicar e remover
      document.body.appendChild(link);
      link.click();
      
      // Limpar
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      alert('Erro ao fazer download do arquivo. Por favor, tente novamente.');
    }
  };

  // Função para aceitar um orçamento
  const handleAceitarOrcamento = async (workId, orcamentoIndex) => {
    try {
      const workRef = doc(db, 'works', workId);
      const workDoc = await getDoc(workRef);
      const workData = workDoc.data();
      
      if (!workData.orcamentos || !Array.isArray(workData.orcamentos)) {
        alert('Não foi possível encontrar os orçamentos desta obra.');
        return;
      }

      // Atualiza o orçamento específico para marcá-lo como aceito e visualizado
      const updatedOrcamentos = workData.orcamentos.map((orcamento, index) => {
        if (index === orcamentoIndex) {
          return { ...orcamento, aceito: true, visualizado: true };
        }
        return orcamento;
      });

      // Atualiza no Firestore
      await updateDoc(workRef, {
        orcamentos: updatedOrcamentos
      });

      // Atualiza o estado local
      setWorks(prevWorks => 
        prevWorks.map(work => 
          work.id === workId
            ? { ...work, orcamentos: updatedOrcamentos }
            : work
        )
      );

      // Atualiza o estado de orçamentos não visualizados
      const unviewedCount = updatedOrcamentos.filter(orc => !orc.visualizado).length;
      setUnviewedOrcamentos(prev => {
        const newState = { ...prev };
        if (unviewedCount > 0) {
          newState[workId] = unviewedCount;
        } else {
          delete newState[workId];
        }
        return newState;
      });

      alert('Orçamento aceito com sucesso!');
    } catch (error) {
      console.error('Erro ao aceitar orçamento:', error);
      alert('Erro ao aceitar orçamento: ' + error.message);
    }
  };

  // Função para marcar orçamentos como visualizados
  const markOrcamentosAsViewed = async (workId) => {
    try {
      const workRef = doc(db, 'works', workId);
      const workDoc = await getDoc(workRef);
      const workData = workDoc.data();
      
      if (!workData.orcamentos || !Array.isArray(workData.orcamentos)) {
        return;
      }

      // Marcar todos os orçamentos como visualizados
      const updatedOrcamentos = workData.orcamentos.map(orcamento => ({
        ...orcamento,
        visualizado: true
      }));

      // Atualizar no Firestore
      await updateDoc(workRef, {
        orcamentos: updatedOrcamentos
      });

      // Atualizar o estado local
      setWorks(prevWorks => 
        prevWorks.map(work => 
          work.id === workId
            ? { ...work, orcamentos: updatedOrcamentos }
            : work
        )
      );

      // Remover da lista de não visualizados
      setUnviewedOrcamentos(prev => {
        const newState = { ...prev };
        delete newState[workId];
        return newState;
      });

    } catch (error) {
      console.error('Erro ao marcar orçamentos como visualizados:', error);
    }
  };

  // Verificar se estamos em uma rota específica ou na raiz do dashgestor
  const isRootPath = location.pathname === '/dashgestor';

  const filteredWorks = works.filter(work => {
    const matchesSearch = work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         work.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedFilters.status === '' || 
                         work.status.toLowerCase() === selectedFilters.status.toLowerCase();
    
    const matchesCategory = selectedFilters.category === '' || 
                           work.category.toLowerCase() === selectedFilters.category.toLowerCase();
    
    const matchesPriority = selectedFilters.priority === '' || 
                           work.priority.toLowerCase() === selectedFilters.priority.toLowerCase();

    const matchesLocation = selectedFilters.location === '' || 
                          (work.location && work.location.morada && 
                           work.location.morada.toLowerCase().includes(selectedFilters.location.toLowerCase()));

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesLocation;
  });

  // Função para iniciar uma conversa com o técnico que enviou um orçamento
  const handleStartConversation = async (tecnicoId) => {
    try {
      // Navigate directly to messages page
      navigate('/gestor/messages');
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Erro ao iniciar conversa. Tente novamente.');
    }
  };

  // Used to render notifications dropdown
  const renderNotifications = () => {
    if (!showNotifications) return null;
    
    return (
      <div className="notification-wrapper">
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notificações</h3>
          </div>
          
          <div className="notifications-list">
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <div 
                  key={index} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <p>{notification.message}</p>
                  <span className="notification-time">{notification.time}</span>
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <p>Nenhuma notificação</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Similar to handleSubmit but for maintenance tasks
  const handleSubmitMaintenance = async (maintenanceData) => {
    try {
      setIsSubmitting(true);
      
      // Create the maintenance object
      const newMaintenanceData = {
        ...maintenanceData,
        userEmail: user.email,
        userId: user.uid,
        createdAt: serverTimestamp(),
        date: maintenanceData.date || new Date().toISOString().split('T')[0],
        status: "disponivel",
        isMaintenance: true
      };
      
      console.log("Criando nova manutenção:", newMaintenanceData);
      
      // Add to Firestore
      const maintenanceRef = await addDoc(collection(db, 'works'), newMaintenanceData);
      console.log("Manutenção criada com sucesso, ID:", maintenanceRef.id);
      
      // Add to local state with ID
      const maintenanceWithId = { ...newMaintenanceData, id: maintenanceRef.id };
      setMaintenances(prevMaintenances => [maintenanceWithId, ...prevMaintenances]);
      
      // Also add to the works array as they share the same collection
      setWorks(prevWorks => [maintenanceWithId, ...prevWorks]);
      
      alert('Manutenção criada com sucesso!');
      return maintenanceWithId;
      
    } catch (error) {
      console.error('Erro ao criar manutenção:', error);
      alert('Erro ao criar manutenção. Tente novamente.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle item click in recent items
  const handleItemClick = (item) => {
    setExpandedItem(item);
    setShowItemDetails(true);
  };

  // Function to close the item details modal
  const closeItemDetails = () => {
    setShowItemDetails(false);
    setExpandedItem(null);
  };

  // Function to render the item details modal
  const renderItemDetails = () => {
    if (!showItemDetails || !expandedItem) return null;
    
    const isMaintenance = expandedItem.isMaintenance;
    const groupedFiles = groupFilesByType(expandedItem.files || []);
    
    return (
      <div className="item-details-overlay">
        <div className="item-details-modal">
          <div className="item-details-header">
            <h2>{expandedItem.title}</h2>
            <button className="close-button" onClick={closeItemDetails}>
              <FiX size={20} />
            </button>
          </div>
          
          <div className="item-details-content">
            <div className="item-details-status">
              <span className={`status-badge ${expandedItem.status?.toLowerCase().replace(' ', '-')}`}>
                {expandedItem.status}
              </span>
              {expandedItem.category && (
                <span className={`category-badge ${expandedItem.category?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {expandedItem.category}
                </span>
              )}
              {isMaintenance && expandedItem.frequency && (
                <span className="frequency-badge">
                  {expandedItem.frequency}
                </span>
              )}
            </div>
            
            <div className="item-details-section">
              <h3>Descrição</h3>
              <p>{expandedItem.description}</p>
            </div>
            
            <div className="item-details-section">
              <h3>Data</h3>
              <p>{expandedItem.date && new Date(expandedItem.date).toLocaleDateString()}</p>
            </div>
            
            {expandedItem.location && Object.values(expandedItem.location).some(val => val) && (
              <div className="item-details-section">
                <h3>Localização</h3>
                <p>
                  {expandedItem.location.morada && <div>Morada: {expandedItem.location.morada}</div>}
                  {expandedItem.location.codigoPostal && <div>Código Postal: {expandedItem.location.codigoPostal}</div>}
                  {expandedItem.location.cidade && <div>Cidade: {expandedItem.location.cidade}</div>}
                  {expandedItem.location.andar && <div>Andar: {expandedItem.location.andar}</div>}
                </p>
              </div>
            )}
            
            {expandedItem.files && expandedItem.files.length > 0 && (
              <div className="item-details-section">
                <h3>Ficheiros</h3>
                <div className="file-list">
                  {expandedItem.files.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <button 
                        className="file-download-btn" 
                        onClick={() => handleFileDownload(file, file.name)}
                      >
                        <FiDownload />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isMaintenance && (
              <div className="item-details-section">
                <h3>Detalhes da Manutenção</h3>
                <p>Frequência: {expandedItem.frequency || 'Única'}</p>
                {expandedItem.nextDate && <p>Próxima Data: {new Date(expandedItem.nextDate).toLocaleDateString()}</p>}
              </div>
            )}
            
            <div className="item-details-actions">
              <button 
                className="edit-button"
                onClick={() => {
                  closeItemDetails();
                  handleEdit(expandedItem.id);
                }}
              >
                <FiEdit2 /> Editar
              </button>
              <button 
                className="delete-button"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir ${expandedItem.isMaintenance ? 'esta manutenção' : 'esta obra'}?`)) {
                    closeItemDetails();
                    handleDelete(expandedItem.id);
                  }
                }}
              >
                <FiX /> Excluir
              </button>
              {isMaintenance ? (
                <button 
                  className="view-button"
                  onClick={() => {
                    closeItemDetails();
                    navigate('/dashgestor/manutencoes');
                  }}
                >
                  <FiEye /> Ver Todas Manutenções
                </button>
              ) : (
                <button 
                  className="view-button"
                  onClick={() => {
                    closeItemDetails();
                    navigate('/dashgestor/obras');
                  }}
                >
                  <FiEye /> Ver Todas Obras
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCloseModal = () => {
    setSelectedWork(null);
  };

  const renderRecentActions = () => {
    return (
      <>
        <h2>Gestão de Obras e Manutenções</h2>
        
        <div className="metrics">
          <div className="metric-card">
            <h3>Total de Serviços</h3>
            <div className="metric-value">{works.length}</div>
          </div>
          <div className="metric-card">
            <h3>Serviços Pendentes</h3>
            <div className="metric-value">{works.filter(w => w.status === 'disponivel').length}</div>
          </div>
          <div className="metric-card">
            <h3>Em Andamento</h3>
            <div className="metric-value">{works.filter(w => w.status === 'em-andamento').length}</div>
          </div>
          <div className="metric-card">
            <h3>Concluídas</h3>
            <div className="metric-value">{works.filter(w => w.status === 'concluido').length}</div>
          </div>
        </div>

        <div className="filters-row">
          <div className="search-filter">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Pesquisar obras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-dropdown">
            <select 
              value={selectedFilters.status}
              onChange={(e) => setSelectedFilters(prev => ({...prev, status: e.target.value}))}
            >
              <option value="">Status</option>
              <option value="disponivel">Disponível</option>
              <option value="em-andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
          
          <div className="filter-dropdown">
            <select 
              value={selectedFilters.category}
              onChange={(e) => setSelectedFilters(prev => ({...prev, category: e.target.value}))}
            >
              <option value="">Categoria</option>
              <option value="eletricidade">Eletricidade</option>
              <option value="hidraulica">Hidráulica</option>
              <option value="pintura">Pintura</option>
              <option value="construcao">Construção</option>
              <option value="jardinagem">Jardinagem</option>
              <option value="fissuras e rachaduras">Fissuras e rachaduras</option>
              <option value="reabilitacao de fachadas">Reabilitação de fachadas</option>
              <option value="canalizacao">Canalização</option>
              <option value="ficalização">Fiscalização</option>
            </select>
          </div>
          
          <div className="filter-dropdown">
            <select 
              value={selectedFilters.priority}
              onChange={(e) => setSelectedFilters(prev => ({...prev, priority: e.target.value}))}
            >
              <option value="">Prioridade</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
              <option value="urgente">URGENTE (24h-48h)</option>
            </select>
          </div>

          <div className="filter-dropdown">
            <input 
              type="text"
              placeholder="Filtrar por localização..."
              value={selectedFilters.location}
              onChange={(e) => setSelectedFilters(prev => ({...prev, location: e.target.value}))}
              className="location-filter"
            />
          </div>
        </div>

        <div className="obras-table">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Data</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="loading">Carregando...</td>
                </tr>
              ) : filteredWorks.length > 0 ? (
                filteredWorks
                  .sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                    return dateB - dateA;
                  })
                  .map(work => (
                    <tr key={work.id} className="work-row" onClick={() => handleWorkClick(work)}>
                      <td className="title-cell">
                        <div className="work-title">{work.title}</div>
                        {work.location?.morada && (
                          <div className="work-subtitle">{work.location.morada}</div>
                        )}
                      </td>
                      <td>{work.date ? new Date(work.date).toLocaleDateString() : ''}</td>
                      <td>{work.category || 'Não especificada'}</td>
                      <td>
                        <span className={`priority-badge ${work.priority?.toLowerCase() || 'baixa'}`}>
                          {work.priority || 'Baixa'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${work.status?.toLowerCase() || 'disponivel'}`}>
                          {work.status === 'concluido' ? 'Concluída' :
                           work.status === 'em-andamento' ? 'Em andamento' :
                           'Disponível'}
                        </span>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-obras">
                    <p>Nenhuma obra encontrada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <WorkDetailsModal
          work={selectedWork}
          onClose={handleCloseModal}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onComplete={handleComplete}
          onFileDownload={handleFileDownload}
        />
      </>
    );
  };

  let content;
  if (location.pathname.includes('/dashgestor/obras') || 
      location.pathname.includes('/dashgestor/calendario') || 
      location.pathname.includes('/dashgestor/mensagens') || 
      location.pathname.includes('/dashgestor/perfil') || 
      location.pathname.includes('/dashgestor/manutencoes') ||
      location.pathname.includes('/dashgestor/workform')) {
    content = (
      <>
        <TopBar />
        <Routes>
          <Route path="/obras" element={
            <JobsComponent 
              works={works.filter(w => !w.isMaintenance)}
              handleSubmit={handleSubmit}
              setNewWork={setNewWork}
              newWork={newWork}
              handleFileUpload={handleFileUpload}
              handleRemoveFile={handleRemoveFile}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              handleComplete={handleComplete}
              handleStatusChange={handleStatusChange}
              handleFileDownload={handleFileDownload}
              handleViewDetails={handleViewDetails}
              expandedWorks={expandedWorks}
              isLoading={isLoading}
              onSendMessage={handleStartConversation}
            />
          } />
          <Route path="/workform" element={
            <WorkForm 
              newWork={newWork}
              setNewWork={setNewWork}
              handleFileUpload={handleFileUpload}
              handleRemoveFile={handleRemoveFile}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/dashgestor/obras')}
              editMode={false}
            />
          } />
          <Route path="/calendario" element={<CalendarComponent />} />
          <Route path="/mensagens" element={<Messages />} />
          <Route path="/perfil" element={<ProfileComponent />} />
          <Route path="/manutencoes" element={
            <MaintenanceComponent 
              maintenances={maintenances}
              handleSubmitMaintenance={handleSubmitMaintenance}
              isLoading={isLoading}
              user={user}
            />
          } />
        </Routes>
      </>
    );
  } else {
    // Esta é a interface padrão do dashboard
    content = (
      <>
        <TopBar />
        <div className="dashboard-container">
          <div className="dashboard-content">
            {renderRecentActions()}
            {renderItemDetails()}
          </div>
        </div>
      </>
    );
  }

  const loadWorks = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      console.log('Iniciando carregamento de obras...', {
        userEmail: user.email,
        userId: user.uid
      });
      
      const worksRef = collection(db, 'works');
      
      // Primeiro, vamos buscar todas as obras para debug
      const allWorksSnapshot = await getDocs(worksRef);
      console.log('Todas as obras no Firestore:', allWorksSnapshot.docs.map(doc => ({
        id: doc.id,
        userEmail: doc.data().userEmail,
        title: doc.data().title
      })));

      // Agora fazemos a query filtrada por email
      const worksQuery = query(
        worksRef,
        where('userEmail', '==', user.email)
      );
      
      const snapshot = await getDocs(worksQuery);
      console.log('Obras após filtro de userEmail:', snapshot.docs.map(doc => ({
        id: doc.id,
        userEmail: doc.data().userEmail,
        title: doc.data().title
      })));

      const worksData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        };
      });
      
      console.log('Obras processadas para o estado:', worksData.map(w => ({
        id: w.id,
        userEmail: w.userEmail,
        title: w.title
      })));
      
      setWorks(worksData);
      
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      setWorks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorks();
  }, [user?.uid]);

  // Monitorar mudanças nos orçamentos
  useEffect(() => {
    // Verificar orçamentos não visualizados
    const newUnviewedOrcamentos = {};
    works.forEach(work => {
      if (Array.isArray(work.orcamentos) && work.orcamentos.length > 0) {
        // Verificar se há orçamentos não visualizados
        const unviewedCount = work.orcamentos.filter(orc => !orc.visualizado).length;
        if (unviewedCount > 0) {
          newUnviewedOrcamentos[work.id] = unviewedCount;
        }
      }
    });
    setUnviewedOrcamentos(newUnviewedOrcamentos);
  }, [works]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    console.log('Current user:', user); // Debug log
  }, [user]);

  useEffect(() => {
    console.log('Obras atuais:', works.map(w => ({ id: w.id, title: w.title })));
  }, [works]);

  useEffect(() => {
    // Esta função será chamada apenas uma vez quando o componente for montado
    const normalizarObrasExistentes = async () => {
      try {
        console.log("Iniciando normalização de obras existentes...");
        const obrasRef = collection(db, 'works');
        const q = query(obrasRef);
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        let contadorAtualizacoes = 0;
        
        querySnapshot.forEach((docSnapshot) => {
          const obraData = docSnapshot.data();
          let precisaAtualizar = false;
          const atualizacoes = {};
          
          // Verificar e corrigir a categoria para "Eletricidade"
          if (obraData.category && typeof obraData.category === 'string') {
            const categoriaLower = obraData.category.toLowerCase();
            if (categoriaLower.includes("eletr") && obraData.category !== "Eletricidade") {
              atualizacoes.category = "Eletricidade";
              precisaAtualizar = true;
              console.log(`Obra ${docSnapshot.id}: Categoria corrigida para "Eletricidade"`);
            }
          }
          
          // Verificar se o status está como "disponivel" para obras que ainda não têm técnico atribuído
          if (!obraData.technicianId && obraData.status !== "disponivel") {
            atualizacoes.status = "disponivel";
            precisaAtualizar = true;
            console.log(`Obra ${docSnapshot.id}: Status atualizado para "disponivel"`);
          }
          
          // Se precisar atualizar, adiciona ao batch
          if (precisaAtualizar) {
            const obraRef = doc(db, 'works', docSnapshot.id);
            batch.update(obraRef, atualizacoes);
            contadorAtualizacoes++;
          }
        });
        
        // Executar o batch se houver atualizações
        if (contadorAtualizacoes > 0) {
          await batch.commit();
          console.log(`${contadorAtualizacoes} obras foram atualizadas com sucesso!`);
          // Atualizar as obras localmente depois do batch
          loadWorks();
        } else {
          console.log("Nenhuma obra precisou ser atualizada.");
        }
        
      } catch (error) {
        console.error("Erro ao normalizar obras existentes:", error);
      }
    };
    
    // Executar a normalização
    normalizarObrasExistentes();
  }, []); // Este efeito será executado apenas uma vez na montagem

  const getWorksForDate = (date) => {
    return works.filter(work => {
      const workDate = new Date(work.date);
      return workDate.toDateString() === date.toDateString();
    });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    }
  };

  const updateWork = async (workId, updatedWork) => {
    try {
      const workRef = doc(db, 'works', workId);
      await updateDoc(workRef, {
        title: updatedWork.title,
        description: updatedWork.description,
        category: updatedWork.category,
        priority: updatedWork.priority,
        location: updatedWork.location,
        date: updatedWork.date,
        files: updatedWork.files,
        // Don't update status here as it's handled separately
      });

      // Update local state
      setWorks(works.map(work => 
        work.id === workId 
          ? { ...work, ...updatedWork }
          : work
      ));
    } catch (error) {
      console.error('Error updating work:', error);
      throw error;
    }
  };

  const tileContent = ({ date }) => {
    const worksForDate = getWorksForDate(date);
    return worksForDate.length > 0 ? (
      <div className="work-dot-container">
        {worksForDate.map(work => (
          <span 
            key={work.id} 
            className={`work-dot ${work.status.toLowerCase().replace(' ', '-')}`}
            title={`${work.title} - ${work.status}`}
          />
        ))}
      </div>
    ) : null;
  };

  useEffect(() => {
    const fetchWorks = async () => {
      if (user) {
        setIsLoading(true);
        try {
          // Buscar obras do Firestore
          const q = query(collection(db, 'works'), where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const worksData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Separar obras e manutenções
          const obras = worksData.filter(work => !work.isMaintenance);
          const manutencoes = worksData.filter(work => work.isMaintenance);
          
          setWorks(obras);
          setMaintenances(manutencoes);
          
          console.log('Obras carregadas:', obras.length);
          console.log('Manutenções carregadas:', manutencoes.length);
        } catch (error) {
          console.error('Erro ao carregar obras:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchWorks();
  }, [user, db]);

  // Função para lidar com o clique em uma obra recente
  const handleRecentWorkClick = (work) => {
    setSelectedRecentWork(work);
  };

  // Add this function to handle work selection
  const handleWorkClick = (work) => {
    setSelectedWork(work);
  };

  return content;
}

export default DashGestor;
