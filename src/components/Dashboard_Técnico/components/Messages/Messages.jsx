import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiPaperclip, FiUser } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { ref, onValue, push, set, serverTimestamp, get } from 'firebase/database';
import { getDoc, doc } from 'firebase/firestore';
import { db, database } from '../../../../services/firebase.jsx';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gestorData, setGestorData] = useState(null);
  const messagesEndRef = useRef(null);

  // Get gestor data from location state
  const { gestorId, gestorName, obraId, obraTitle } = location.state || {};

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  // Carregar dados do usuário e do gestor
  useEffect(() => {
    const loadUserData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Load technician data
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Load gestor data if gestorId is available
        if (gestorId) {
          const gestorDoc = await getDoc(doc(db, 'users', gestorId));
          if (gestorDoc.exists()) {
            setGestorData(gestorDoc.data());
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Erro ao carregar dados do usuário');
      }
    };
    loadUserData();
  }, [auth.currentUser, gestorId]);

  // Configurar listener de mensagens em tempo real
  useEffect(() => {
    if (!auth.currentUser || !gestorId) {
      console.log('No auth user or gestorId, skipping listener setup');
      setLoading(false);
      return;
    }

    // Create a unique chat ID for this conversation
    const chatId = [auth.currentUser.uid, gestorId].sort().join('_');
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    
    console.log('Setting up messages listener for chat:', chatId);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      console.log('Received snapshot from database');
      const data = snapshot.val();
      
      if (data) {
        // Converter objeto em array e ordenar por timestamp
        const messagesArray = Object.entries(data).map(([id, message]) => ({
          id,
          ...message
        })).sort((a, b) => {
          // Handle serverTimestamp
          const aTime = a.timestamp?.seconds || a.timestamp;
          const bTime = b.timestamp?.seconds || b.timestamp;
          return aTime - bTime;
        });
        
        console.log('Messages loaded:', messagesArray);
        setMessages(messagesArray);
      } else {
        console.log('No messages found in data');
        setMessages([]);
      }
      
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error in messages listener:', error);
      setError('Erro ao carregar mensagens');
      setLoading(false);
    });

    // Set a timeout to stop loading after 5 seconds if no data is received
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('No messages received after 5 seconds, setting loading to false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      console.log('Cleaning up messages listener');
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [auth.currentUser, gestorId]);

  // Add a debug effect to monitor loading state
  useEffect(() => {
    console.log('Loading state changed:', loading);
    console.log('Messages state:', messages);
  }, [loading, messages]);

  // Scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      console.log('Starting to send message...', {
        newMessage,
        gestorId,
        obraId,
        obraTitle,
        userData
      });

      if (!gestorId) {
        console.error('No gestor ID available');
        setError('Erro: ID do gestor não encontrado');
        return;
      }

      // Create a unique chat ID for this conversation
      const chatId = [auth.currentUser.uid, gestorId].sort().join('_');
      console.log('Chat ID:', chatId);

      const messagesRef = ref(database, `chats/${chatId}/messages`);
      console.log('Messages reference:', messagesRef.toString());

      const newMessageRef = push(messagesRef);
      console.log('New message reference:', newMessageRef.toString());

      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData?.empresaNome || userData?.name || 'Técnico',
        timestamp: serverTimestamp(),
        type: 'text',
        obraId: obraId,
        obraTitle: obraTitle
      };

      console.log('Message data to be sent:', messageData);

      if (selectedFile) {
        messageData.type = 'file';
        messageData.fileUrl = 'URL_DO_ARQUIVO'; // Implementar upload de arquivo depois
        messageData.fileName = selectedFile.name;
      }

      // Try to set the message
      try {
        await set(newMessageRef, messageData);
        console.log('Message sent successfully to path:', newMessageRef.toString());
        
        // Verify the message was sent by reading it back
        const snapshot = await get(newMessageRef);
        if (snapshot.exists()) {
          console.log('Message verified in database:', snapshot.val());
        } else {
          console.error('Message not found in database after sending');
        }
      } catch (setError) {
        console.error('Error setting message:', setError);
        throw setError;
      }

      setNewMessage('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError(`Erro ao enviar mensagem: ${error.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  if (!auth.currentUser) {
    return (
      <div className="main-content messages-page">
        <div className="page-header-container">
          <button className="back-button" onClick={goBackToDashboard}>
            <FiArrowLeft />
            <span>Voltar</span>
          </button>
          <h1 className="page-title">Mensagens</h1>
        </div>
        <div className="messages-container">
          <div className="no-messages">
            <p>Por favor, faça login para acessar as mensagens.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-content messages-page">
        <div className="page-header-container">
          <button className="back-button" onClick={goBackToDashboard}>
            <FiArrowLeft />
            <span>Voltar</span>
          </button>
          <div className="chat-header">
            <div className="chat-user-info">
              <FiUser className="user-icon" />
              <div className="user-details">
                <h1 className="page-title">
                  {gestorName || 'Mensagens'}
                </h1>
                {obraTitle && <span className="obra-title">{obraTitle}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="messages-container">
          <div className="loading">
            <p>Carregando mensagens...</p>
            {error && <p className="error-message">{error}</p>}
            <p className="debug-info">Chat ID: {auth.currentUser?.uid && gestorId ? [auth.currentUser.uid, gestorId].sort().join('_') : 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content messages-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <div className="chat-header">
          <div className="chat-user-info">
            <FiUser className="user-icon" />
            <div className="user-details">
              <h1 className="page-title">
                {gestorName || 'Mensagens'}
              </h1>
              {obraTitle && <span className="obra-title">{obraTitle}</span>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="messages-container">
        <div className="messages-content">
          {error && <p className="error-message">{error}</p>}
          {messages.length > 0 ? (
            <div className="messages-list">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.senderId === auth.currentUser.uid ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    <span className="message-sender">
                      {message.senderName}
                    </span>
                    {message.type === 'text' ? (
                      <p>{message.text}</p>
                    ) : (
                      <div className="file-message">
                        <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                          {message.fileName}
                        </a>
                      </div>
                    )}
                    <span className="message-time">
                      {message.timestamp?.seconds ? 
                        new Date(message.timestamp.seconds * 1000).toLocaleTimeString() :
                        new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="no-messages">
              <p>Inicie uma conversa com {gestorName}</p>
            </div>
          )}
        </div>

        <form className="message-input-form" onSubmit={handleSendMessage}>
          <div className="message-input-container">
            <input
              type="file"
              id="fileInput"
              onChange={handleFileSelect}
              className="file-input"
              accept="image/*,.pdf,.doc,.docx"
            />
            <label htmlFor="fileInput" className="file-input-label">
              <FiPaperclip />
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="message-input"
            />
            <button type="submit" className="send-button">
              <FiSend />
            </button>
          </div>
          {selectedFile && (
            <div className="selected-file">
              <span>{selectedFile.name}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Messages; 