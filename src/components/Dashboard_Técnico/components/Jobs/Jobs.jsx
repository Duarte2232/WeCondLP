import React, { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft, FiTag, FiInfo, FiAlertCircle, FiMessageSquare, FiDollarSign } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import './Jobs.css';
import JobDetailsModal from '../JobDetailsModal/JobDetailsModal';
import BudgetModal from '../BudgetModal/BudgetModal';
import SearchFilters from '../SearchFilters/SearchFilters.jsx';
import BudgetAcceptedNotification from './BudgetAcceptedNotification';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Initial state for the jobs reducer
const initialState = {
  selectedJob: null,
  showBudgetModal: false,
  showDetailsModal: false,
  jobsWithBudgetStatus: [],
  isLoadingBudgetStatus: false,
  error: null,
  dismissedNotifications: [],
  isEditMode: false,
  existingBudget: null
};

// Action types
const ACTIONS = {
  SET_SELECTED_JOB: 'SET_SELECTED_JOB',
  TOGGLE_BUDGET_MODAL: 'TOGGLE_BUDGET_MODAL',
  TOGGLE_DETAILS_MODAL: 'TOGGLE_DETAILS_MODAL',
  SET_JOBS_WITH_BUDGET_STATUS: 'SET_JOBS_WITH_BUDGET_STATUS',
  SET_LOADING_BUDGET_STATUS: 'SET_LOADING_BUDGET_STATUS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  DISMISS_NOTIFICATION: 'DISMISS_NOTIFICATION',
  SET_DISMISSED_NOTIFICATIONS: 'SET_DISMISSED_NOTIFICATIONS',
  SET_EDIT_MODE: 'SET_EDIT_MODE',
  SET_EXISTING_BUDGET: 'SET_EXISTING_BUDGET'
};

// Reducer function
function jobsReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_SELECTED_JOB:
      return { ...state, selectedJob: action.payload };
    case ACTIONS.TOGGLE_BUDGET_MODAL:
      return { ...state, showBudgetModal: action.payload };
    case ACTIONS.TOGGLE_DETAILS_MODAL:
      return { ...state, showDetailsModal: action.payload };
    case ACTIONS.SET_JOBS_WITH_BUDGET_STATUS:
      return { ...state, jobsWithBudgetStatus: action.payload };
    case ACTIONS.SET_LOADING_BUDGET_STATUS:
      return { ...state, isLoadingBudgetStatus: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case ACTIONS.SET_DISMISSED_NOTIFICATIONS:
      return {
        ...state,
        dismissedNotifications: action.payload
      };
    case ACTIONS.DISMISS_NOTIFICATION:
      return {
        ...state,
        dismissedNotifications: [...state.dismissedNotifications, action.payload]
      };
    case ACTIONS.SET_EDIT_MODE:
      return { ...state, isEditMode: action.payload };
    case ACTIONS.SET_EXISTING_BUDGET:
      return { ...state, existingBudget: action.payload };
    default:
      return state;
  }
}

const Jobs = ({ jobs, loading }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [state, dispatch] = useReducer(jobsReducer, initialState);

  // Add search filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    status: '',
    category: '',
    location: ''
  });

  // Load dismissed notifications from Firestore on component mount
  useEffect(() => {
    const loadDismissedNotifications = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.dismissedNotifications) {
            dispatch({ 
              type: ACTIONS.SET_DISMISSED_NOTIFICATIONS, 
              payload: userData.dismissedNotifications 
            });
          }
        }
      } catch (error) {
        console.error('Error loading dismissed notifications:', error);
      }
    };

    loadDismissedNotifications();
  }, [auth.currentUser]);

  const checkBudgetStatus = async () => {
    if (!jobs) return;
    
    try {
      dispatch({ type: ACTIONS.SET_LOADING_BUDGET_STATUS, payload: true });
      dispatch({ type: ACTIONS.CLEAR_ERROR });
      
      const jobsWithStatus = await Promise.all(jobs.map(async (job) => {
        try {
          // Escolher a coleção correta baseada no tipo de trabalho
          const collectionName = job.isMaintenance ? 'ManutençãoOrçamentos' : 'ObrasOrçamentos';
          const orcamentosRef = collection(db, collectionName);
          const q = query(
            orcamentosRef, 
            where('workId', '==', job.id),
            where('technicianId', '==', auth.currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          
          // Verificar se algum orçamento foi aceito
          let hasAcceptedBudget = false;
          querySnapshot.forEach(doc => {
            const orcamento = doc.data();
            if (orcamento.aceito) {
              hasAcceptedBudget = true;
            }
          });
          
          return {
            ...job,
            hasSubmittedBudget: !querySnapshot.empty,
            status: hasAcceptedBudget ? 'em-andamento' : job.status
          };
        } catch (error) {
          console.error(`Error checking budget status for job ${job.id}:`, error);
          return {
            ...job,
            hasSubmittedBudget: false
          };
        }
      }));
      
      dispatch({ type: ACTIONS.SET_JOBS_WITH_BUDGET_STATUS, payload: jobsWithStatus });
    } catch (error) {
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: 'Erro ao verificar status dos orçamentos. Por favor, tente novamente.'
      });
      toast.error('Erro ao verificar status dos orçamentos');
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING_BUDGET_STATUS, payload: false });
    }
  };
  
  useEffect(() => {
    checkBudgetStatus();
  }, [jobs, auth.currentUser?.uid]);

  // Log the jobs array to check for maintenance records
  useEffect(() => {
    if (jobs && jobs.length > 0) {
      console.log('Jobs received in Jobs component:', jobs.length);
      const maintenanceJobs = jobs.filter(job => job.isMaintenance);
      console.log('Maintenance jobs found:', maintenanceJobs.length);
      
      if (maintenanceJobs.length > 0) {
        console.log('Sample maintenance job:', maintenanceJobs[0].title, maintenanceJobs[0].category);
      }
    }
  }, [jobs]);

  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  const showJobDetails = (job) => {
    dispatch({ type: ACTIONS.SET_SELECTED_JOB, payload: job });
    dispatch({ type: ACTIONS.TOGGLE_DETAILS_MODAL, payload: true });
  };

  const closeModal = () => {
    dispatch({ type: ACTIONS.SET_SELECTED_JOB, payload: null });
    dispatch({ type: ACTIONS.TOGGLE_DETAILS_MODAL, payload: false });
  };

  const openBudgetModal = async (job, isEdit = false) => {
    dispatch({ type: ACTIONS.SET_SELECTED_JOB, payload: job });
    dispatch({ type: ACTIONS.SET_EDIT_MODE, payload: isEdit });
    
    if (isEdit) {
      try {
        // Buscar o orçamento existente do técnico para esta obra
        const collectionName = job.isMaintenance ? 'ManutençãoOrçamentos' : 'ObrasOrçamentos';
        const orcamentosRef = collection(db, collectionName);
        const workIdField = job.isMaintenance ? 'manutencaoId' : 'workId';
        const q = query(
          orcamentosRef, 
          where(workIdField, '==', job.id),
          where('technicianId', '==', auth.currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const existingBudget = querySnapshot.docs[0].data();
          existingBudget.id = querySnapshot.docs[0].id;
          dispatch({ type: ACTIONS.SET_EXISTING_BUDGET, payload: existingBudget });
        }
      } catch (error) {
        console.error('Erro ao buscar orçamento existente:', error);
      }
    } else {
      dispatch({ type: ACTIONS.SET_EXISTING_BUDGET, payload: null });
    }
    
    dispatch({ type: ACTIONS.TOGGLE_BUDGET_MODAL, payload: true });
  };

  const closeBudgetModal = () => {
    dispatch({ type: ACTIONS.TOGGLE_BUDGET_MODAL, payload: false });
  };

  const startConversation = async (job) => {
    try {
      if (!job.userId) {
        throw new Error('ID do gestor não encontrado');
      }

      const gestorDoc = await getDoc(doc(db, 'users', job.userId));
      
      if (!gestorDoc.exists()) {
        throw new Error('Dados do gestor não encontrados');
      }

      const gestorData = gestorDoc.data();

      // Check if a conversation already exists for this work
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef, 
        where('workId', '==', job.id),
        where('gestorId', '==', job.userId),
        where('technicianId', '==', auth.currentUser.uid)
      );
      const conversationSnapshot = await getDocs(q);

      let conversationId;

      if (conversationSnapshot.empty) {
        // Create a new conversation
        const conversationData = {
          workId: job.id,
          workTitle: job.title,
          gestorId: job.userId,
          technicianId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastMessageTimestamp: null,
          messages: [] // Array to store messages
        };

        const newConversationRef = await addDoc(conversationsRef, conversationData);
        conversationId = newConversationRef.id;
      } else {
        // Use existing conversation
        conversationId = conversationSnapshot.docs[0].id;
      }

      // Update the work document to associate it with the technician
      const workRef = doc(db, 'works', job.id);
      const workDoc = await getDoc(workRef);
      
      if (workDoc.exists()) {
        await updateDoc(workRef, {
          technicianId: auth.currentUser.uid,
          status: 'confirmada'
        });
      }

      navigate('/dashtecnico/mensagens', { 
        state: { 
          conversationId: conversationId,
          gestorId: job.userId,
          gestorName: gestorData.email || 'Gestor',
          obraId: job.id,
          obraTitle: job.title
        }
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Erro ao iniciar conversa. Por favor, tente novamente.');
    }
  };

  const handleBudgetSuccess = () => {
    dispatch({ type: ACTIONS.TOGGLE_BUDGET_MODAL, payload: false });
    dispatch({ type: ACTIONS.SET_SELECTED_JOB, payload: null });
    checkBudgetStatus();
    toast.success('Orçamento enviado com sucesso!');
  };

  const dismissNotification = async (jobId) => {
    try {
      if (!auth.currentUser) return;

      // Update local state
      dispatch({ type: ACTIONS.DISMISS_NOTIFICATION, payload: jobId });

      // Update Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentDismissed = userData.dismissedNotifications || [];
        
        if (!currentDismissed.includes(jobId)) {
          await updateDoc(userRef, {
            dismissedNotifications: [...currentDismissed, jobId]
          });
        }
      } else {
        // If user document doesn't exist, create it with the dismissed notification
        await setDoc(userRef, {
          dismissedNotifications: [jobId]
        });
      }
    } catch (error) {
      console.error('Error saving dismissed notification:', error);
    }
  };

  const handleMessageGestor = async (job) => {
    // Dismiss the notification before starting the conversation
    await dismissNotification(job.id);
    
    // Navigate to messages with gestor ID and work ID as URL parameters
    navigate(`/dashtecnico/mensagens?gestor=${job.userId}&workId=${job.id}`);
  };

  // Add filtered jobs logic
  const filteredJobs = state.jobsWithBudgetStatus.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    
    if (selectedFilters.status) {
      if (selectedFilters.status === 'orcamento-enviado') {
        matchesStatus = job.hasSubmittedBudget;
      } else if (selectedFilters.status === 'disponivel') {
        // Uma obra está disponível se:
        // 1. Não tem status definido OU tem status 'disponivel'
        // 2. Não tem técnico atribuído
        // 3. Não tem orçamento enviado pelo técnico atual
        matchesStatus = (!job.status || job.status === 'disponivel') && 
                       !job.technicianId && 
                       !job.hasSubmittedBudget;
      } else if (selectedFilters.status === 'em-andamento') {
        // Uma obra está em andamento se:
        // 1. Tem status 'em-andamento' OU
        // 2. Tem um orçamento aceito do técnico atual
        matchesStatus = job.status === 'em-andamento' || 
                       (job.hasSubmittedBudget && job.status === 'em-andamento') ||
                       (job.technicianId === auth.currentUser.uid && job.status === 'em-andamento');
      } else {
        matchesStatus = job.status === selectedFilters.status;
      }
    }
    
    const matchesCategory = !selectedFilters.category || 
                           (job.category && job.category.toLowerCase() === selectedFilters.category.toLowerCase());
    const matchesLocation = !selectedFilters.location || 
                          (job.location && 
                           (job.location.cidade?.toLowerCase().includes(selectedFilters.location.toLowerCase()) ||
                            job.location.morada?.toLowerCase().includes(selectedFilters.location.toLowerCase())));
    
    return matchesSearch && matchesStatus && matchesCategory && matchesLocation;
  });

  if (loading || state.isLoadingBudgetStatus) {
    return <div className="loading">Carregando obras...</div>;
  }

  return (
    <div className="main-content obras-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1 className="page-title">Obras</h1>
      </div>

      <SearchFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
      />
      
      <div className="jobs-list">
        {filteredJobs && filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-top-content">
                <div className="job-header">
                  <h2>{job.title}</h2>
                </div>

                <p className="job-description">
                  {job.description ? 
                    (job.description.length > 100 ? 
                      `${job.description.substring(0, 100)}...` : 
                      job.description
                    ) : 
                    'Sem descrição disponível'
                  }
                </p>
              </div>

              <div className="job-content-container">
                <div className="job-details">
                  <div className="job-category">
                    <FiTag />
                    <span>{job.category} {job.isMaintenance && <span className="maintenance-badge">Manutenção</span>}</span>
                  </div>
                  <div className="job-location">
                    <FiMapPin />
                    <span>{job.location?.cidade || 'Localização não especificada'}</span>
                  </div>
                  <div className="job-time">
                    <FiClock />
                    <span>{job.date}{job.time ? ` • ${job.time}` : ''}</span>
                  </div>
                  {job.isMaintenance && job.frequency && (
                    <div className="job-frequency">
                      <FiInfo />
                      <span>Frequência: {job.frequency}</span>
                    </div>
                  )}
                  {job.contact && (
                    <div className="job-contact">
                      <FiPhone />
                      <span>{job.contact}</span>
                    </div>
                  )}
                  <span className={`status-badge ${job.hasSubmittedBudget && job.status === 'em-andamento' ? 'em-andamento' : job.hasSubmittedBudget ? 'orcamento-enviado' : job.status || 'disponivel'}`}>
                    {job.hasSubmittedBudget && job.status === 'em-andamento' ? "Em Andamento" :
                     job.hasSubmittedBudget ? "Orçamento Enviado" :
                     !job.status ? "Disponível" :
                     job.status === "disponivel" ? "Disponível" :
                     job.status === "confirmada" ? "Confirmada" :
                     job.status === "concluida" ? "Concluída" :
                     job.status === "em-andamento" ? "Em Andamento" :
                     job.status}
                  </span>
                </div>

                <div className="job-actions">
                  {!job.hasSubmittedBudget ? (
                    <button className="budget-btn" onClick={() => openBudgetModal(job)}>
                      Enviar Orçamento
                    </button>
                  ) : (
                    <button className="budget-btn edit" onClick={() => openBudgetModal(job, true)}>
                      Editar Orçamento
                    </button>
                  )}
                  <button className="view-details-btn" onClick={() => showJobDetails(job)}>
                    Ver Detalhes
                  </button>
                  <button 
                    className="chat-gestor-btn"
                    onClick={() => handleMessageGestor(job)}
                  >
                    <FiMessageSquare />
                    Conversar com o gestor
                  </button>
                </div>
              </div>

              {job.hasSubmittedBudget && 
               job.status === 'em-andamento' && 
               state.dismissedNotifications && 
               !state.dismissedNotifications.includes(job.id) && (
                <BudgetAcceptedNotification
                  onDismiss={() => dismissNotification(job.id)}
                  onMessageGestor={() => handleMessageGestor(job)}
                />
              )}
            </div>
          ))
        ) : (
          <div className="no-jobs-message">
            <div className="no-jobs-icon">
              <FiAlertCircle />
            </div>
            <h3>Nenhuma obra disponível para suas especialidades no momento</h3>
            <p>As obras aparecerão aqui quando:</p>
            <ul className="no-jobs-list">
              <li><FiInfo /> Gestores criarem obras com categorias que correspondam às suas especialidades</li>
              <li><FiInfo /> As obras estiverem com status "disponível" no sistema</li>
              <li><FiInfo /> Seu perfil estiver completo com todas as especialidades desejadas</li>
            </ul>
            <button className="check-profile-btn" onClick={() => navigate('/dashtecnico/perfil')}>
              Verificar meu perfil
            </button>
          </div>
        )}
      </div>

      {state.showDetailsModal && state.selectedJob && (
        <JobDetailsModal
          job={state.selectedJob}
          onClose={closeModal}
        />
      )}

      {state.showBudgetModal && state.selectedJob && (
        <BudgetModal 
          job={state.selectedJob}
          onClose={closeBudgetModal}
          onSuccess={handleBudgetSuccess}
          existingBudget={state.existingBudget}
          isEditMode={state.isEditMode}
        />
      )}
    </div>
  );
};

export default Jobs; 