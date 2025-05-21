import React, { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.jsx';
import { useNavigate, Link } from 'react-router-dom';
import './login.css';
import LoadingAnimation from '../LoadingAnimation/LoadingAnimation';

function Login() {
  const [isLogin, setIsLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: '',
    nif: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    setError('');
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setFormData(prevState => ({
      ...prevState,
      role: role
    }));
  };

  const checkNIFExists = async (nif) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('nif', '==', nif));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar NIF:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (!isLogin) {
        const nifExists = await checkNIFExists(formData.nif);
        if (nifExists) {
          setError('Este NIF já está registrado no sistema. Por favor, use outro NIF ou faça login com a conta existente.');
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          nif: formData.nif,
          createdAt: new Date().toISOString()
        });

        alert('Registro realizado com sucesso!');
        navigate(formData.role === 'tecnico' ? '/dashtecnico' : '/dashgestor');
      } else {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        
        if (formData.email === "wecondlda@gmail.com") {
          navigate('/dashadmin');
        } else {
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          const userRole = userDoc.data().role;
          
          navigate(userRole === 'tecnico' ? '/dashtecnico' : '/dashgestor');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setSelectedRole(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      role: '',
      nif: ''
    });
    setError('');
  };

  const renderRoleSelection = () => {
    return (
      <div className="role-selection-container">
        <h3>Selecione sua função:</h3>
        <div className="role-options">
          <div 
            className={`role-option ${selectedRole === 'tecnico' ? 'selected' : ''}`}
            onClick={() => handleRoleSelect('tecnico')}
          >
            <div className="role-icon tecnico-icon">🔧</div>
            <h4>Técnico</h4>
            <p>Profissionais que prestam serviços</p>
          </div>
          <div 
            className={`role-option ${selectedRole === 'gestor' ? 'selected' : ''}`}
            onClick={() => handleRoleSelect('gestor')}
          >
            <div className="role-icon gestor-icon">🏢</div>
            <h4>Gestor de Condomínio</h4>
            <p>Administradores de condomínios</p>
          </div>
        </div>
      </div>
    );
  };

  const renderRegistrationForm = () => {
    return (
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="name">Nome da Empresa:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="nif">NIF da Empresa:</label>
          <input
            type="text"
            id="nif"
            name="nif"
            value={formData.nif}
            onChange={handleChange}
            pattern="[0-9]{9}"
            title="O NIF deve conter 9 dígitos"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group selected-role">
          <label>Função:</label>
          <span className="role-badge">
            {formData.role === 'tecnico' ? 'Técnico' : 'Gestor de Condomínio'}
          </span>
          <button 
            type="button" 
            className="change-role-btn"
            onClick={() => setSelectedRole(null)}
          >
            Alterar
          </button>
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? <LoadingAnimation /> : 'Registrar'}
        </button>
      </form>
    );
  };

  const renderLoginForm = () => {
    return (
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? <LoadingAnimation /> : 'Entrar'}
        </button>
      </form>
    );
  };

  return (
    <div className="login-container">
      {error && <div className="error-message">{error}</div>}
      <Link to="/" className="back-arrow">
        <span>←</span>
      </Link>
      <div className="login-box">
        <h2>{isLogin ? 'Login' : 'Registro'}</h2>
        
        {isLogin ? (
          renderLoginForm()
        ) : (
          selectedRole ? (
            renderRegistrationForm()
          ) : (
            renderRoleSelection()
          )
        )}

        <div className="form-switch">
          <p>
            {isLogin 
              ? 'Não tem uma conta?' 
              : 'Já tem uma conta?'}
            <button 
              onClick={toggleForm}
              className="switch-btn"
            >
              {isLogin ? 'Registre-se' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
