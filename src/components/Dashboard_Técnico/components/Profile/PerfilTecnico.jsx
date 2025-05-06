import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../../../services/firebase.jsx';
import { FiUpload, FiCheck, FiArrowLeft, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { CLOUDINARY_CONFIG } from '../../../../config/cloudinary';
import { uploadToCloudinary, uploadToCloudinaryWithSignature } from '../../../../services/cloudinary.service.js';
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
    'Manutenção',
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadStatus(prev => ({ ...prev, logo: 'uploading' }));

      // Upload to Cloudinary
      let uploadResult;
      try {
        // Primeiro tenta o método normal
        console.log('Tentando upload do logo com método padrão...');
        uploadResult = await uploadToCloudinary(file);
        console.log('Upload do logo bem sucedido (método padrão)');
      } catch (uploadError) {
        console.error('Erro no upload padrão do logo:', uploadError);
        console.log('Tentando método alternativo com assinatura para o logo...');
        
        // Se falhar, tenta o método com assinatura
        uploadResult = await uploadToCloudinaryWithSignature(file);
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

  const handleFileUpload = async (e, documentoId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadStatus(prev => ({ ...prev, [documentoId]: 'uploading' }));

      // Upload to Cloudinary
      let uploadResult;
      try {
        // Primeiro tenta o método normal
        console.log(`Tentando upload do documento ${documentoId} com método padrão...`);
        uploadResult = await uploadToCloudinary(file);
        console.log(`Upload do documento ${documentoId} bem sucedido (método padrão)`);
      } catch (uploadError) {
        console.error(`Erro no upload padrão do documento ${documentoId}:`, uploadError);
        console.log(`Tentando método alternativo com assinatura para o documento ${documentoId}...`);
        
        // Se falhar, tenta o método com assinatura
        uploadResult = await uploadToCloudinaryWithSignature(file);
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

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadStatus(prev => ({ ...prev, profilePhoto: 'uploading' }));

      // Upload to Cloudinary
      let uploadResult;
      try {
        // Primeiro tenta o método normal
        console.log('Tentando upload da foto de perfil com método padrão...');
        uploadResult = await uploadToCloudinary(file);
        console.log('Upload da foto de perfil bem sucedido (método padrão)');
      } catch (uploadError) {
        console.error('Erro no upload padrão da foto de perfil:', uploadError);
        console.log('Tentando método alternativo com assinatura para a foto de perfil...');
        
        // Se falhar, tenta o método com assinatura
        uploadResult = await uploadToCloudinaryWithSignature(file);
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
                    {documentos[documento.id]?.url && (
                      <div className="upload-success">
                        <FiCheck className="icon-success" />
                        <span>Documento enviado com sucesso</span>
                      </div>
                    )}
                  </div>
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
    </div>
  );
};

export default PerfilTecnico; 