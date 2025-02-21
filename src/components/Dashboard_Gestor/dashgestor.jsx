import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './dashgestor.css';
import { FiPlusCircle, FiFilter, FiSearch, FiBell, FiEdit2, FiEye, FiCheck, FiX, FiCalendar, FiUpload, FiArrowLeft, FiFile } from 'react-icons/fi';
import { useAuth } from '../../contexts/auth';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function DashGestor() {
  const { user } = useAuth();
  const [showNewWorkForm, setShowNewWorkForm] = useState(false);
  const [expandedWorks, setExpandedWorks] = useState([]);
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
    location: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pendente',
    files: []
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
    setExpandedWorks(prevExpanded => {
      if (prevExpanded.includes(workId)) {
        return prevExpanded.filter(id => id !== workId);
      } else {
        return [...prevExpanded, workId];
      }
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
      files: work.files || [] // Ensure files array exists
    });
    setShowNewWorkForm(true);
  };

  const handleComplete = (workId) => {
    const work = works.find(w => w.id === workId);
    handleStatusChange(workId, 'Concluído');
    addNotification(`Obra '${work.title}' foi concluída`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingWork) {
      // Handle update
      try {
        // Your update logic here
        await updateWork(editingWork.id, newWork);
        setShowNewWorkForm(false);
        setEditingWork(null);
      } catch (error) {
        console.error('Error updating work:', error);
      }
    } else {
      // Handle create new
      try {
        // Your create logic here
        await createWork(newWork);
        setShowNewWorkForm(false);
      } catch (error) {
        console.error('Error creating work:', error);
      }
    }
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
            size: file.size,
            data: reader.result
          }]
        }));
      };
      reader.readAsDataURL(file);
    });
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
      documents: files.filter(file => file.type === 'application')
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
                      <span className="location">{work.location}</span>
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
                  className={work.status === 'Concluído' ? 'concluida' : ''}
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
                  <td className="actions-cell">
                    <button 
                      className={`action-btn ${expandedWorks.includes(work.id) ? 'active' : ''}`}
                      title="Ver detalhes"
                      onClick={() => handleViewDetails(work.id)}
                    >
                      <FiEye />
                    </button>
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
                {expandedWorks.includes(work.id) && (
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
                            <p>{work.location}</p>
                          </div>

                          {work.files && work.files.length > 0 && (
                            <div className="details-section">
                              <h4>Arquivos</h4>
                              <div className="details-files-grid">
                                {work.files.map((file, index) => (
                                  <div key={index} className="details-file-item">
                                    {file.type === 'image' && (
                                      <div className="file-preview">
                                        <img src={file.data} alt={file.name} />
                                        <a href={file.data} download={file.name} className="download-btn">
                                          Download
                                        </a>
                                      </div>
                                    )}
                                    {file.type === 'video' && (
                                      <div className="file-preview">
                                        <video src={file.data} controls />
                                        <a href={file.data} download={file.name} className="download-btn">
                                          Download
                                        </a>
                                      </div>
                                    )}
                                    {file.type === 'application' && (
                                      <div className="file-preview document">
                                        <FiFile size={24} />
                                        <span>{file.name}</span>
                                        <a href={file.data} download={file.name} className="download-btn">
                                          Download
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="details-section">
                            <h4>Status</h4>
                            <div className="status-selector">
                              <button
                                className={`status-btn ${work.status === 'Pendente' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(work.id, 'Pendente')}
                              >
                                Pendente
                              </button>
                              <button
                                className={`status-btn ${work.status === 'Em Andamento' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(work.id, 'Em Andamento')}
                              >
                                Em Andamento
                              </button>
                              <button
                                className={`status-btn ${work.status === 'Concluído' ? 'active' : ''}`}
                                onClick={() => handleStatusChange(work.id, 'Concluído')}
                              >
                                Concluído
                              </button>
                            </div>
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
                  <input
                    type="text"
                    required
                    value={newWork.location}
                    onChange={(e) => setNewWork({...newWork, location: e.target.value})}
                    placeholder="Ex: Bloco A - Térreo"
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
                                  <img src={file.data} alt={file.name} />
                                  <div className="file-preview-overlay">
                                    <span className="file-name">{file.name}</span>
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
                                  <video src={file.data} controls />
                                  <div className="file-preview-overlay">
                                    <span className="file-name">{file.name}</span>
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
