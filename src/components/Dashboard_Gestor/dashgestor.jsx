import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './dashgestor.css';
import { FiPlusCircle, FiFilter, FiSearch, FiBell, FiEdit2, FiEye, FiCheck, FiX, FiCalendar, FiUpload, FiArrowLeft, FiFile, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../contexts/auth';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CLOUDINARY_CONFIG } from '../../config/cloudinary';
import LoadingAnimation from '../LoadingAnimation/LoadingAnimation';
import sha1 from 'crypto-js/sha1';

function DashGestor() {
  const { user } = useAuth();
  const [showNewWorkForm, setShowNewWorkForm] = useState(false);
  const [expandedWorks, setExpandedWorks] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    status: '',
    category: '',
    priority: '',
    date: ''
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [works, setWorks] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleViewDetails = (workId) => {
    setExpandedWorks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workId)) {
        newSet.delete(workId);
      } else {
        newSet.add(workId);
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

  const handleEdit = async (work) => {
    try {
      // Verificar se é admin ou dono da obra
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
      
      // Se não for admin, verifica se é o dono da obra
      if (!isAdmin && work.userId !== user.uid) {
        throw new Error('Você não tem permissão para editar esta obra');
      }

      setEditingWork(work);
      setNewWork(work);
      setShowNewWorkForm(true);
    } catch (error) {
      console.error('Erro ao editar:', error);
      alert('Erro ao editar obra: ' + error.message);
    }
  };

  const handleComplete = (workId) => {
    const work = works.find(w => w.id === workId);
    handleStatusChange(workId, 'Concluído');
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
    const files = Array.from(e.target.files);
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`O arquivo ${file.name} excede o limite de 10MB`);
        continue;
      }

      try {
        const fileData = await uploadToCloudinary(file);
        setNewWork(prev => ({
          ...prev,
          files: [...(prev.files || []), fileData]
        }));
      } catch (error) {
        alert(`Erro ao fazer upload de ${file.name}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!editingWork) {
        // Lógica existente para criar nova obra
        const workData = {
          ...newWork,
          userEmail: user.email,
          userId: user.uid,
          createdAt: serverTimestamp(),
          date: newWork.date || new Date().toISOString().split('T')[0]
        };

        const workRef = await addDoc(collection(db, 'works'), workData);
        setWorks(prevWorks => [...prevWorks, { ...workData, id: workRef.id }]);
        alert('Obra criada com sucesso!');
      } else {
        // Lógica para atualizar obra existente
        const workRef = doc(db, 'works', editingWork.id);
        const updateData = {
          ...newWork,
          updatedAt: serverTimestamp()
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
        orcamentos: {
          minimo: '',
          maximo: ''
        },
        prazoOrcamentos: ''
      });
      
      setShowNewWorkForm(false);
      setEditingWork(null);
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      alert(error.message || 'Erro ao salvar obra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorks = works.filter(work => {
    const matchesSearch = work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         work.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedFilters.status === '' || 
                         work.status.toLowerCase() === selectedFilters.status.toLowerCase();
    
    const matchesCategory = selectedFilters.category === '' || 
                           work.category.toLowerCase() === selectedFilters.category.toLowerCase();
    
    const matchesPriority = selectedFilters.priority === '' || 
                           work.priority.toLowerCase() === selectedFilters.priority.toLowerCase();

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

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

  // Função auxiliar para agrupar arquivos por tipo
  const groupFilesByType = (files = []) => {
    return {
      images: files.filter(file => file?.type === 'image'),
      videos: files.filter(file => file?.type === 'video'),
      documents: files.filter(file => file?.type !== 'image' && file?.type !== 'video')
    };
  };

  // Add file removal function
  const handleRemoveFile = (fileToRemove) => {
    setNewWork(prev => ({
      ...prev,
      files: prev.files.filter(file => file.url !== fileToRemove.url)
    }));
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

      // Atualiza o orçamento específico para marcá-lo como aceito
      const updatedOrcamentos = workData.orcamentos.map((orcamento, index) => {
        if (index === orcamentoIndex) {
          return { ...orcamento, aceito: true };
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

      alert('Orçamento aceito com sucesso!');
    } catch (error) {
      console.error('Erro ao aceitar orçamento:', error);
      alert('Erro ao aceitar orçamento: ' + error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="top-nav">
        <div className="nav-left">
          <button 
            className="back-button" 
            onClick={() => navigate('/login')}
          >
            <FiArrowLeft />
          </button>
          <h1>
            {isLoading ? (
              <span className="loading-name">Carregando...</span>
            ) : (
              userData ? `Gestão de Obras - ${userData.name}` : 'Gestão de Obras'
            )}
          </h1>
        </div>
      </nav>

      <section className="metrics-grid">
        {isLoading ? (
          <div className="loading-container">
            <LoadingAnimation />
          </div>
        ) : (
          <>
            <div className="metric-card">
              <h3>Total de Obras</h3>
              <p className="metric-value">{metrics.total}</p>
            </div>
            <div className="metric-card">
              <h3>Obras Pendentes</h3>
              <p className="metric-value">{metrics.pending}</p>
            </div>
            <div className="metric-card">
              <h3>Em Andamento</h3>
              <p className="metric-value">{metrics.inProgress}</p>
            </div>
            <div className="metric-card">
              <h3>Concluídas</h3>
              <p className="metric-value">{metrics.completed}</p>
            </div>
          </>
        )}
      </section>

      <section className="actions-bar">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Pesquisar obras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters">
          <select
            value={selectedFilters.status}
            onChange={(e) => setSelectedFilters({...selectedFilters, status: e.target.value})}
          >
            <option value="">Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
          </select>
          <select
            value={selectedFilters.category}
            onChange={(e) => setSelectedFilters({...selectedFilters, category: e.target.value})}
          >
            <option value="">Categoria</option>
            <option value="Infiltração">Infiltração</option>
            <option value="Fissuras e rachaduras">Fissuras e rachaduras</option>
            <option value="Canalização">Canalização</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Jardinagem">Jardinagem</option>
            <option value="Fiscalização">Fiscalização</option>
            <option value="Reabilitação de Fachada">Reabilitação de Fachada</option>
            <option value="Eletricidade">Eletricidade</option>
            <option value="Construção">Construção</option>
            <option value="Pintura">Pintura</option>
          </select>
          <select
            value={selectedFilters.priority}
            onChange={(e) => setSelectedFilters({...selectedFilters, priority: e.target.value})}
          >
            <option value="">Prioridade</option>
            <option value="Baixa">Baixa</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <button 
          className={`calendar-toggle-btn ${showCalendar ? 'active' : ''}`}
          onClick={() => setShowCalendar(!showCalendar)}
        >
          <FiCalendar /> Calendário
        </button>
        <button className="new-work-btn" onClick={() => setShowNewWorkForm(true)}>
          <FiPlusCircle /> Nova Obra
        </button>
      </section>

      {showCalendar && (
        <section className="calendar-section">
          <div className="calendar-container">
            <Calendar
              onChange={handleDateClick}
              value={selectedDate}
              tileContent={({ date }) => {
                const worksForDate = getWorksForDate(date);
                return worksForDate.length > 0 ? (
                  <div className="work-dot-container">
                    {worksForDate.map(work => (
                      <span 
                        key={work.id} 
                        className={`work-dot ${work.priority.toLowerCase()}`}
                        title={work.title}
                      />
                    ))}
                  </div>
                ) : null;
              }}
            />
          </div>
          <div className="calendar-works">
            <h3>Obras em {selectedDate.toLocaleDateString()}</h3>
            {getWorksForDate(selectedDate).length > 0 ? (
              <div className="calendar-works-list">
                {getWorksForDate(selectedDate).map(work => (
                  <div key={work.id} className="calendar-work-card">
                    <div className="calendar-work-header">
                      <h4>{work.title}</h4>
                      <span className={`priority-badge ${work.priority.toLowerCase()}`}>
                        {work.priority}
                      </span>
                    </div>
                    <p>{work.description}</p>
                    <div className="calendar-work-footer">
                      <span className={`status-badge ${work.status.toLowerCase().replace(' ', '-')}`}>
                        {work.status}
                      </span>
                      <span className="location">{work.location.morada}, {work.location.cidade}, {work.location.codigoPostal}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-works">Nenhuma obra programada para esta data</p>
            )}
          </div>
        </section>
      )}

      <section className="works-table-container">
        {isLoading ? (
          <div className="loading-container">
            <LoadingAnimation />
          </div>
        ) : (
          <table className="works-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Data</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorks.map((work, index) => (
                <React.Fragment key={`${work.id}-${index}`}>
                  <tr 
                    className={`work-row ${work.status === 'Concluído' ? 'concluida' : ''}`}
                    onClick={() => handleViewDetails(work.id)}
                  >
                    <td>{work.title}</td>
                    <td>{new Date(work.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`category-badge ${work.category.toLowerCase()}`}>
                        {work.category}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge ${work.priority.toLowerCase()}`}>
                        {work.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${work.status.toLowerCase().replace(' ', '-')}`}>
                        {work.status}
                      </span>
                    </td>
                    <td className="actions-cell" onClick={e => e.stopPropagation()}>
                      <button 
                        className="action-btn" 
                        title="Editar"
                        onClick={() => handleEdit(work)}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="action-btn" 
                        title="Marcar como concluído"
                        onClick={() => handleComplete(work.id)}
                      >
                        <FiCheck />
                      </button>
                      <button 
                        className="action-btn delete-btn" 
                        title="Excluir obra"
                        onClick={(e) => {
                          e.stopPropagation(); // Previne a propagação do evento
                          handleDelete(work.id);
                        }}
                      >
                        <FiX />
                      </button>
                    </td>
                  </tr>
                  {expandedWorks.has(work.id) && (
                    <tr className="details-row">
                      <td colSpan="6">
                        <div className="work-details-container">
                          <div className="work-details-main">
                            <div className="description-section">
                              <h3>Descrição</h3>
                              <p>{work.description}</p>
                            </div>
                            <div className="details-section">
                              <h4>Localização</h4>
                              <p>
                                {work.location.morada}<br />
                                {work.location.codigoPostal} - {work.location.cidade}
                                {work.location.andar && <><br />{work.location.andar}</>}
                              </p>
                            </div>

                            {work.files && work.files.length > 0 && (
                              <div className="files-preview-sections">
                                {/* Seção de Fotografias */}
                                {work.files.filter(file => file.type === 'image').length > 0 && (
                                  <div className="files-section">
                                    <h4>Fotografias</h4>
                                    <div className="files-grid">
                                      {work.files
                                        .filter(file => file.type === 'image')
                                        .map((file, index) => (
                                          <div key={`image-${index}`} className="file-preview-item">
                                            <img src={file.url} alt={file.name} />
                                            <div className="file-preview-overlay">
                                              <span className="file-name">{file.name}</span>
                                              <button 
                                                className="download-btn"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleFileDownload(file, file.name);
                                                }}
                                              >
                                                <FiDownload /> Download
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {/* Seção de Vídeos */}
                                {work.files.filter(file => file.type === 'video').length > 0 && (
                                  <div className="files-section">
                                    <h4>Vídeos</h4>
                                    <div className="files-grid">
                                      {work.files
                                        .filter(file => file.type === 'video')
                                        .map((file, index) => (
                                          <div key={`video-${index}`} className="file-preview-item">
                                            <video src={file.url} controls />
                                            <div className="file-preview-overlay">
                                              <span className="file-name">{file.name}</span>
                                              <button 
                                                className="download-btn"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleFileDownload(file, file.name);
                                                }}
                                              >
                                                <FiDownload /> Download
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {/* Seção de Documentos */}
                                {work.files.filter(file => file.type !== 'image' && file.type !== 'video').length > 0 && (
                                  <div className="files-section">
                                    <h4>Documentos</h4>
                                    <div className="files-grid">
                                      {work.files
                                        .filter(file => file.type !== 'image' && file.type !== 'video')
                                        .map((file, index) => (
                                          <div key={`doc-${index}`} className="file-preview-item document">
                                            <FiFile size={24} />
                                            <span className="file-name">{file.name}</span>
                                            <button 
                                              className="download-btn"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleFileDownload(file, file.name);
                                              }}
                                            >
                                              <FiDownload /> Download
                                            </button>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="orcamentos-sidebar">
                            <div className="orcamentos-header">
                              <h3>Orçamentos Disponíveis</h3>
                            </div>
                            <div className="orcamentos-list">
                              {Array.isArray(work.orcamentos) && work.orcamentos.length > 0 ? (
                                work.orcamentos.map((orcamento, index) => (
                                  <div key={index} className={`orcamento-card ${orcamento.aceito ? 'orcamento-aceito' : ''}`}>
                                    <div className="orcamento-info">
                                      <h4>{orcamento.empresa}</h4>
                                      <span className="orcamento-date">
                                        {new Date(orcamento.data).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="orcamento-value">
                                      {orcamento.valor}€
                                    </div>
                                    <div className="orcamento-actions">
                                      {orcamento.documento && (
                                        <button 
                                          className="orcamento-download"
                                          onClick={() => handleFileDownload(orcamento.documento, orcamento.documento.nome)}
                                        >
                                          <FiDownload /> Download 
                                        </button>
                                      )}
                                      {!orcamento.aceito && (
                                        <button 
                                          className="orcamento-aceitar"
                                          onClick={() => handleAceitarOrcamento(work.id, index)}
                                        >
                                          <FiCheck /> Aceitar
                                        </button>
                                      )}
                                      {orcamento.aceito && (
                                        <span className="orcamento-aceito-badge">Aceito</span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="no-orcamentos">Nenhum orçamento disponível</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showNewWorkForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingWork ? 'Editar Obra' : 'Nova Obra'}</h2>
              <button className="close-btn" onClick={() => {
                setShowNewWorkForm(false);
                setEditingWork(null);
              }}>
                <FiX />
              </button>
            </div>
            <form className="new-work-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Título da Obra</label>
                  <input
                    type="text"
                    required
                    value={newWork.title}
                    onChange={(e) => setNewWork({...newWork, title: e.target.value})}
                    placeholder="Ex: Reparo no Sistema Elétrico"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Descrição</label>
                  <textarea
                    required
                    value={newWork.description}
                    onChange={(e) => setNewWork({...newWork, description: e.target.value})}
                    placeholder="Descreva os detalhes da obra"
                  />
                </div>
              </div>

              <div className="form-row two-columns">
                <div className="form-group">
                  <label>Categoria</label>
                  <select
                    required
                    value={newWork.category}
                    onChange={(e) => setNewWork({...newWork, category: e.target.value})}
                  >
                    <option value="">Selecione uma categoria</option>
                    <option value="Infiltração">Infiltração</option>
                    <option value="Fissuras e rachaduras">Fissuras e rachaduras</option>
                    <option value="Canalização">Canalização</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Jardinagem">Jardinagem</option>
                    <option value="Fiscalização">Fiscalização</option>
                    <option value="Reabilitação de Fachada">Reabilitação de Fachada</option>
                    <option value="Eletricidade">Eletricidade</option>
                    <option value="Construção">Construção</option>
                    <option value="Pintura">Pintura</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Prioridade</label>
                  <select
                    required
                    value={newWork.priority}
                    onChange={(e) => setNewWork({...newWork, priority: e.target.value})}
                  >
                    <option value="">Selecione a prioridade</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Localização</label>
                  <div className="location-fields-container">
                    <input
                      type="text"
                      required
                      value={newWork.location.morada}
                      onChange={(e) => setNewWork({
                        ...newWork,
                        location: {
                          ...newWork.location,
                          morada: e.target.value
                        }
                      })}
                      placeholder="Morada"
                      className="morada-input"
                    />
                    <div className="postal-cidade-container">
                      <input
                        type="text"
                        required
                        value={newWork.location.codigoPostal}
                        onChange={(e) => setNewWork({
                          ...newWork,
                          location: {
                            ...newWork.location,
                            codigoPostal: e.target.value
                          }
                        })}
                        placeholder="Código Postal"
                      />
                      <input
                        type="text"
                        required
                        value={newWork.location.cidade}
                        onChange={(e) => setNewWork({
                          ...newWork,
                          location: {
                            ...newWork.location,
                            cidade: e.target.value
                          }
                        })}
                        placeholder="Cidade"
                      />
                    </div>
                    <input
                      type="text"
                      value={newWork.location.andar}
                      onChange={(e) => setNewWork({
                        ...newWork,
                        location: {
                          ...newWork.location,
                          andar: e.target.value
                        }
                      })}
                      placeholder="Andar/Sítio no Condomínio (opcional)"
                      className="andar-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-row two-columns">
                <div className="form-group">
                  <label>Orçamentos desejados</label>
                  <div className="orcamentos-container">
                    <input
                      type="number"
                      min="1"
                      required
                      value={newWork.orcamentos.minimo}
                      onChange={(e) => setNewWork({
                        ...newWork,
                        orcamentos: {
                          ...newWork.orcamentos,
                          minimo: e.target.value
                        }
                      })}
                      placeholder="Mínimo"
                    />
                    <input
                      type="number"
                      min={newWork.orcamentos.minimo || 1}
                      required
                      value={newWork.orcamentos.maximo}
                      onChange={(e) => setNewWork({
                        ...newWork,
                        orcamentos: {
                          ...newWork.orcamentos,
                          maximo: e.target.value
                        }
                      })}
                      placeholder="Máximo"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Prazo para Orçamentos</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={newWork.prazoOrcamentos}
                    onChange={(e) => setNewWork({
                      ...newWork,
                      prazoOrcamentos: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Arquivos</label>
                  <div className="files-container">
                    {newWork.files && newWork.files.length > 0 && (
                      <div className="files-preview-sections">
                        {/* Seção de Fotografias */}
                        {groupFilesByType(newWork.files).images.length > 0 && (
                          <div className="files-section">
                            <h4>Fotografias</h4>
                            <div className="files-grid">
                              {groupFilesByType(newWork.files).images.map((file, index) => (
                                <div key={`image-${index}`} className="file-preview-item">
                                  <button 
                                    type="button" 
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(file)}
                                  >
                                    <FiX />
                                  </button>
                                  <div className="file-preview">
                                    <img src={file.url} alt={file.name} />
                                    <div className="file-preview-overlay">
                                      <span className="file-name">{file.name}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Seção de Vídeos */}
                        {groupFilesByType(newWork.files).videos.length > 0 && (
                          <div className="files-section">
                            <h4>Vídeos</h4>
                            <div className="files-grid">
                              {groupFilesByType(newWork.files).videos.map((file, index) => (
                                <div key={`video-${index}`} className="file-preview-item">
                                  <button 
                                    type="button" 
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(file)}
                                  >
                                    <FiX />
                                  </button>
                                  <div className="file-preview">
                                    <video src={file.url} controls />
                                    <div className="file-preview-overlay">
                                      <span className="file-name">{file.name}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Seção de Documentos */}
                        {groupFilesByType(newWork.files).documents.length > 0 && (
                          <div className="files-section">
                            <h4>Documentos</h4>
                            <div className="files-grid">
                              {groupFilesByType(newWork.files).documents.map((file, index) => (
                                <div key={`doc-${index}`} className="file-preview-item document">
                                  <button 
                                    type="button" 
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(file)}
                                  >
                                    <FiX />
                                  </button>
                                  <FiFile size={24} />
                                  <span className="file-name">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="file-input"
                    />
                    <div className="file-input-text">
                      <FiUpload />
                      <p>Clique ou arraste arquivos aqui</p>
                      <span>Máximo 10MB por arquivo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adicionar campo de status quando estiver editando */}
              {editingWork && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={newWork.status}
                      onChange={(e) => setNewWork({...newWork, status: e.target.value})}
                      required
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoadingAnimation /> : (editingWork ? 'Atualizar Obra' : 'Criar Obra')}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowNewWorkForm(false);
                    setEditingWork(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashGestor;
