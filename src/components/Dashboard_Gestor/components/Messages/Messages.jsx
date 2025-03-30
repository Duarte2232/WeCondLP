import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiPaperclip, FiUser } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
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
  const [technicianData, setTechnicianData] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const messagesEndRef = useRef(null);

  // Get conversation data from location state if available
  const { technicianId, technicianName, obraId, obraTitle } = location.state || {};

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashgestor');
  };

  // Carregar dados do usuário e do técnico
  useEffect(() => {
    const loadUserData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Load gestor data
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Load technician data if technicianId is available
        if (technicianId) {
          const technicianDoc = await getDoc(doc(db, 'users', technicianId));
          if (technicianDoc.exists()) {
            setTechnicianData(technicianDoc.data());
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Erro ao carregar dados do usuário');
      }
    };
    loadUserData();
  }, [auth.currentUser, technicianId]);

  // Carregar conversas do gestor
  useEffect(() => {
    const loadConversations = async () => {
      if (!auth.currentUser) return;

      try {
        // Buscar todas as obras do gestor
        const obrasRef = collection(db, 'works');
        const obrasQuery = query(obrasRef, where('userId', '==', auth.currentUser.uid));
        const obrasSnapshot = await getDocs(obrasQuery);
        
        const conversationsMap = new Map();
        
        obrasSnapshot.forEach((obraDoc) => {
          const obraData = obraDoc.data();
          if (obraData.technicianId) {
            const chatId = [auth.currentUser.uid, obraData.technicianId].sort().join('_');
            if (!conversationsMap.has(chatId)) {
              conversationsMap.set(chatId, {
                chatId,
                technicianId: obraData.technicianId,
                obraId: obraDoc.id,
                obraTitle: obraData.title,
                lastMessage: null,
                unreadCount: 0
              });
            }
          }
        });

        // Converter Map para array
        const conversationsArray = Array.from(conversationsMap.values());
        setConversations(conversationsArray);

        // Se não houver conversa selecionada e houver conversas disponíveis, selecionar a primeira
        if (!selectedConversation && conversationsArray.length > 0) {
          setSelectedConversation(conversationsArray[0]);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        setError('Erro ao carregar conversas');
      }
    };

    loadConversations();
  }, [auth.currentUser]);

  // Configurar listener de mensagens em tempo real
  useEffect(() => {
    if (!auth.currentUser || !selectedConversation) {
      setLoading(false);
      return;
    }

    const messagesRef = ref(database, `chats/${selectedConversation.chatId}/messages`);
    
    console.log('Setting up messages listener for chat:', selectedConversation.chatId);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      console.log('Received snapshot from database');
      const data = snapshot.val();
      
      if (data) {
        // Converter objeto em array e ordenar por timestamp
        const messagesArray = Object.entries(data).map(([id, message]) => ({
          id,
          ...message
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        console.log('Messages loaded:', messagesArray.length);
        setMessages(messagesArray);
      } else {
        console.log('No messages found');
        setMessages([]);
      }
      
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error in messages listener:', error);
      setError('Erro ao carregar mensagens');
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up messages listener');
      unsubscribe();
    };
  }, [auth.currentUser, selectedConversation]);

  // Scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      const messagesRef = ref(database, `chats/${selectedConversation.chatId}/messages`);
      const newMessageRef = push(messagesRef);

      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData?.empresaNome || userData?.name || 'Gestor',
        timestamp: serverTimestamp(),
        type: 'text',
        obraId: selectedConversation.obraId,
        obraTitle: selectedConversation.obraTitle
      };

      if (selectedFile) {
        messageData.type = 'file';
        messageData.fileUrl = 'URL_DO_ARQUIVO'; // Implementar upload de arquivo depois
        messageData.fileName = selectedFile.name;
      }

      await set(newMessageRef, messageData);
      setNewMessage('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Erro ao enviar mensagem');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
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
        <div className="conversations-sidebar">
          <div className="conversations-list">
            {conversations.map((conversation) => (
              <div
                key={conversation.chatId}
                className={`conversation-item ${selectedConversation?.chatId === conversation.chatId ? 'active' : ''}`}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div className="conversation-info">
                  <h3>{conversation.obraTitle}</h3>
                  <p>Técnico: {conversation.technicianId}</p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="unread-badge">{conversation.unreadCount}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="chat-container">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <FiUser className="user-icon" />
                  <div className="user-details">
                    <h2>{selectedConversation.obraTitle}</h2>
                    <span className="obra-title">Conversa com o técnico</span>
                  </div>
                </div>
              </div>

              <div className="messages-content">
                {error && <p className="error-message">{error}</p>}
                {loading ? (
                  <div className="loading">
                    <p>Carregando mensagens...</p>
                  </div>
                ) : messages.length > 0 ? (
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
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="no-messages">
                    <p>Inicie uma conversa com o técnico</p>
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
            </>
          ) : (
            <div className="no-conversation">
              <p>Selecione uma conversa para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages; 