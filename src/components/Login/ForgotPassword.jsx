import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';
import './login.css'; // Reutilizar o CSS de login para consistência

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();

  const handleChange = (e) => {
    setEmail(e.target.value);
    setMessage(''); // Limpa a mensagem ao digitar
    setError(''); // Limpa o erro ao digitar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Se o email estiver registado, enviaremos um link para recuperar a sua password para esse endereço.');
      setEmail(''); // Limpa o campo de email após o envio
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      // Firebase sendPasswordResetEmail intentionally doesn't reveal if the email exists for security reasons
      setMessage('Se o email estiver registado, enviaremos um link para recuperar a sua password para esse endereço.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {error && <div className="error-message">{error}</div>}
      <Link to="/login" className="back-arrow">
        <span>←</span>
      </Link>
      <div className="login-box">
        <h2>Recuperar Password</h2>
        {message && (
          <div className="success-message" style={{ 
            backgroundColor: "#e0f2f1", 
            color: "#00796b", 
            padding: "12px", 
            borderRadius: "6px", 
            marginBottom: "20px",
            textAlign: "center"
          }}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              placeholder="Insira o seu email de registo"
            />
          </div>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "A processar..." : "Enviar Link de Recuperação"}
          </button>
        </form>
        <div className="form-switch">
          <p>
            Lembrou-se da sua password?
            <Link to="/login" className="switch-btn">
              Voltar para o Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword; 