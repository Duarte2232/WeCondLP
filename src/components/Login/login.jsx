import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
    role: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setFormData(prevState => ({
      ...prevState,
      role: role
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!isLogin) {
        // Register new user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Save additional user data in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          createdAt: new Date().toISOString()
        });

        alert('Registro realizado com sucesso!');
        // Redirect based on role after registration
        navigate(formData.role === 'tecnico' ? '/dashtecnico' : '/dashgestor');
      } else {
        // Login existing user
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        
        // Verificar se é admin
        if (formData.email === "wecondlda@gmail.com") {
          navigate('/dashadmin');
        } else {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          const userRole = userDoc.data().role;
          
          // Redirect based on role
          navigate(userRole === 'tecnico' ? '/dashtecnico' : '/dashgestor');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
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
      role: ''
    });
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
          <label htmlFor="name">Nome:</label>
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
