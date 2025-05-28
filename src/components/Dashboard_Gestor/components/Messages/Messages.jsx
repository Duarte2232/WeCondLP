import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSend, FiPaperclip, FiPlus, FiUser } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { ref, onValue, push, set, serverTimestamp, get, update } from 'firebase/database';
import { collection, query, where, getDocs, getDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, database } from '../../../../services/firebase.jsx';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const messagesEndRef = useRef(null);
  // Keep track of the selected conversation ID to prevent losing it on reloads
  const selectedConversationIdRef = useRef(null);
  
  // When selectedConversation changes, update the ref
  useEffect(() => {
    if (selectedConversation) {
      selectedConversationIdRef.current = selectedConversation.id;
    }
  }, [selectedConversation]);

  // Parse the URL search parameters to get tecnico ID and workId
  const searchParams = new URLSearchParams(location.search);
  const tecnicoIdFromUrl = searchParams.get('tecnico');
  const workIdFromUrl = searchParams.get('workId');
  
  // Log for debugging
  console.log('Messages - URL parameters:', {
    search: location.search,
    tecnicoIdFromUrl,
    workIdFromUrl,
    pathname: location.pathname
  });

  // Carregar dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Erro ao carregar dados do usuário');
      }
    };
    loadUserData();
  }, [auth.currentUser]);

  // Carregar todas as conversas do gestor
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, where('gestorId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const conversationsData = [];
      for (const conversationDoc of snapshot.docs) {
        const conversationData = conversationDoc.data();
        // Buscar dados do técnico
        const technicianDoc = await getDoc(doc(db, 'users', conversationData.technicianId));
        const technicianData = technicianDoc.data();
        conversationsData.push({
          id: conversationDoc.id,
          technicianId: conversationData.technicianId,
          technicianName: technicianData?.empresaNome || technicianData?.name || 'Técnico',
          obraId: conversationData.workId,
          obraTitle: conversationData.workTitle,
          lastMessage: conversationData.lastMessage || '',
          timestamp: conversationData.lastMessageTimestamp,
          unreadCount: conversationData.messages?.filter(msg =>
            msg.senderId !== auth.currentUser.uid && !msg.read
          ).length || 0
        });
      }
      // Ordenar conversas pelo timestamp da última mensagem
      conversationsData.sort((a, b) => {
        const getMillis = (ts) => {
          if (!ts) return 0;
          if (typeof ts.toDate === 'function') return ts.toDate().getTime();
          if (ts instanceof Date) return ts.getTime();
          return 0;
        };
        return getMillis(b.timestamp) - getMillis(a.timestamp);
      });
      setConversations(conversationsData);

      // First check for tecnico parameter in URL
      if (tecnicoIdFromUrl) {
        console.log('Messages - Checking for technician in URL parameter:', tecnicoIdFromUrl);
        let conversationToSelect;
        
        // If both tecnico and workId are provided, find the specific conversation
        if (workIdFromUrl) {
          console.log('Messages - Also checking for workId:', workIdFromUrl);
          conversationToSelect = conversationsData.find(conv => 
            conv.technicianId === tecnicoIdFromUrl && conv.obraId === workIdFromUrl
          );
          
          if (conversationToSelect) {
            console.log('Messages - Found conversation matching both technicianId and workId:', conversationToSelect);
          } else {
            console.log('Messages - No conversation found matching both technicianId and workId');
            // If no conversation exists with both matches, just find by technician ID
            conversationToSelect = conversationsData.find(conv => conv.technicianId === tecnicoIdFromUrl);
          }
        } else {
          // If only tecnico ID is provided, find by technician ID only
          conversationToSelect = conversationsData.find(conv => conv.technicianId === tecnicoIdFromUrl);
        }
        
        if (conversationToSelect) {
          console.log('Messages - Selected conversation:', conversationToSelect);
          setSelectedConversation(conversationToSelect);
          // Clear URL parameter after selecting the conversation
          navigate('/dashgestor/mensagens', { replace: true });
          setLoading(false);
          return;
        } else {
          console.log('Messages - No matching conversation found for technician:', tecnicoIdFromUrl);
          console.log('Messages - Available conversations:', conversationsData.map(c => ({ 
            id: c.id, 
            technicianId: c.technicianId,
            obraId: c.obraId,
            technicianName: c.technicianName 
          })));
        }
      }
      
      // If no tecnico in URL, check for conversationId in location.state
      if (location.state?.conversationId) {
        const found = conversationsData.find(conv => conv.id === location.state.conversationId);
        if (found) {
          setSelectedConversation(found);
        } else if (conversationsData.length > 0) {
          setSelectedConversation(conversationsData[0]);
        }
      } else if (selectedConversationIdRef.current) {
        // If we have a previously selected conversation, try to maintain it
        console.log('Messages - Trying to maintain previously selected conversation:', selectedConversationIdRef.current);
        const existingConversation = conversationsData.find(conv => conv.id === selectedConversationIdRef.current);
        if (existingConversation) {
          console.log('Messages - Maintaining previously selected conversation');
          setSelectedConversation(existingConversation);
        }
      } else if (!selectedConversation && conversationsData.length > 0) {
        // Only set a default conversation if none is selected yet
        setSelectedConversation(conversationsData[0]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth.currentUser, location.state?.conversationId, tecnicoIdFromUrl, workIdFromUrl, navigate]);

  // Carregar e ouvir mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConversation) return;
    const conversationRef = doc(db, 'conversations', selectedConversation.id);
    const unsubscribe = onSnapshot(conversationRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMessages(data.messages || []);
        // Marcar mensagens como lidas
        const unreadMessages = data.messages?.filter(msg =>
          msg.senderId !== auth.currentUser.uid && !msg.read
        ) || [];
        if (unreadMessages.length > 0) {
          const updatedMessages = data.messages.map(msg => ({
            ...msg,
            read: msg.senderId !== auth.currentUser.uid ? true : msg.read
          }));
          updateDoc(conversationRef, {
            messages: updatedMessages
          });
        }
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    });
    return () => unsubscribe();
  }, [selectedConversation, auth.currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    // Save the current conversation ID before sending the message
    const currentConversationId = selectedConversation.id;
    
    try {
      const conversationRef = doc(db, 'conversations', currentConversationId);
      const conversationDoc = await getDoc(conversationRef);
      if (!conversationDoc.exists()) {
        throw new Error('Conversa não encontrada');
      }
      const currentData = conversationDoc.data();
      const currentMessages = currentData.messages || [];
      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData?.empresaNome || userData?.name || 'Gestor',
        timestamp: new Date(),
        read: false
      };
      
      await updateDoc(conversationRef, {
        messages: [...currentMessages, messageData],
        lastMessage: messageData.text,
        lastMessageTimestamp: serverTimestamp()
      });
      
      // Ensure the selectedConversationIdRef is set to maintain the conversation
      selectedConversationIdRef.current = currentConversationId;
      
      setNewMessage('');
      setError(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Erro ao enviar mensagem. Por favor, tente novamente.');
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.technicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.obraTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add a function to format the timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // If less than 24 hours ago
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    // If more than 24 hours ago
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (!auth.currentUser) {
    return (
      <div className="messages-page">
        <div className="no-messages">
          <p>Por favor, faça login para acessar as mensagens.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="messages-page">
        <div className="loading">
          <p>Carregando mensagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-header">
        <h1 className="messages-title">Mensagens</h1>
      </div>
      
      <div className="messages-container">
        <div className="conversations-sidebar">
          <div className="conversations-search">
            <input
              type="text"
              className="search-input"
              placeholder="Pesquisar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="conversations-list">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div className="conversation-info">
                  <h3>{conversation.technicianName}</h3>
                  <p>{conversation.obraTitle}</p>
                </div>
                {conversation.unreadCount > 0 && (
                  <div className="unread-badge">
                    {conversation.unreadCount}
                  </div>
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
                    <h2>{selectedConversation.technicianName}</h2>
                    <p className="obra-title">{selectedConversation.obraTitle}</p>
                  </div>
                </div>
              </div>

              <div className="messages-content">
                {error && <p className="error-message">{error}</p>}
                {messages.length > 0 ? (
                  <div className="messages-list">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`message ${message.senderId === auth.currentUser.uid ? 'sent' : 'received'}`}
                        style={{
                          backgroundColor: message.senderId === auth.currentUser.uid ? '#2563eb' : '#f3f4f6',
                          color: message.senderId === auth.currentUser.uid ? '#ffffff' : '#111827',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          alignSelf: message.senderId === auth.currentUser.uid ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div className="message-content">
                          <span className="message-sender">
                            {message.senderName}
                          </span>
                          <p>{message.text}</p>
                          <span className="message-time">
                            {message.timestamp && (new Date(message.timestamp.seconds ? message.timestamp.seconds * 1000 : message.timestamp)).toLocaleTimeString()}
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