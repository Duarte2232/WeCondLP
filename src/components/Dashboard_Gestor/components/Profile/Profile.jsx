import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit, FiTrash2, FiUser } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [userData, setUserData] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    telefone: '',
    cargo: '',
    photoURL: null
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            nome: data.nome || '',
            sobrenome: data.sobrenome || '',
            email: auth.currentUser.email || '',
            telefone: data.telefone || '',
            cargo: data.cargo || '',
            photoURL: auth.currentUser.photoURL || null
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [auth.currentUser]);

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData({
      ...userData,
      [name]: value
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        nome: userData.nome,
        sobrenome: userData.sobrenome,
        telefone: userData.telefone,
        cargo: userData.cargo
      });
      
      setEditing(false);
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    // Implementação do upload de foto será adicionada posteriormente
    console.log('Arquivo selecionado:', e.target.files[0]);
  };

  const handleRemovePhoto = async () => {
    // Implementação da remoção de foto será adicionada posteriormente
    console.log('Remover foto');
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1>Perfil</h1>
      </div>
      
      <div className="profile-content">
        <div className="profile-card">
          <h2>Informações Pessoais</h2>
          <p className="profile-subtitle">Atualize suas informações pessoais e de contato.</p>
          
          {editing && (
            <div className="editing-indicator">
              <FiEdit style={{ marginRight: '8px' }} /> Modo de edição ativado
            </div>
          )}
          
          <div className="profile-photo-section">
            <div className="profile-photo">
              {userData.photoURL ? (
                <img src={userData.photoURL} alt="Foto de perfil" />
              ) : (
                <div className="profile-photo-placeholder">
                  <FiUser size={40} color="#ccc" />
                </div>
              )}
            </div>
            <div className="profile-photo-info">
              <h3>Foto de Perfil</h3>
              <div className="profile-photo-actions">
                <label htmlFor="photo-upload" className="photo-upload-btn">
                  Alterar Foto
                  <input 
                    type="file" 
                    id="photo-upload" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                  />
                </label>
                <button 
                  className="photo-remove-btn" 
                  onClick={handleRemovePhoto}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
          
          <div className="profile-divider"></div>
          
          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nome">Nome</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={userData.nome}
                  onChange={handleInputChange}
                  placeholder="Seu nome"
                  disabled={!editing}
                />
              </div>
              <div className="form-group">
                <label htmlFor="sobrenome">Sobrenome</label>
                <input
                  type="text"
                  id="sobrenome"
                  name="sobrenome"
                  value={userData.sobrenome}
                  onChange={handleInputChange}
                  placeholder="Seu sobrenome"
                  disabled={!editing}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userData.email}
                  placeholder="seu.email@exemplo.com"
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="telefone">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={userData.telefone}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                  disabled={!editing}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="cargo">Cargo</label>
                <input
                  type="text"
                  id="cargo"
                  name="cargo"
                  value={userData.cargo}
                  onChange={handleInputChange}
                  placeholder="Seu cargo ou função"
                  disabled={!editing}
                />
              </div>
            </div>
            
            <div className="form-actions">
              {editing ? (
                <>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setEditing(false)}
                  >
                    Cancelar Edição
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={loading}
                  >
                    Salvar Alterações
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className="edit-btn"
                  onClick={() => setEditing(true)}
                >
                  <FiEdit style={{ marginRight: '8px' }} /> Editar Perfil
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile; 