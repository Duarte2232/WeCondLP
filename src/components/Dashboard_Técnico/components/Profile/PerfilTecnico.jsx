import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../../../services/firebase.jsx';
import { FiUpload, FiCheck, FiArrowLeft, FiUser, FiStar, FiFile, FiEye, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { CLOUDINARY_CONFIG } from '../../../../config/cloudinary';
import { uploadToCloudinary, uploadToCloudinaryWithSignature, deleteFromCloudinary } from '../../../../services/cloudinary.service.js';
import './PerfilTecnico.css';

const PerfilTecnico = ({ onProfileUpdate }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    empresaNome: '',
    emailRegistro: '',
    empresaTelefone: '',
    empresaEmail: '',
    empresaNIF: '',
    especialidades: []
  });
  const [documentos, setDocumentos] = useState({
    seguroRC: null,
    seguroTrabalho: null,
    alvara: null,
    declaracaoFinancas: null,
    declaracaoSS: null,
    cartaoEngenheiro: null
  });
  const [uploadStatus, setUploadStatus] = useState({});
  const [logoUrl, setLogoUrl] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [avaliacoes, setAvaliacoes] = useState([]);
  const navigate = useNavigate();

  const documentosNecessarios = [
    {
      id: 'seguroRC',
      nome: 'Seguro de responsabilidade civil profissional',
      descricao: 'Upload do documento de seguro de responsabilidade civil'
    },
    {
      id: 'seguroTrabalho',
      nome: 'Seguro de acidentes de trabalho',
      descricao: 'Upload do seguro de trabalho'
    },
    {
      id: 'alvara',
      nome: 'Cópia de Alvará',
      descricao: 'Upload da cópia do alvará'
    },
    {
      id: 'declaracaoFinancas',
      nome: 'Declaração de Não dívida das Finanças',
      descricao: 'Upload da declaração das finanças'
    },
    {
      id: 'declaracaoSS',
      nome: 'Declaração de Não dívida da Segurança Social',
      descricao: 'Upload da declaração da segurança social'
    },
    {
      id: 'cartaoEngenheiro',
      nome: 'Cópia do Cartão do Engenheiro',
      descricao: 'Upload da cópia do cartão'
    }
  ];

  const categoriasObras = [
    'Infiltração',
    'Fissuras e rachaduras',
    'Canalização',
    'Jardinagem',
    'Fiscalização',
    'Reabilitação de Fachada',
    'Eletricidade',
    'Construção',
    'Pintura'
  ];

  const auth = getAuth();
  const storage = getStorage();

  useEffect(() => {
    const carregarDadosUsuario = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          const data = userDoc.data();
          setUserData(data);
          
          if (data) {
            setFormData({
              empresaNome: data.empresaNome || '',
              emailRegistro: auth.currentUser.email || '',
              empresaTelefone: data.empresaTelefone || '',
              empresaEmail: data.empresaEmail || '',
              empresaNIF: data.empresaNIF || '',
              especialidades: data.especialidades || []
            });
            setDocumentos(data.documentos || {});
            setLogoUrl(data.logoUrl || '');
            setProfilePhotoUrl(data.profilePhoto?.url || '');
          }
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    carregarDadosUsuario();
  }, [auth.currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEspecialidadeToggle = (especialidade) => {
    setFormData(prev => {
      const especialidades = prev.especialidades || [];
      if (especialidades.includes(especialidade)) {
        return {
          ...prev,
          especialidades: especialidades.filter(esp => esp !== especialidade)
        };
      } else {
        return {
          ...prev,
          especialidades: [...especialidades, especialidade]
        };
      }
    });
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadStatus(prev => ({ ...prev, profilePhoto: 'uploading' }));

      // Delete previous profile photo from Cloudinary if exists
      if (userData?.profilePhoto?.publicId) {
        try {
          // Try to determine the correct resource type, but profile photos are typically images
          const resourceType = 'image';
          console.log(`Tentando deletar foto de perfil anterior. PublicId: ${userData.profilePhoto.publicId}`);
          const deleteResult = await deleteFromCloudinary(userData.profilePhoto.publicId, resourceType);
          
          if (deleteResult) {
            console.log('Foto de perfil anterior deletada do Cloudinary com sucesso');
          } else {
            console.warn('Possível falha ao deletar foto de perfil anterior do Cloudinary');
          }
        } catch (deleteError) {
          console.error('Erro ao deletar foto de perfil anterior do Cloudinary:', deleteError);
          // Continue even if there's an error in deletion
        }
      }

      // Upload to Cloudinary
      let uploadResult;

      // Detectar tipo de recurso para upload baseado na extensão do arquivo
      const resourceType = file.type.startsWith('image/') ? 'image' : 'auto';
      
      try {
        // Primeiro tenta o método normal
        console.log(`Tentando upload da foto de perfil com método padrão (tipo: ${resourceType})...`);
        uploadResult = await uploadToCloudinary(file, resourceType);
        console.log('Upload da foto de perfil bem sucedido (método padrão)');
      } catch (uploadError) {
        console.error('Erro no upload padrão da foto de perfil:', uploadError);
        console.log('Tentando método alternativo com assinatura para a foto de perfil...');
        
        // Se falhar, tenta o método com assinatura
        uploadResult = await uploadToCloudinaryWithSignature(file, resourceType);
        console.log('Upload da foto de perfil bem sucedido (método assinado)');
      }
      
      const { url, publicId } = uploadResult;
      
      setProfilePhotoUrl(url);
      setUploadStatus(prev => ({ ...prev, profilePhoto: 'success' }));

      // Update user document in Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        profilePhoto: {
          url: url,
          publicId: publicId,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Todos os métodos de upload da foto de perfil falharam:', error);
      setUploadStatus(prev => ({ ...prev, profilePhoto: 'error' }));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadStatus(prev => ({ ...prev, logo: 'uploading' }));

      // Delete previous logo from Cloudinary if exists
      if (userData?.logoPublicId) {
        try {
          // Try to determine the correct resource type, but logos are typically images
          const resourceType = 'image';
          console.log(`Tentando deletar logo anterior. PublicId: ${userData.logoPublicId}`);
          const deleteResult = await deleteFromCloudinary(userData.logoPublicId, resourceType);
          
          if (deleteResult) {
            console.log('Logo anterior deletado do Cloudinary com sucesso');
          } else {
            console.warn('Possível falha ao deletar logo anterior do Cloudinary');
          }
        } catch (deleteError) {
          console.error('Erro ao deletar logo anterior do Cloudinary:', deleteError);
          // Continue even if there's an error in deletion
        }
      }

      // Upload to Cloudinary
      let uploadResult;

      // Detectar tipo de recurso para upload baseado na extensão do arquivo
      const resourceType = file.type.startsWith('image/') ? 'image' : 'auto';
      
      try {
        // Primeiro tenta o método normal
        console.log(`Tentando upload do logo com método padrão (tipo: ${resourceType})...`);
        uploadResult = await uploadToCloudinary(file, resourceType);
        console.log('Upload do logo bem sucedido (método padrão)');
      } catch (uploadError) {
        console.error('Erro no upload padrão do logo:', uploadError);
        console.log('Tentando método alternativo com assinatura para o logo...');
        
        // Se falhar, tenta o método com assinatura
        uploadResult = await uploadToCloudinaryWithSignature(file, resourceType);
        console.log('Upload do logo bem sucedido (método assinado)');
      }
      
      const { url, publicId } = uploadResult;
      
      setLogoUrl(url);
      setUploadStatus(prev => ({ ...prev, logo: 'success' }));

      // Update user document in Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        logoUrl: url,
        logoPublicId: publicId
      });
    } catch (error) {
      console.error('Todos os métodos de upload do logo falharam:', error);
      setUploadStatus(prev => ({ ...prev, logo: 'error' }));
    }
  };

  // Utility function to determine Cloudinary resource type based on file extension or URL
  const determineResourceType = (fileName, fileUrl) => {
    // Default to auto if no information available
    if (!fileName && !fileUrl) return 'auto';
    
    // Check by filename extension
    if (fileName) {
      const extension = fileName.split('.').pop().toLowerCase();
      // Image types
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico'].includes(extension)) {
        return 'image';
      }
      // Video types
      if (['mp4', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg'].includes(extension)) {
        return 'video';
      }
      // Consider all other types as raw (documents, text files, etc.)
      return 'raw';
    }
    
    // Try to determine from URL if available
    if (fileUrl) {
      if (fileUrl.includes('/image/')) return 'image';
      if (fileUrl.includes('/video/')) return 'video';
      if (fileUrl.includes('/raw/')) return 'raw';
    }
    
    // Default to 'auto' if can't determine
    return 'auto';
  };

  const handleFileUpload = async (e, documentoId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadStatus(prev => ({ ...prev, [documentoId]: 'uploading' }));

      // Se já existe um documento, exclui do Cloudinary antes de fazer novo upload
      if (documentos[documentoId]?.publicId) {
        try {
          // Detectar o tipo de recurso com base na extensão do arquivo ou URL
          const fileName = documentos[documentoId].nome || '';
          const fileUrl = documentos[documentoId].url || '';
          const resourceType = determineResourceType(fileName, fileUrl);
          
          console.log(`Detectado tipo de recurso para exclusão: ${resourceType} para o documento ${documentoId}`);
          const deleteResult = await deleteFromCloudinary(documentos[documentoId].publicId, resourceType);
          
          if (deleteResult) {
            console.log(`Documento anterior ${documentoId} deletado do Cloudinary com sucesso`);
          } else {
            console.warn(`Possível falha ao deletar documento anterior ${documentoId} do Cloudinary`);
          }
        } catch (deleteError) {
          console.error(`Erro ao deletar documento anterior do Cloudinary: ${deleteError}`);
          // Continue mesmo se houver erro na exclusão
        }
      }

      // Determine resource type for upload based on file type
      let resourceType = 'auto';
      if (file.type.startsWith('image/')) {
        resourceType = 'image';
      } else if (file.type.startsWith('video/')) {
        resourceType = 'video';
      } else {
        // For documents, PDFs, etc, use 'raw'
        resourceType = 'raw';
      }
      
      console.log(`Tipo de arquivo para upload: ${file.type}, usando resource type: ${resourceType}`);

      // Upload to Cloudinary
      let uploadResult;
      try {
        // Primeiro tenta o método normal
        console.log(`Tentando upload do documento ${documentoId} com método padrão (tipo: ${resourceType})...`);
        uploadResult = await uploadToCloudinary(file, resourceType);
        console.log(`Upload do documento ${documentoId} bem sucedido (método padrão)`);
      } catch (uploadError) {
        console.error(`Erro no upload padrão do documento ${documentoId}:`, uploadError);
        console.log(`Tentando método alternativo com assinatura para o documento ${documentoId}...`);
        
        // Se falhar, tenta o método com assinatura
        uploadResult = await uploadToCloudinaryWithSignature(file, resourceType);
        console.log(`Upload do documento ${documentoId} bem sucedido (método assinado)`);
      }
      
      const { url, publicId } = uploadResult;
      
      setDocumentos(prev => ({
        ...prev,
        [documentoId]: {
          nome: file.name,
          url: url,
          publicId: publicId,
          dataUpload: new Date().toISOString()
        }
      }));

      setUploadStatus(prev => ({ ...prev, [documentoId]: 'success' }));

      // Update user document in Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        [`documentos.${documentoId}`]: {
          nome: file.name,
          url: url,
          publicId: publicId,
          dataUpload: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`Todos os métodos de upload do documento ${documentoId} falharam:`, error);
      setUploadStatus(prev => ({ ...prev, [documentoId]: 'error' }));
    }
  };

  const handleDocumentDelete = async (documentoId) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) {
      return;
    }

    try {
      setUploadStatus(prev => ({ ...prev, [documentoId]: 'deleting' }));
      
      // Excluir do Cloudinary
      if (documentos[documentoId]?.publicId) {
        try {
          // Detectar o tipo de recurso usando a função utilitária
          const fileName = documentos[documentoId].nome || '';
          const fileUrl = documentos[documentoId].url || '';
          const resourceType = determineResourceType(fileName, fileUrl);
          
          console.log(`Detectado tipo de recurso para exclusão: ${resourceType} para o documento ${documentoId}`);
          const deleteResult = await deleteFromCloudinary(documentos[documentoId].publicId, resourceType);
          
          if (deleteResult) {
            console.log(`Documento ${documentoId} deletado do Cloudinary com sucesso`);
          } else {
            console.warn(`Possível falha ao deletar documento ${documentoId} do Cloudinary`);
            // Continue mesmo se houver erro na exclusão do Cloudinary
          }
        } catch (deleteError) {
          console.error(`Erro ao deletar documento do Cloudinary: ${deleteError}`);
          // Continue mesmo se houver erro na exclusão do Cloudinary
        }
      }

      // Atualizar estado local
      setDocumentos(prev => {
        const newDocumentos = { ...prev };
        delete newDocumentos[documentoId];
        return newDocumentos;
      });

      // Atualizar no Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        [`documentos.${documentoId}`]: null
      });

      setUploadStatus(prev => ({ ...prev, [documentoId]: null }));
      console.log(`Documento ${documentoId} excluído com sucesso`);

    } catch (error) {
      console.error(`Erro ao excluir o documento ${documentoId}:`, error);
      setUploadStatus(prev => ({ ...prev, [documentoId]: 'error' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      const todosDocumentosEnviados = documentosNecessarios.every(
        doc => documentos[doc.id]?.url
      );
      
      const dadosAtualizados = {
        ...formData,
        documentos,
        perfilCompleto: todosDocumentosEnviados && formData.especialidades.length > 0
      };

      await updateDoc(userRef, dadosAtualizados);

      // Call onProfileUpdate to trigger a refresh of the jobs list
      if (onProfileUpdate) {
        onProfileUpdate();
      }

      navigate('/dashtecnico');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  useEffect(() => {
    const buscarAvaliacoes = async () => {
      if (auth.currentUser) {
        try {
          const avaliacoesRef = collection(db, 'avaliacoes');
          const avaliacoesQuery = query(avaliacoesRef, where('technicianId', '==', auth.currentUser.uid));
          const avaliacoesDocs = await getDocs(avaliacoesQuery);
          const avaliacoesData = avaliacoesDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('Avaliações encontradas:', avaliacoesData);
          setAvaliacoes(avaliacoesData);
        } catch (error) {
          console.error('Erro ao buscar avaliações:', error);
        }
      }
    };

    buscarAvaliacoes();
  }, [auth.currentUser]);

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="main-content perfil-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1 className="page-title">Perfil Técnico</h1>
      </div>
      
      {avaliacoes.length > 0 && (
        <div className="perfil-resumo-avaliacao">
          <div className="resumo-classificacao">
            <div className="classificacao-valor">
              {(avaliacoes.reduce((total, avaliacao) => total + (avaliacao.rating || 0), 0) / avaliacoes.length).toFixed(1)}
            </div>
            <div className="classificacao-estrelas">
              {Array.from({ length: 5 }).map((_, index) => {
                const mediaEstrelas = avaliacoes.reduce((total, avaliacao) => total + (avaliacao.rating || 0), 0) / avaliacoes.length;
                return (
                  <FiStar 
                    key={index} 
                    className={`star-icon ${index < Math.round(mediaEstrelas) ? 'filled' : ''}`}
                  />
                );
              })}
            </div>
            <div className="classificacao-texto">
              Sua classificação média baseada em {avaliacoes.length} avaliações de clientes
            </div>
          </div>
          <div className="resumo-estatisticas">
            <div className="estatistica-item">
              <div className="estatistica-valor">{avaliacoes.filter(a => a.rating >= 4).length}</div>
              <div className="estatistica-label">Avaliações positivas</div>
            </div>
            <div className="estatistica-item">
              <div className="estatistica-valor">{avaliacoes.length}</div>
              <div className="estatistica-label">Total de avaliações</div>
            </div>
            <div className="estatistica-item">
              <div className="estatistica-valor">
                {Math.round(avaliacoes.filter(a => a.rating >= 4).length / avaliacoes.length * 100)}%
              </div>
              <div className="estatistica-label">Taxa de satisfação</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="perfil-container">
        <form onSubmit={handleSubmit}>
          <section className="section-dados-empresa">
            <h2>Dados da Empresa</h2>
            <div className="logo-upload-container">
              <div className="logo-preview">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo da empresa" className="company-logo" />
                ) : (
                  <div className="logo-placeholder">
                    <FiUpload />
                    <span>Logo da Empresa</span>
                  </div>
                )}
              </div>
              <div className="logo-upload-area">
                <input
                  type="file"
                  id="logoUpload"
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="logo-input"
                />
                <label htmlFor="logoUpload" className="logo-upload-button">
                  {logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
                </label>
                {uploadStatus.logo === 'uploading' && (
                  <span className="upload-status">Enviando...</span>
                )}
                {uploadStatus.logo === 'error' && (
                  <span className="upload-status error">Erro no upload</span>
                )}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="empresaNome">Nome da Empresa</label>
              <input
                type="text"
                id="empresaNome"
                name="empresaNome"
                value={formData.empresaNome || ''}
                onChange={handleInputChange}
                placeholder="Nome da sua empresa"
                className="campo-texto"
              />
            </div>
            <div className="form-group">
              <label htmlFor="emailRegistro">Email de Registro</label>
              <input
                type="email"
                id="emailRegistro"
                name="emailRegistro"
                value={formData.emailRegistro}
                readOnly
                className="input-readonly"
              />
            </div>
            <div className="form-group">
              <label htmlFor="empresaTelefone">Telefone</label>
              <input
                type="tel"
                id="empresaTelefone"
                name="empresaTelefone"
                value={formData.empresaTelefone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="empresaEmail">Email Comercial</label>
              <input
                type="email"
                id="empresaEmail"
                name="empresaEmail"
                value={formData.empresaEmail}
                onChange={handleInputChange}
                placeholder="empresa@email.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="empresaNIF">NIF da Empresa</label>
              <input
                type="text"
                id="empresaNIF"
                name="empresaNIF"
                value={formData.empresaNIF}
                onChange={handleInputChange}
                placeholder="000000000"
                pattern="[0-9]{9}"
                title="O NIF deve conter 9 dígitos"
                required
              />
            </div>
          </section>

          <section className="section-documentos">
            <h2>Documentos Necessários</h2>
            <p className="documentos-descricao">Faça upload dos documentos obrigatórios</p>
            <div className="documentos-lista">
              {documentosNecessarios.map((documento) => (
                <div key={documento.id} className="documento-item">
                  <h3>{documento.nome}</h3>
                  {documentos[documento.id]?.url ? (
                    <div className="documento-preview">
                      <div className="documento-info">
                        <div className="documento-nome">
                          <FiFile className="file-icon" />
                          <span>{documentos[documento.id].nome || 'Documento'}</span>
                        </div>
                        <div className="documento-data">
                          {documentos[documento.id].dataUpload ? 
                            new Date(documentos[documento.id].dataUpload).toLocaleDateString() : 
                            'Data não disponível'}
                        </div>
                      </div>
                      <div className="documento-acoes">
                        <a href={documentos[documento.id].url} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="btn-visualizar">
                          <FiEye />
                          Visualizar
                        </a>
                        <button 
                          className="btn-excluir"
                          onClick={() => handleDocumentDelete(documento.id)}>
                          <FiTrash2 />
                          Excluir
                        </button>
                      </div>
                      {uploadStatus[documento.id] === 'uploading' && (
                        <div className="upload-status uploading">
                          <span className="uploading-spinner"></span>
                          <span>Enviando documento...</span>
                        </div>
                      )}
                      {uploadStatus[documento.id] === 'deleting' && (
                        <div className="upload-status deleting">
                          <span className="uploading-spinner"></span>
                          <span>Excluindo documento...</span>
                        </div>
                      )}
                      {uploadStatus[documento.id] === 'error' && (
                        <div className="upload-status error">
                          <span>Erro ao processar o documento. Tente novamente.</span>
                        </div>
                      )}
                      <input
                        type="file"
                        id={documento.id}
                        onChange={(e) => handleFileUpload(e, documento.id)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="upload-area">
                      <input
                        type="file"
                        id={documento.id}
                        onChange={(e) => handleFileUpload(e, documento.id)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor={documento.id} className="upload-dropzone">
                        <div className="upload-icon">
                          <FiUpload />
                        </div>
                        <div className="upload-text">
                          <span className="upload-primary">Clique para fazer upload</span>
                          <span className="upload-secondary">ou arraste e solte</span>
                        </div>
                        <div className="upload-description">{documento.descricao}</div>
                      </label>
                      {uploadStatus[documento.id] === 'uploading' && (
                        <span className="upload-status">Enviando...</span>
                      )}
                      {uploadStatus[documento.id] === 'error' && (
                        <span className="upload-status error">Erro no upload</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="section-especialidades">
            <h2>Especialidades/Serviços</h2>
            <p className="especialidades-descricao">Selecione os serviços que sua empresa oferece</p>
            <div className="especialidades-grid">
              {categoriasObras.map((categoria) => (
                <label key={categoria} className="especialidade-item">
                  <input
                    type="checkbox"
                    checked={formData.especialidades?.includes(categoria)}
                    onChange={() => handleEspecialidadeToggle(categoria)}
                  />
                  <span>{categoria}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      <section className="section-avaliacoes">
        <h2>Avaliações Recebidas</h2>
        <p className="avaliacoes-descricao">Feedback dos clientes sobre seus serviços</p>
        
        {avaliacoes.length > 0 ? (
          <>
            <div className="avaliacoes-resumo">
              <div className="classificacao-media">
                <div className="media-numero">
                  {(avaliacoes.reduce((total, avaliacao) => total + (avaliacao.rating || 0), 0) / avaliacoes.length).toFixed(1)}
                </div>
                <div className="media-estrelas">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const mediaEstrelas = avaliacoes.reduce((total, avaliacao) => total + (avaliacao.rating || 0), 0) / avaliacoes.length;
                    return (
                      <FiStar 
                        key={index} 
                        className={`star-icon ${index < Math.round(mediaEstrelas) ? 'filled' : ''}`}
                      />
                    );
                  })}
                </div>
                <div className="media-info">
                  Baseado em {avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}
                </div>
              </div>
              
              <div className="distribuicao-avaliacoes">
                {[5, 4, 3, 2, 1].map(estrela => {
                  const quantidade = avaliacoes.filter(a => a.rating === estrela).length;
                  const percentagem = (quantidade / avaliacoes.length) * 100;
                  
                  return (
                    <div key={estrela} className="barra-avaliacao">
                      <div className="barra-estrelas">
                        {estrela} <FiStar className="star-icon filled" />
                      </div>
                      <div className="barra-container">
                        <div 
                          className="barra-preenchimento" 
                          style={{ width: `${percentagem}%` }}
                        ></div>
                      </div>
                      <div className="barra-valor">{quantidade}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <h3 className="avaliacoes-titulo-lista">Comentários dos Clientes</h3>
            <div className="avaliacoes-lista">
              {avaliacoes.map((avaliacao) => (
                <div key={avaliacao.id} className="avaliacao-item">
                  <div className="avaliacao-header">
                    <div className="avaliacao-rating">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <FiStar 
                          key={index} 
                          className={`star-icon ${index < avaliacao.rating ? 'filled' : ''}`}
                        />
                      ))}
                      <span className="avaliacao-pontuacao">{avaliacao.rating}/5</span>
                    </div>
                    <div className="avaliacao-data">
                      {avaliacao.createdAt ? new Date(avaliacao.createdAt.seconds * 1000).toLocaleDateString() : 'Data não disponível'}
                    </div>
                  </div>
                  
                  <div className="avaliacao-servico">
                    <strong>Serviço:</strong> {avaliacao.servicoTitulo || 'Serviço não especificado'}
                  </div>
                  
                  <div className="avaliacao-comentario">
                    <p>{avaliacao.comentario || 'Sem comentários adicionais'}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="sem-avaliacoes">
            <p>Ainda não há avaliações para o seu perfil. As avaliações aparecerão aqui quando os clientes avaliarem seus serviços concluídos.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default PerfilTecnico; 