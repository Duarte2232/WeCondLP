import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, deleteDoc, arrayUnion } from 'firebase/firestore';
import { FiEdit2, FiEye, FiSearch, FiFilter, FiX, FiCheck, FiArrowLeft, FiFile, FiUpload, FiDownload, FiFileText, FiTrash2 } from 'react-icons/fi';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { CLOUDINARY_CONFIG } from '../../config/cloudinary';
import { uploadToCloudinary, uploadToCloudinaryWithSignature } from '../../services/cloudinary.service.js';
import './dashadmin.css';
import LoadingAnimation from '../LoadingAnimation/LoadingAnimation';
import emailjs from 'emailjs-com';

function DashAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });
  const [editingWork, setEditingWork] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newWork, setNewWork] = useState({
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
    date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrcamentoModal, setShowOrcamentoModal] = useState(false);
  const [selectedWorkForOrcamento, setSelectedWorkForOrcamento] = useState(null);
  const [newOrcamento, setNewOrcamento] = useState({
    empresa: '',
    valor: '',
    documento: null
  });

  // Verificar se é o admin autorizado
  useEffect(() => {
    const ADMIN_EMAIL = "wecondlda@gmail.com"; // Substitua pelo email do admin desejado
    if (user?.email !== ADMIN_EMAIL) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Carregar todos os usuários e suas obras
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersData = [];

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          
          // Carregar obras do usuário
          const worksRef = collection(db, 'works');
          const q = query(worksRef, where('userEmail', '==', userData.email));
          const worksSnapshot = await getDocs(q);
          
          const works = worksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          usersData.push({
            id: userDoc.id,
            ...userData,
            works
          });
        }

        setUsers(usersData);
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        setIsLoading(false);
      }
    };

    if (user?.email) {
      loadUsers();
    }
  }, [user]);

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !filters.role || user.role === filters.role;

    const hasMatchingWorks = user.works?.some(work => {
      return !filters.status || work.status === filters.status;
    });

    return matchesSearch && matchesRole && (filters.status ? hasMatchingWorks : true);
  });

  // Função para atualizar uma obra
  const handleUpdateWork = async (workId, updatedWork, userEmail) => {
    try {
      const workRef = doc(db, 'works', workId);
      await updateDoc(workRef, updatedWork);

      // Atualizar o estado local
      setUsers(users.map(user => {
        if (user.email === userEmail) {
          return {
            ...user,
            works: user.works.map(work => 
              work.id === workId ? { ...work, ...updatedWork } : work
            )
          };
        }
        return user;
      }));

      setEditingWork(null);
    } catch (error) {
      console.error('Erro ao atualizar obra:', error);
      alert('Erro ao atualizar obra');
    }
  };

  // Função para expandir/recolher detalhes do usuário
  const toggleUserDetails = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  // Adicione esta função auxiliar no início do componente, após as declarações de state
  const groupFilesByType = (files = []) => {
    return {
      images: files.filter(file => file?.type === 'image'),
      videos: files.filter(file => file?.type === 'video'),
      documents: files.filter(file => file?.type !== 'image' && file?.type !== 'video')
    };
  };

  // Função para verificar o tamanho do arquivo (10MB = 10 * 1024 * 1024 bytes)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB em bytes

  const isFileSizeValid = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`O arquivo ${file.name} excede o limite de 10MB`);
      return false;
    }
    return true;
  };

  // Função unificada para upload de arquivos
  const uploadFile = async (file) => {
    if (!isFileSizeValid(file)) return null;

    const storage = getStorage();
    const fileName = `files/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        name: file.name,
        type: file.type.split('/')[0], // 'image', 'video', 'application', etc
        url: downloadURL,
        path: fileName,
        size: file.size
      };
    } catch (error) {
      console.error('Erro no upload do arquivo:', error);
      alert(`Erro ao fazer upload de ${file.name}`);
      return null;
    }
  };

  // Função para lidar com a seleção de arquivos
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const uploadPromises = files.map(uploadFile);

    try {
      const uploadedFiles = await Promise.all(uploadPromises);
      // Filtra arquivos que falharam no upload (null)
      const validFiles = uploadedFiles.filter(file => file !== null);

      setEditingWork(prev => ({
        ...prev,
        files: [...(prev.files || []), ...validFiles]
      }));
    } catch (error) {
      console.error('Erro no processamento dos arquivos:', error);
      alert('Ocorreu um erro ao processar alguns arquivos');
    }
  };

  // Função para remover arquivo
  const handleRemoveFile = async (fileToRemove) => {
    try {
      // Remove do Storage se tiver path
      if (fileToRemove.path) {
        const storage = getStorage();
        const fileRef = ref(storage, fileToRemove.path);
        await deleteObject(fileRef);
      }

      // Atualiza o estado removendo o arquivo
      setEditingWork(prev => ({
        ...prev,
        files: prev.files.filter(file => file.url !== fileToRemove.url)
      }));
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      alert('Erro ao remover arquivo');
    }
  };

  // No JSX para exibir arquivos
  const renderFilePreview = (file) => {
    switch (file.type) {
      case 'image':
        return (
          <div className="file-preview">
            <img src={file.url} alt={file.name} />
            <div className="file-preview-overlay">
              <span className="file-name">{file.name}</span>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="file-preview">
            <video src={file.url} controls />
            <div className="file-preview-overlay">
              <span className="file-name">{file.name}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="file-preview document">
            <FiFile size={24} />
            <span className="file-name">{file.name}</span>
          </div>
        );
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
        setUsers(prevUsers => prevUsers.map(user => {
          if (user.email === workData.userEmail) {
            return {
              ...user,
              works: [...(user.works || []), { ...workData, id: workRef.id }]
            };
          }
          return user;
        }));
        alert('Obra criada com sucesso!');
      } else {
        // Lógica para atualizar obra existente
        const workRef = doc(db, 'works', editingWork.id);
        const updateData = {
          ...newWork,
          updatedAt: serverTimestamp()
        };

        await updateDoc(workRef, updateData);
        
        setUsers(prevUsers => prevUsers.map(user => {
          if (user.email === updateData.userEmail) {
            return {
              ...user,
              works: user.works.map(work => 
                work.id === editingWork.id ? { ...updateData, id: editingWork.id } : work
              )
            };
          }
          return user;
        }));
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
        date: new Date().toISOString().split('T')[0]
      });
      
      setShowEditModal(false);
      setEditingWork(null);
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      alert(error.message || 'Erro ao salvar obra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (work) => {
    try {
      setEditingWork(work);
      setNewWork(work);
      setShowEditModal(true);
    } catch (error) {
      console.error('Erro ao editar:', error);
      alert('Erro ao editar obra: ' + error.message);
    }
  };

  // Função para lidar com o upload do documento
  const handleDocumentoUpload = async (file) => {
    if (!file) return null;
    
    try {
      console.log('Iniciando upload do arquivo:', file.name);
      
      // Primeiro tenta o método normal com resource_type=raw
      try {
        console.log('Tentando método padrão para raw upload...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('resource_type', 'raw');
  
        console.log('Dados do upload:', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadPreset: CLOUDINARY_CONFIG.uploadPreset
        });
  
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/raw/upload`,
          {
            method: 'POST',
            body: formData
          }
        );
  
        const responseText = await response.text();
        console.log('Resposta bruta do servidor:', responseText);
  
        if (!response.ok) {
          throw new Error(`Falha no upload: ${response.status} - ${responseText}`);
        }
  
        const data = JSON.parse(responseText);
        console.log('Upload bem-sucedido (método padrão):', data);
  
        return {
          url: data.secure_url,
          publicId: data.public_id,
          nome: file.name,
          formato: file.name.split('.').pop().toLowerCase()
        };
      } catch (uploadError) {
        console.error('Erro no método padrão para raw upload:', uploadError);
        
        // Se falhar, tenta o uploadToCloudinary normal
        console.log('Tentando uploadToCloudinary padrão...');
        try {
          const result = await uploadToCloudinary(file, 'auto');
          console.log('Upload bem-sucedido (uploadToCloudinary):', result);
          
          return {
            url: result.url,
            publicId: result.publicId,
            nome: file.name,
            formato: file.name.split('.').pop().toLowerCase()
          };
        } catch (cloudinaryError) {
          console.error('Erro no uploadToCloudinary:', cloudinaryError);
          
          // Se ainda falhar, tenta com assinatura
          console.log('Tentando método com assinatura...');
          const result = await uploadToCloudinaryWithSignature(file, 'auto');
          console.log('Upload bem-sucedido (método assinado):', result);
          
          return {
            url: result.url,
            publicId: result.publicId,
            nome: file.name,
            formato: file.name.split('.').pop().toLowerCase()
          };
        }
      }
    } catch (error) {
      console.error('Todos os métodos de upload falharam:', error);
      throw error;
    }
  };

  // Função separada para envio de email
  const sendNotificationEmail = async (workData) => {
    try {
      console.log('1. Iniciando envio de email');
      console.log('2. Dados completos da obra:', workData);
      
      // Buscar os dados do usuário dono da obra
      const userRef = doc(db, 'users', workData.userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      console.log('3. Dados do usuário:', userData);

      const templateParams = {
        to_email: userData.email,    // Email do dono da obra
        to_name: userData.name,      // Nome do dono da obra
        obra_title: workData.title,
        obra_location: `${workData.location.morada}, ${workData.location.cidade}`
      };

      console.log('4. Parâmetros do email:', templateParams);

      await emailjs.send(
        "service_pb8u46m",
        "template_20a3axt",
        templateParams,
        "Gb88AoliqUfgkEuJ1"
      );

      console.log('5. Email enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  };

  // Função para adicionar orçamento
  const handleAddOrcamento = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let documentoData = null;
      if (newOrcamento.documento) {
        documentoData = await handleDocumentoUpload(newOrcamento.documento);
      }

      const orcamentoData = {
        empresa: newOrcamento.empresa,
        valor: newOrcamento.valor,
        data: new Date().toISOString(),
        aceito: false,
        visualizado: false,
        workId: selectedWorkForOrcamento.id,
        documento: documentoData ? {
          url: documentoData.url,
          nome: documentoData.nome,
          formato: documentoData.formato,
          publicId: documentoData.publicId
        } : null
      };

      // Adicionar à coleção ObrasOrçamentos
      await addDoc(collection(db, 'ObrasOrçamentos'), orcamentoData);

      // Atualizar a flag hasOrcamentos na obra
      const workRef = doc(db, 'ObrasPedidos', selectedWorkForOrcamento.id);
      await updateDoc(workRef, {
        hasOrcamentos: true
      });

      // Tenta enviar o email passando apenas workData
      await sendNotificationEmail(workData);

      setNewOrcamento({ empresa: '', valor: '', documento: null });
      setShowOrcamentoModal(false);
      setIsLoading(false);
      
      alert('Orçamento adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar orçamento:', error);
      alert('Erro ao adicionar orçamento: ' + error.message);
      setIsLoading(false);
    }
  };

  // Adicione esta nova função
  const handleRemoveOrcamento = async (workId, orcamentoIndex) => {
    if (!window.confirm('Tem certeza que deseja remover este orçamento?')) {
      return;
    }

    try {
      const workRef = doc(db, 'works', workId);
      const workDoc = await getDoc(workRef);
      const workData = workDoc.data();
      
      if (!workData.orcamentos) return;

      // Remove o orçamento do array
      const newOrcamentos = workData.orcamentos.filter((_, index) => index !== orcamentoIndex);

      // Atualiza no Firestore
      await updateDoc(workRef, {
        orcamentos: newOrcamentos
      });

      // Atualiza o estado local
      setUsers(prevUsers => 
        prevUsers.map(user => ({
          ...user,
          works: user.works?.map(work => 
            work.id === workId
              ? { ...work, orcamentos: newOrcamentos }
              : work
          )
        }))
      );

      alert('Orçamento removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover orçamento:', error);
      alert('Erro ao remover orçamento: ' + error.message);
    }
  };

  // Adicionar a função de deletar obra
  const handleDelete = async (workId) => {
    if (!workId) {
      console.error('ID da obra não fornecido');
      return;
    }

    try {
      if (window.confirm('Tem certeza que deseja excluir esta obra?')) {
        setIsLoading(true);
        
        const workRef = doc(db, 'works', workId);
        await deleteDoc(workRef);
        
        setUsers(prevUsers => prevUsers.map(user => ({
          ...user,
          works: user.works?.filter(work => work.id !== workId)
        })));
      }
    } catch (error) {
      console.error('Erro ao deletar obra:', error);
      alert('Erro ao deletar obra: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Função de download atualizada
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

  return (
    <div className="admin-dashboard-container">
      <nav className="admin-top-nav">
        <div className="nav-left">
          <button className="back-button" onClick={() => navigate(-1)}>
            <FiArrowLeft />
          </button>
          <h1>Painel Administrativo</h1>
        </div>
      </nav>

      <section className="filters-section">
        <div className="search-bar">
          <FiSearch />
          <input
            type="text"
            placeholder="Pesquisar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="filter-select"
        >
          <option value="">Todos os papéis</option>
          <option value="gestor">Gestor</option>
          <option value="tecnico">Técnico</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">Todos os status</option>
          <option value="Pendente">Pendente</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Concluído">Concluído</option>
        </select>
      </section>

      <section className="admin-section">
        {isLoading ? (
          <div className="loading-container">
            <LoadingAnimation />
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Função</th>
                <th>Obras</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <React.Fragment key={`user-${user.id}`}>
                  <tr 
                    className="user-row"
                    onClick={() => toggleUserDetails(user.id)}
                  >
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.works?.length || 0} obras</td>
                    <td>
                      <button 
                        className="action-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUserDetails(user.id);
                        }}
                      >
                        {expandedUser === user.id ? <FiX /> : <FiEye />}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedUser === user.id && (
                    <tr>
                      <td colSpan="5">
                        <div className="user-works">
                          <h3>Obras de {user.name}</h3>
                          {user.works?.map(work => (
                            <div key={`work-${work.id}`} className="work-card">
                              <div className="work-header">
                                <h4 className="work-title">{work.title}</h4>
                                <span className={`work-status status-${work.status.toLowerCase().replace(' ', '-')}`}>
                                  {work.status}
                                </span>
                              </div>
                              <p>{work.description}</p>
                              <div className="work-details">
                                <p><strong>Categoria:</strong> {work.category}</p>
                                <p><strong>Prioridade:</strong> {work.priority}</p>
                                <p><strong>Local:</strong> {work.location.morada}, {work.location.cidade}</p>
                                <p><strong>Data:</strong> {new Date(work.date).toLocaleDateString()}</p>
                              </div>
                              
                              {/* Seção de documentos da obra */}
                              <div className="work-files">
                                <h4>Documentos da Obra</h4>
                                {work.files && work.files.length > 0 ? (
                                  <div className="files-grid">
                                    {work.files.map((file, fileIndex) => (
                                      <div key={fileIndex} className={`file-preview-item ${file.type !== 'image' && file.type !== 'video' ? 'document' : ''}`}>
                                        {file.type === 'image' ? (
                                          <div className="file-preview">
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
                                        ) : file.type === 'video' ? (
                                          <div className="file-preview">
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
                                        ) : (
                                          <div className="file-preview document">
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
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="no-files">Nenhum documento disponível para esta obra</p>
                                )}
                              </div>
                              
                              <div className="work-actions">
                                <button
                                  className="action-button edit-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(work);
                                  }}
                                >
                                  <FiEdit2 /> Editar
                                </button>
                                <button
                                  className="action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateWork(work.id, { status: 'Em Andamento' }, user.email);
                                  }}
                                >
                                  <FiCheck /> Marcar Em Andamento
                                </button>
                                <button
                                  className="action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateWork(work.id, { status: 'Concluído' }, user.email);
                                  }}
                                >
                                  <FiCheck /> Marcar Concluído
                                </button>
                                <button
                                  className="action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWorkForOrcamento(work);
                                    setShowOrcamentoModal(true);
                                  }}
                                >
                                  <FiFileText /> Adicionar Orçamento
                                </button>
                                <button
                                  className="action-button delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(work.id);
                                  }}
                                >
                                  <FiX /> Excluir
                                </button>
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
                                          <a 
                                            href={orcamento.documento.url}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="orcamento-download"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleFileDownload(orcamento.documento, orcamento.documento.nome);
                                            }}
                                          >
                                            <FiDownload /> Download
                                          </a>
                                        )}
                                        {orcamento.aceito && (
                                          <span className="orcamento-aceito-badge">Aceite</span>
                                        )}
                                        <button
                                          className="remove-orcamento-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveOrcamento(work.id, index);
                                          }}
                                        >
                                          <FiTrash2 /> Remover
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="no-orcamentos">Nenhum orçamento disponível</p>
                                )}
                              </div>
                            </div>
                          ))}
                          {(!user.works || user.works.length === 0) && (
                            <p>Este usuário não possui obras cadastradas.</p>
                          )}
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

      {/* Modal de Edição */}
      {showEditModal && editingWork && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Editar Obra</h2>
              <button className="close-btn" onClick={() => {
                setShowEditModal(false);
                setEditingWork(null);
              }}>
                <FiX />
              </button>
            </div>
            <form className="edit-work-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={newWork.title}
                  onChange={(e) => setNewWork({...newWork, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={newWork.description}
                  onChange={(e) => setNewWork({...newWork, description: e.target.value})}
                  required
                />
              </div>

              {/* Localização */}
              <div className="form-group">
                <label>Localização</label>
                <div className="location-fields">
                  <input
                    type="text"
                    placeholder="Morada"
                    value={newWork.location?.morada || ''}
                    onChange={(e) => setNewWork({
                      ...newWork,
                      location: { ...newWork.location, morada: e.target.value }
                    })}
                    required
                  />
                  <div className="location-row">
                    <input
                      type="text"
                      placeholder="Código Postal"
                      value={newWork.location?.codigoPostal || ''}
                      onChange={(e) => setNewWork({
                        ...newWork,
                        location: { ...newWork.location, codigoPostal: e.target.value }
                      })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={newWork.location?.cidade || ''}
                      onChange={(e) => setNewWork({
                        ...newWork,
                        location: { ...newWork.location, cidade: e.target.value }
                      })}
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Andar/Referência"
                    value={newWork.location?.andar || ''}
                    onChange={(e) => setNewWork({
                      ...newWork,
                      location: { ...newWork.location, andar: e.target.value }
                    })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Categoria</label>
                <select
                  value={newWork.category}
                  onChange={(e) => setNewWork({...newWork, category: e.target.value})}
                  required
                >
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

              {/* Arquivos */}
              <div className="form-group">
                <label>Arquivos</label>
                {newWork?.files && (
                  <div className="files-container">
                    <div className="files-grid">
                      {newWork.files.map((file, index) => (
                        <div key={index} className="file-preview-item">
                          <button 
                            type="button" 
                            className="remove-file-btn"
                            onClick={() => handleRemoveFile(file)}
                          >
                            <FiX />
                          </button>
                          
                          {file.type === 'image' ? (
                            <div className="file-preview">
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
                          ) : file.type === 'video' ? (
                            <div className="file-preview">
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
                          ) : (
                            <div className="file-preview document">
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
                          )}
                        </div>
                      ))}
                    </div>
                    
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
                )}
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoadingAnimation /> : 'Atualizar Obra'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowEditModal(false);
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

      {/* Modal de Orçamento */}
      {showOrcamentoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Adicionar Orçamento</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowOrcamentoModal(false);
                  setNewOrcamento({ empresa: '', valor: '', documento: null });
                }}
              >
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleAddOrcamento} className="orcamento-form">
              <div className="form-group">
                <label>Empresa</label>
                <input
                  type="text"
                  value={newOrcamento.empresa}
                  onChange={(e) => setNewOrcamento({
                    ...newOrcamento,
                    empresa: e.target.value
                  })}
                  required
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="form-group">
                <label>Valor (€)</label>
                <input
                  type="text"
                  value={newOrcamento.valor}
                  onChange={(e) => setNewOrcamento({
                    ...newOrcamento,
                    valor: e.target.value
                  })}
                  required
                  placeholder="Digite o valor"
                />
              </div>

              <div className="form-group">
                <label>Documento do Orçamento (PDF, DOC, DOCX)</label>
                <div className="file-input-container">
                  <input
                    type="file"
                    onChange={(e) => setNewOrcamento({
                      ...newOrcamento,
                      documento: e.target.files[0]
                    })}
                    accept=".pdf,.doc,.docx"
                    className="file-input"
                  />
                  <div className="file-input-text">
                    <FiUpload />
                    <p>
                      {newOrcamento.documento
                        ? newOrcamento.documento.name
                        : 'Clique ou arraste o documento aqui (PDF, DOC, DOCX)'}
                    </p>
                    <span className="file-type-hint">Apenas documentos PDF, DOC ou DOCX</span>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <LoadingAnimation /> : 'Adicionar Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashAdmin;
