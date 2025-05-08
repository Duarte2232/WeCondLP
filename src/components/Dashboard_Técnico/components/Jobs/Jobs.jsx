import React, { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiArrowLeft, FiTag, FiInfo, FiAlertCircle, FiMessageSquare, FiDollarSign } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
import './Jobs.css';
import JobDetailsModal from '../JobDetailsModal/JobDetailsModal';
import BudgetModal from '../BudgetModal/BudgetModal';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Initial state for the jobs reducer
const initialState = {
  selectedJob: null,
  showBudgetModal: false,
  showDetailsModal: false,
  jobsWithBudgetStatus: [],
  isLoadingBudgetStatus: false,
  error: null
};

// Action types
const ACTIONS = {
  SET_SELECTED_JOB: 'SET_SELECTED_JOB',
  TOGGLE_BUDGET_MODAL: 'TOGGLE_BUDGET_MODAL',
  TOGGLE_DETAILS_MODAL: 'TOGGLE_DETAILS_MODAL',
  SET_JOBS_WITH_BUDGET_STATUS: 'SET_JOBS_WITH_BUDGET_STATUS',
  SET_LOADING_BUDGET_STATUS: 'SET_LOADING_BUDGET_STATUS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
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
    default:
      return state;
  }
}

const Jobs = ({ jobs, loading }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [state, dispatch] = useReducer(jobsReducer, initialState);

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
          
          return {
            ...job,
            hasSubmittedBudget: !querySnapshot.empty
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

  const openBudgetModal = (job) => {
    dispatch({ type: ACTIONS.SET_SELECTED_JOB, payload: job });
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
      const q = query(conversationsRef, where('workId', '==', job.id));
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
      
      <div className="jobs-list">
        {state.jobsWithBudgetStatus && state.jobsWithBudgetStatus.length > 0 ? (
          state.jobsWithBudgetStatus.map((job) => (
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
                  <span className={`status-badge ${job.hasSubmittedBudget ? 'orcamento-enviado' : job.status || 'disponivel'}`}>
                    {job.hasSubmittedBudget ? "Orçamento Enviado" :
                     !job.status ? "Disponível" :
                     job.status === "disponivel" ? "Disponível" :
                     job.status === "confirmada" ? "Confirmada" :
                     job.status === "concluida" ? "Concluída" :
                     job.status === "em-andamento" ? "Em Andamento" :
                     job.status}
                  </span>
                </div>

                <div className="job-actions">
                  {!job.hasSubmittedBudget && (
                    <button className="budget-btn" onClick={() => openBudgetModal(job)}>
                      Enviar Orçamento
                    </button>
                  )}
                  <button className="view-details-btn" onClick={() => showJobDetails(job)}>
                    Ver Detalhes
                  </button>
                  <button 
                    className="chat-gestor-btn"
                    onClick={() => startConversation(job)}
                  >
                    <FiMessageSquare />
                    Conversar com o gestor
                  </button>
                </div>
              </div>
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
        />
      )}
    </div>
  );
};

export default Jobs; 