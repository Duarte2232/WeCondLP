import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './dashgestor.css';
import { FiPlusCircle, FiFilter, FiSearch, FiBell, FiEdit2, FiEye, FiCheck, FiX, FiCalendar, FiUpload, FiArrowLeft, FiFile, FiDownload, FiAlertCircle, FiTag, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../contexts/auth';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, writeBatch, onSnapshot, deleteField } from 'firebase/firestore';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { CLOUDINARY_CONFIG } from '../../config/cloudinary';
import LoadingAnimation from '../LoadingAnimation/LoadingAnimation';
import sha1 from 'crypto-js/sha1';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { uploadToCloudinary, uploadToCloudinaryWithSignature } from '../../services/cloudinary.service.js';
import { getAuth } from 'firebase/auth';

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
import MaintenanceForm from './components/Maintenance/MaintenanceForm';


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
  const [workOrcamentos, setWorkOrcamentos] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

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
    total: works.length + maintenances.length,
    pending: works.filter(w => w.status === 'Pendente').length + maintenances.filter(m => m.status === 'Pendente').length,
    inProgress: works.filter(w => w.status === 'Em Andamento').length + maintenances.filter(m => m.status === 'Em Andamento').length,
    completed: works.filter(w => w.status === 'Concluído').length + maintenances.filter(m => m.status === 'Concluído').length
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

  const handleViewDetails = async (workId) => {
    try {
      console.log('----------------------------------------');
      console.log('Starting to fetch orçamentos for work:', workId);
      
      // Query the orcamentos collection for all orcamentos with this workId
      const orcamentosRef = collection(db, 'ObrasOrçamentos');
      
      // Log the entire orcamentos collection first
      const allOrcamentos = await getDocs(orcamentosRef);
      console.log('Total orçamentos in collection:', allOrcamentos.size);
      console.log('All orçamentos in collection:', allOrcamentos.docs.map(doc => ({
        id: doc.id,
        workId: doc.data().workId,
        ...doc.data()
      })));
      
      // Now query for specific workId
      const q = query(orcamentosRef, where("workId", "==", workId));
      console.log('Query parameters:', {
        field: 'workId',
        operator: '==',
        value: workId
      });
      
      const orcamentosSnapshot = await getDocs(q);
      console.log('Found orçamentos for this work:', orcamentosSnapshot.size);
      
      // Get all orcamentos for this work with additional details
      const workOrcamentos = orcamentosSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processing orçamento:', {
          id: doc.id,
          workId: data.workId,
          amount: data.amount,
          status: data.status,
          createdAt: data.createdAt,
          ...data
        });
        return {
          id: doc.id,
          ...data
        };
      });

      console.log('----------------------------------------');
      console.log('Final orçamentos array:', workOrcamentos);
      console.log('Number of orçamentos found:', workOrcamentos.length);

      // Always update the work document with the latest orçamentos from collection
      if (workOrcamentos.length > 0) {
        try {
          const workRef = doc(db, 'works', workId);
          await updateDoc(workRef, {
            hasOrcamentos: true
          });
          console.log('Work document updated with hasOrcamentos flag');
        } catch (updateError) {
          console.error('Error updating work document:', updateError);
        }
      }

      // Store in state
      setWorkOrcamentos(prev => {
        console.log('Previous orçamentos state:', prev);
        const newState = {
          ...prev,
          [workId]: workOrcamentos
        };
        console.log('New orçamentos state:', newState);
        return newState;
      });

      // Toggle expanded state
      setExpandedWorks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(workId)) {
          console.log('Collapsing work details');
          newSet.delete(workId);
        } else {
          console.log('Expanding work details');
          newSet.add(workId);
        }
        return newSet;
      });
    } catch (error) {
      console.error('----------------------------------------');
      console.error('Error fetching orcamentos:', {
        workId,
        error: error.message,
        stack: error.stack
      });
      alert('Erro ao carregar orçamentos: ' + error.message);
    }
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

  const handleEdit = (work) => {
    setEditingWork(work);
    setNewWork({
      title: work.title,
      description: work.description,
      category: work.category,
      priority: work.priority,
      location: work.location || {
        morada: '',
        codigoPostal: '',
        cidade: '',
        andar: ''
      },
      date: work.date,
      status: work.status,
      files: work.files || [],
      isMaintenance: work.isMaintenance,
      orcamentos: work.orcamentos || {
        minimo: '',
        maximo: ''
      },
      prazoOrcamentos: work.prazoOrcamentos
    });
    setShowNewWorkForm(true);
  };

  const handleComplete = async (workId, newStatus, isMaintenance, currentStatus, previousStatus) => {
    try {
      let collectionName = isMaintenance ? 'ManutençãoPedidos' : 'ObrasPedidos';
      const workRef = doc(db, collectionName, workId);
      if (newStatus === 'concluido') {
        // Salva o status anterior antes de concluir
        await updateDoc(workRef, { status: newStatus, previousStatus: currentStatus });
        if (isMaintenance) {
          setMaintenances(prev => prev.map(m => m.id === workId ? { ...m, status: newStatus, previousStatus: currentStatus } : m));
        } else {
          setWorks(prevWorks => prevWorks.map(w => w.id === workId ? { ...w, status: newStatus, previousStatus: currentStatus } : w));
        }
      } else {
        // Volta ao status anterior e remove o campo previousStatus
        await updateDoc(workRef, { status: newStatus, previousStatus: deleteField() });
        if (isMaintenance) {
          setMaintenances(prev => prev.map(m => m.id === workId ? { ...m, status: newStatus, previousStatus: undefined } : m));
        } else {
          setWorks(prevWorks => prevWorks.map(w => w.id === workId ? { ...w, status: newStatus, previousStatus: undefined } : w));
        }
      }
      setSelectedWork(null);
    } catch (error) {
      console.error('Erro ao concluir/undo obra/manutenção:', error);
      alert('Erro ao concluir/undo: ' + error.message);
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
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    setIsSubmitting(true);

    try {
      if (!editingWork) {
        // Processar os arquivos primeiro
        const processedFiles = [];
        if (newWork.files && newWork.files.length > 0) {
          console.log(`Iniciando upload de ${newWork.files.length} arquivos...`);
          
          for (const file of newWork.files) {
            // Se o arquivo já foi processado (tem url do Cloudinary), apenas adicione-o
            if (file.url && file.url.includes('cloudinary')) {
              processedFiles.push(file);
              console.log(`Arquivo já processado: ${file.name}`);
              continue;
            }
            
            // Se é um novo arquivo, faça o upload
            try {
              console.log(`Tentando upload do arquivo ${file.name} com método padrão...`);
              let fileData;
              
              try {
                // Primeiro tenta o método normal
                fileData = await uploadToCloudinary(file.file);
                console.log(`Upload bem sucedido para ${file.name} (método padrão)`);
              } catch (uploadError) {
                console.error(`Erro no upload padrão para ${file.name}:`, uploadError);
                console.log(`Tentando método alternativo com assinatura para ${file.name}...`);
                
                // Se falhar, tenta o método com assinatura
                fileData = await uploadToCloudinaryWithSignature(file.file);
                console.log(`Upload bem sucedido para ${file.name} (método assinado)`);
              }
              
              processedFiles.push(fileData);
            } catch (error) {
              console.error(`Todos os métodos de upload falharam para ${file.name}:`, error);
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
        const workRef = await addDoc(collection(db, 'ObrasPedidos'), workData);
        console.log("Obra criada com sucesso, ID:", workRef.id);
        setWorks(prevWorks => [...prevWorks, { ...workData, id: workRef.id }]);
        alert('Obra criada com sucesso!');
      } else {
        // Lógica para atualizar obra existente
        const collectionName = editingWork.isMaintenance ? 'ManutençãoPedidos' : 'ObrasPedidos';
        const workRef = doc(db, collectionName, editingWork.id);
        const updateData = {
          ...newWork,
          updatedAt: serverTimestamp()
        };

        await updateDoc(workRef, updateData);
        
        if (editingWork.isMaintenance) {
          setMaintenances(prev => 
            prev.map(m => m.id === editingWork.id ? { ...updateData, id: editingWork.id } : m)
          );
        } else {
          setWorks(prevWorks => 
            prevWorks.map(w => w.id === editingWork.id ? { ...updateData, id: editingWork.id } : w)
          );
        }
        
        alert('Item atualizado com sucesso!');
        setShowNewWorkForm(false);
        setEditingWork(null);
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
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error.message || 'Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função atualizada para deletar obra e suas notificações
  const handleDelete = async (workId, isMaintenance) => {
    try {
      let collectionName = isMaintenance ? 'ManutençãoPedidos' : 'ObrasPedidos';
      const workRef = doc(db, collectionName, workId);
      const workDoc = await getDoc(workRef);
      if (!workDoc.exists()) {
        console.error('Obra/Manutenção não encontrada no Firestore. ID:', workId);
        return;
      }
      if (window.confirm('Tem certeza que deseja excluir este item?')) {
        await deleteDoc(workRef);
        setWorks(prevWorks => prevWorks.filter(w => w.id !== workId));
        setMaintenances(prev => prev.filter(m => m.id !== workId));
        setSelectedWork(null);
      }
    } catch (error) {
      console.error('Erro ao deletar obra/manutenção:', error);
      alert('Erro ao deletar: ' + error.message);
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

  const handleAceitarOrcamento = async (workId, orcamentoId, isMaintenance = false) => {
    try {
      console.log('Accepting orçamento:', { workId, orcamentoId, isMaintenance });
      
      // Escolher as coleções corretas
      const workCollection = isMaintenance ? 'ManutençãoPedidos' : 'ObrasPedidos';
      const orcamentoCollection = isMaintenance ? 'ManutençãoOrçamentos' : 'ObrasOrçamentos';
      
      // Referências
      const workRef = doc(db, workCollection, workId);
      const orcamentoRef = doc(db, orcamentoCollection, orcamentoId);
      
      // Verificar se o documento existe
      const workDoc = await getDoc(workRef);
      const orcamentoDoc = await getDoc(orcamentoRef);
      
      if (!workDoc.exists()) {
        throw new Error('Serviço não encontrado');
      }
      
      if (!orcamentoDoc.exists()) {
        throw new Error('Orçamento não encontrado');
      }
      
      // Atualizar status da obra/manutenção
      await updateDoc(workRef, {
        status: 'em-andamento'
      });
      
      // Atualizar status do orçamento
      await updateDoc(orcamentoRef, {
        aceito: true
      });
      
      // Atualizar estado local
      if (isMaintenance) {
        setMaintenances(prevMaintenances => prevMaintenances.map(work =>
          work.id === workId ? { ...work, status: 'em-andamento' } : work
        ));
      } else {
        setWorks(prevWorks => prevWorks.map(work =>
          work.id === workId ? { ...work, status: 'em-andamento' } : work
        ));
      }
      
      // Atualizar estado dos orçamentos
      setWorkOrcamentos(prev => {
        const currentOrcamentos = prev[workId] || [];
        const updatedOrcamentos = currentOrcamentos.map(orc =>
          orc.id === orcamentoId ? { ...orc, aceito: true } : orc
        );
        console.log('Updated orcamentos:', updatedOrcamentos);
        return {
          ...prev,
          [workId]: updatedOrcamentos
        };
      });
      
      alert('Orçamento aceito com sucesso!');
    } catch (error) {
      console.error('Error accepting orçamento:', {
        workId,
        orcamentoId,
        isMaintenance,
        errorMessage: error.message,
        errorStack: error.stack
      });
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

  // Unir obras e manutenções para exibir na tabela
  const allServicos = [...works, ...maintenances];

  // Ordenar por data de criação (mais recente primeiro)
  const sortedServicos = allServicos.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt.seconds ? a.createdAt.seconds * 1000 : a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt.seconds ? b.createdAt.seconds * 1000 : b.createdAt) : new Date(0);
    return dateB - dateA;
  });

  // Aplicar filtros de busca e seleção
  const filteredServicos = sortedServicos.filter(servico => {
    const matchesSearch = servico.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         servico.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedFilters.status === '' || 
                         (servico.status && servico.status.toLowerCase() === selectedFilters.status.toLowerCase());
    const matchesCategory = selectedFilters.category === '' || 
                           (servico.category && servico.category.toLowerCase() === selectedFilters.category.toLowerCase());
    
    // Normalizar as prioridades para comparação
    const normalizePriority = (priority) => {
      if (!priority) return '';
      return priority.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace('media', 'média');
    };

    const matchesPriority = selectedFilters.priority === '' || 
                           (servico.priority && normalizePriority(servico.priority) === normalizePriority(selectedFilters.priority));
    
    const matchesLocation = selectedFilters.location === '' || 
                          (servico.location && servico.location.morada && 
                           servico.location.morada.toLowerCase().includes(selectedFilters.location.toLowerCase()));
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
      
      // Add to maintenances collection
      const maintenanceMainRef = await addDoc(collection(db, 'maintenances'), newMaintenanceData);
      console.log("Manutenção criada com sucesso na coleção maintenances, ID:", maintenanceMainRef.id);
      
      // Also add to works collection for technician dashboard
      const maintenanceWorkRef = await addDoc(collection(db, 'works'), newMaintenanceData);
      console.log("Manutenção criada com sucesso na coleção works, ID:", maintenanceWorkRef.id);
      
      // Use the works reference ID for consistency with the rest of the app
      const maintenanceWithId = { ...newMaintenanceData, id: maintenanceWorkRef.id };
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
                  handleEdit(expandedItem);
                }}
              >
                <FiEdit2 /> Editar
              </button>
              <button 
                className="delete-button"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir ${expandedItem.isMaintenance ? 'esta manutenção' : 'esta obra'}?`)) {
                    closeItemDetails();
                    handleDelete(expandedItem.id, expandedItem.isMaintenance);
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

  const handleCancelarAceitacao = async (workId, orcamentoId, isMaintenance = false) => {
    try {
      const collectionName = isMaintenance ? 'ManutençãoPedidos' : 'ObrasPedidos';
      const workRef = doc(db, collectionName, workId);
      const workDoc = await getDoc(workRef);
      
      if (!workDoc.exists()) {
        throw new Error('Serviço não encontrado');
      }

      const workData = workDoc.data();
      const orcamentos = workData.orcamentos || [];
      
      // Encontrar o orçamento e atualizar seu status
      const updatedOrcamentos = orcamentos.map(orc => {
        if (orc.id === orcamentoId) {
          return { ...orc, aceito: false };
        }
        return orc;
      });

      // Atualizar o documento com os orçamentos atualizados
      await updateDoc(workRef, {
        orcamentos: updatedOrcamentos,
        status: 'disponivel',
        technicianId: null
      });

      // Recarregar os dados
      await loadWorks();
      
      // Fechar o modal
      setSelectedWork(null);
    } catch (error) {
      console.error('Erro ao cancelar aceitação:', error);
      alert('Erro ao cancelar aceitação do orçamento. Por favor, tente novamente.');
    }
  };

  const renderRecentActions = () => {
    return (
      <>
        <h2>Gestão de Obras e Manutenções</h2>
        
        <div className="metrics">
          <div className="metric-card">
            <h3>Total de Serviços</h3>
            <div className="metric-value">{works.length + maintenances.length}</div>
          </div>
          <div className="metric-card">
            <h3>Serviços Pendentes</h3>
            <div className="metric-value">{works.filter(w => w.status === 'disponivel').length + maintenances.filter(m => m.status === 'disponivel').length}</div>
          </div>
          <div className="metric-card">
            <h3>Em Andamento</h3>
            <div className="metric-value">{works.filter(w => w.status === 'em-andamento').length + maintenances.filter(m => m.status === 'em-andamento').length}</div>
          </div>
          <div className="metric-card">
            <h3>Concluídas</h3>
            <div className="metric-value">{works.filter(w => w.status === 'concluido').length + maintenances.filter(m => m.status === 'concluido').length}</div>
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
              ) : filteredServicos.length > 0 ? (
                filteredServicos.map(servico => (
                  <tr key={servico.id} className="work-row" onClick={() => handleWorkClick(servico)}>
                    <td className="title-cell">
                      {servico.isMaintenance ? (
                        <span className="servico-badge-custom">Manutenção</span>
                      ) : (
                        <span className="servico-badge-custom">Obra</span>
                      )}
                      <div className="work-title">{servico.title}</div>
                      {servico.location?.morada && (
                        <div className="work-subtitle">{servico.location.morada}</div>
                      )}
                    </td>
                    <td>{servico.date ? new Date(servico.date).toLocaleDateString() : ''}</td>
                    <td>{servico.category || 'Não especificada'}</td>
                    <td>
                      <span className={`priority-badge ${servico.priority?.toLowerCase() || 'baixa'}`}>
                        {servico.priority || 'Baixa'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${servico.status?.toLowerCase() || 'disponivel'}`}>
                        {servico.status === 'concluido' ? 'Concluída' :
                         servico.status === 'em-andamento' ? 'Em andamento' :
                         servico.status === 'disponivel' ? 'Disponível' :
                         servico.status || 'Disponível'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-obras">
                    <p>Nenhuma obra ou manutenção encontrada</p>
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
          onDelete={() => handleDelete(selectedWork.id, selectedWork.isMaintenance)}
          onComplete={(id, newStatus) => {
            if (selectedWork.status === 'concluido' && selectedWork.previousStatus) {
              handleComplete(id, selectedWork.previousStatus, selectedWork.isMaintenance, selectedWork.status, selectedWork.previousStatus);
            } else {
              handleComplete(id, 'concluido', selectedWork.isMaintenance, selectedWork.status, selectedWork.previousStatus);
            }
          }}
          onFileDownload={handleFileDownload}
          onCancelarAceitacao={handleCancelarAceitacao}
          onAcceptOrcamento={handleAceitarOrcamento}
          workOrcamentos={workOrcamentos[selectedWork?.id] || []}
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
              editMode={!!editingWork}
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
          <Route path="/new-work" element={<WorkForm />} />
          <Route path="/new-maintenance" element={<MaintenanceForm />} />
          <Route path="/edit-work/:id" element={<WorkForm editMode={true} />} />
          <Route path="/edit-maintenance/:id" element={<MaintenanceForm editMode={true} />} />
        </Routes>
      </>
    );
  } else {
    // Esta é a interface padrão do dashboard
    content = (
      <>
        <TopBar unreadCount={unreadCount} />
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
      
      const obrasEmailQuery = query(collection(db, 'ObrasPedidos'), where("userEmail", "==", user.email));
      const obrasUserIdQuery = query(collection(db, 'ObrasPedidos'), where("userId", "==", user.uid));

      const [obrasEmailSnapshot, obrasUserIdSnapshot] = await Promise.all([
        getDocs(obrasEmailQuery),
        getDocs(obrasUserIdQuery)
      ]);

      // Criar um mapa para evitar duplicações
      const obrasMap = new Map();
      [...obrasEmailSnapshot.docs, ...obrasUserIdSnapshot.docs].forEach(doc => {
        if (!obrasMap.has(doc.id)) {
          obrasMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            isMaintenance: false
          });
        }
      });
      const obras = Array.from(obrasMap.values());

      // Buscar manutenções do Firestore usando tanto userEmail quanto userId
      const manutencoesEmailQuery = query(collection(db, 'ManutençãoPedidos'), where("userEmail", "==", user.email));
      const manutencoesUserIdQuery = query(collection(db, 'ManutençãoPedidos'), where("userId", "==", user.uid));

      const [manutencoesEmailSnapshot, manutencoesUserIdSnapshot] = await Promise.all([
        getDocs(manutencoesEmailQuery),
        getDocs(manutencoesUserIdQuery)
      ]);

      // Criar um mapa para evitar duplicações
      const manutencoesMap = new Map();
      [...manutencoesEmailSnapshot.docs, ...manutencoesUserIdSnapshot.docs].forEach(doc => {
        if (!manutencoesMap.has(doc.id)) {
          manutencoesMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            isMaintenance: true
          });
        }
      });
      const manutencoes = Array.from(manutencoesMap.values());

      // Sort works and maintenances by date in descending order
      const sortedObras = obras.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });

      const sortedManutencoes = manutencoes.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });

      setWorks(sortedObras);
      setMaintenances(sortedManutencoes);

      console.log('Obras carregadas:', obras.length);
      console.log('Manutenções carregadas:', manutencoes.length);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
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
              console.log(`Categoria normalizada para 'Eletricidade'`);
            }
          }
          
          if (precisaAtualizar) {
            atualizacoes.updatedAt = serverTimestamp();
            batch.update(docSnapshot.ref, atualizacoes);
            contadorAtualizacoes++;
          }
        });
        
        await batch.commit();
        console.log(`${contadorAtualizacoes} obras atualizadas`);
      } catch (error) {
        console.error('Erro ao normalizar obras existentes:', error);
      }
    };

    normalizarObrasExistentes();
  }, []);

  const handleWorkClick = (servico) => {
    setSelectedWork(servico);
  };

  return content;
}

export default DashGestor;
