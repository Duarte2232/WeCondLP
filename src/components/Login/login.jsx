import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import './login.css';

function Login() {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'tecnico'
  });

  const navigate = useNavigate();
  const auth = getAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
      } else {
        // Login existing user
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      }

      // Redirect based on role
      navigate('/dashgestor');
      
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'tecnico'
    });
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isLogin ? 'Login' : 'Registro'}</h2>
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
          
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Nome:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}

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
          
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="role">Função:</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required={!isLogin}
              >
                <option value="tecnico">Técnico</option>
                <option value="gestor">Gestor de Condomínio</option>
              </select>
            </div>
          )}

          <button type="submit" className="submit-btn">
            {isLogin ? 'Entrar' : 'Registrar'}
          </button>
        </form>

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
