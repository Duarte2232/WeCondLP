import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './dashgestor.css';
import { FiPlusCircle, FiFilter, FiSearch, FiBell, FiEdit2, FiEye, FiCheck, FiX, FiCalendar, FiUpload, FiArrowLeft, FiFile, FiDownload } from 'react-icons/fi';
import { useAuth } from '../../contexts/auth';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    const loadWorks = async () => {
      if (!user?.email) return;
      
      try {
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where('userEmail', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        const loadedWorks = [];
        querySnapshot.forEach((doc) => {
          loadedWorks.push({ id: doc.id, ...doc.data() });
        });
        
        setWorks(loadedWorks);
      } catch (error) {
        console.error('Error loading works:', error);
        // Add error notification here
      }
    };

    loadWorks();
  }, [user]);

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

  const addNotification = async (message) => {
    try {
      const notificationData = {
        userEmail: user.email,
        message,
        time: "Agora mesmo",
        read: false,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      
      setNotifications(prev => [{
        id: docRef.id,
        ...notificationData
      }, ...prev]);
    } catch (error) {
      console.error('Error adding notification:', error);
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
      
      const work = works.find(w => w.id === workId);
      addNotification(`Obra '${work.title}' mudou para ${newStatus}`);
    } catch (error) {
      console.error('Error updating work status:', error);
      // Add error notification here
    }
  };

  const handleEdit = (work) => {
    setEditingWork(work);
    setNewWork({
      ...work,
      files: work.files || [],
      id: work.id
    });
    setShowNewWorkForm(true);
  };

  const handleComplete = (workId) => {
    const work = works.find(w => w.id === workId);
    handleStatusChange(workId, 'Concluído');
    addNotification(`Obra '${work.title}' foi concluída`);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit per file

    files.forEach(file => {
      if (file.size > maxFileSize) {
        alert(`O arquivo ${file.name} é muito grande. O tamanho máximo é 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewWork(prev => ({
          ...prev,
          files: [...prev.files, {
            type: file.type.split('/')[0],
            name: file.name,
            data: reader.result
          }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { id, ...workDataWithoutId } = newWork;
      
      const workData = {
        ...workDataWithoutId,
        userEmail: user.email,
        ...(editingWork ? {} : { createdAt: new Date().toISOString() })
      };

      if (editingWork) {
        const workId = editingWork.id;
        console.log('Updating work with ID:', workId); // Debug log
        
        const workRef = doc(db, 'works', workId);
        
        const workDoc = await getDoc(workRef);
        if (!workDoc.exists()) {
          throw new Error('Documento não encontrado');
        }

        await updateDoc(workRef, workData);
        
        setWorks(works.map(work => 
          work.id === workId 
            ? { ...workData, id: workId }
            : work
        ));
        
        addNotification('Obra atualizada com sucesso!');
      } else {
        const docRef = await addDoc(collection(db, 'works'), workData);
        setWorks([...works, { id: docRef.id, ...workData }]);
        addNotification('Obra criada com sucesso!');
      }

      setNewWork({
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

      setShowNewWorkForm(false);
      setEditingWork(null);
    } catch (error) {
      console.error('Error saving work:', error);
      addNotification(
        error.message === 'Documento não encontrado'
          ? 'Erro: Obra não encontrada'
          : editingWork 
            ? 'Erro ao atualizar obra' 
            : 'Erro ao criar obra',
        'error'
      );
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

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.email) return;
      
      try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
          notificationsRef, 
          where('userEmail', '==', user.email),
          // Add orderBy if needed
        );
        
        const querySnapshot = await getDocs(q);
        const loadedNotifications = [];
        querySnapshot.forEach((doc) => {
          loadedNotifications.push({ id: doc.id, ...doc.data() });
        });
        
        setNotifications(loadedNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, [user]);

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

      // Add notification
      addNotification(`Obra '${updatedWork.title}' foi atualizada`);
    } catch (error) {
      console.error('Error updating work:', error);
      throw error;
    }
  };

  // Helper function to group files by type
  const groupFilesByType = (files) => {
    return {
      images: files.filter(file => file.type === 'image'),
      videos: files.filter(file => file.type === 'video'),
      documents: files.filter(file => !file.type.startsWith('image') && !file.type.startsWith('video'))
    };
  };

  // Add file removal function
  const handleRemoveFile = (indexToRemove) => {
    setNewWork(prev => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove)
    }));
  };

  // Add this function to handle work deletion
  const handleDeleteWork = async (workId) => {
    if (window.confirm('Tem certeza que deseja excluir esta obra?')) {
      try {
        await deleteDoc(doc(db, 'works', workId));
        setWorks(works.filter(work => work.id !== workId));
        addNotification('Obra excluída com sucesso');
      } catch (error) {
        console.error('Error deleting work:', error);
        alert('Erro ao excluir obra');
      }
    }
  };

  // Atualize a renderização dos arquivos nos detalhes
  const renderFilePreview = (file) => {
    if (file.type.startsWith('image/')) {
      return <img src={file.url} alt={file.name} />;
    } else if (file.type.startsWith('video/')) {
      return <video src={file.url} controls />;
    } else {
      return <FiFile size={24} />;
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
        <div className="nav-right">
          <div className="notification-wrapper">
            <button 
              className="notification-btn"
              onClick={handleNotificationClick}
            >
              <FiBell />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="notification-badge">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notificações</h3>
                  <button 
                    className="close-btn"
                    onClick={() => setShowNotifications(false)}
                  >
                    <FiX />
                  </button>
                </div>
                <div className="notifications-list">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      >
                        <p>{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-notifications">Nenhuma notificação</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <section className="metrics-grid">
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
            {filteredWorks.map(work => (
              <React.Fragment key={work.id}>
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
                      onClick={() => handleDeleteWork(work.id)}
                    >
                      <FiX />
                    </button>
                  </td>
                </tr>
                {expandedWorks.has(work.id) && (
                  <tr className="details-row">
                    <td colSpan="6">
                      <div className="work-details">
                        <div className="details-content">
                          <div className="details-section">
                            <h4>Descrição</h4>
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
                            <div className="details-section files-container">
                              {/* Seção de Fotografias */}
                              {work.files.filter(file => file.type === 'image').length > 0 && (
                                <div className="file-type-section">
                                  <h4>Fotografias</h4>
                                  <div className="files-grid">
                                    {work.files
                                      .filter(file => file.type === 'image')
                                      .map((file, index) => (
                                        <div key={index} className="file-preview-item">
                                          <img src={file.data} alt={file.name} />
                                          <div className="file-preview-overlay">
                                            <span className="file-name">{file.name}</span>
                                            <a 
                                              href={file.data}
                                              download={file.name}
                                              className="download-btn"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <FiDownload /> Download
                                            </a>
                                          </div>
                                        </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Seção de Vídeos */}
                              {work.files.filter(file => file.type === 'video').length > 0 && (
                                <div className="file-type-section">
                                  <h4>Vídeos</h4>
                                  <div className="files-grid">
                                    {work.files
                                      .filter(file => file.type === 'video')
                                      .map((file, index) => (
                                        <div key={index} className="file-preview-item">
                                          <video src={file.data} controls />
                                          <div className="file-preview-overlay">
                                            <span className="file-name">{file.name}</span>
                                            <a 
                                              href={file.data}
                                              download={file.name}
                                              className="download-btn"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <FiDownload /> Download
                                            </a>
                                          </div>
                                        </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Seção de Documentos */}
                              {work.files.filter(file => file.type !== 'image' && file.type !== 'video').length > 0 && (
                                <div className="file-type-section">
                                  <h4>Documentos</h4>
                                  <div className="files-grid">
                                    {work.files
                                      .filter(file => file.type !== 'image' && file.type !== 'video')
                                      .map((file, index) => (
                                        <div key={index} className="file-preview-item document">
                                          <FiFile size={24} />
                                          <span className="file-name">{file.name}</span>
                                          <a 
                                            href={file.data}
                                            download={file.name}
                                            className="download-btn"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <FiDownload /> Download
                                          </a>
                                        </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
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
                  <label>Arquivos da Obra</label>
                  <div className="file-input-container">
                    {newWork.files.length > 0 && (
                      <div className="files-preview-sections">
                        {/* Images Section */}
                        {groupFilesByType(newWork.files).images.length > 0 && (
                          <div className="files-section">
                            <h4>Fotografias</h4>
                            <div className="files-grid">
                              {groupFilesByType(newWork.files).images.map((file, index) => (
                                <div key={index} className="file-preview-item">
                                  <button 
                                    type="button" 
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(newWork.files.indexOf(file))}
                                  >
                                    <FiX />
                                  </button>
                                  <div className="file-preview">
                                    <img src={file.data} alt={file.name} />
                                    <div className="file-preview-overlay">
                                      <span className="file-name">{file.name}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Videos Section */}
                        {groupFilesByType(newWork.files).videos.length > 0 && (
                          <div className="files-section">
                            <h4>Vídeos</h4>
                            <div className="files-grid">
                              {groupFilesByType(newWork.files).videos.map((file, index) => (
                                <div key={index} className="file-preview-item">
                                  <button 
                                    type="button" 
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(newWork.files.indexOf(file))}
                                  >
                                    <FiX />
                                  </button>
                                  <div className="file-preview">
                                    <video src={file.data} controls />
                                    <div className="file-preview-overlay">
                                      <span className="file-name">{file.name}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Documents Section */}
                        {groupFilesByType(newWork.files).documents.length > 0 && (
                          <div className="files-section">
                            <h4>Documentos</h4>
                            <div className="files-grid">
                              {groupFilesByType(newWork.files).documents.map((file, index) => (
                                <div key={index} className="file-preview-item document">
                                  <button 
                                    type="button" 
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(newWork.files.indexOf(file))}
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
                      <span>Imagens, Vídeos, PDF, DOC, XLS</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  {editingWork ? 'Confirmar Alterações' : 'Criar Obra'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowNewWorkForm(false);
                    setEditingWork(null);
                  }}
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
