import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSend, FiUser } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, doc, addDoc, serverTimestamp, onSnapshot, updateDoc, arrayUnion, orderBy } from 'firebase/firestore';
import { db } from '../../../../services/firebase.jsx';
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

  // Parse URL search parameters to get gestor ID and workId
  const searchParams = new URLSearchParams(location.search);
  const gestorIdFromUrl = searchParams.get('gestor');
  const workIdFromUrl = searchParams.get('workId');
  
  // Log for debugging
  console.log('Messages - URL parameters:', {
    search: location.search,
    gestorIdFromUrl,
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

  // Carregar todas as conversas do técnico
  useEffect(() => {
    if (!auth.currentUser) return;

    const loadConversations = async () => {
      try {
        // Buscar conversas onde o técnico está associado
        const conversationsRef = collection(db, 'conversations');
        const q = query(
          conversationsRef, 
          where('technicianId', '==', auth.currentUser.uid)
        );
        
        // Use onSnapshot para ouvir mudanças em tempo real
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const conversationsData = [];
          
          for (const conversationDoc of snapshot.docs) {
            const conversationData = conversationDoc.data();
            
            // Buscar dados do gestor
            const gestorDoc = await getDoc(doc(db, 'users', conversationData.gestorId));
            const gestorData = gestorDoc.data();

            conversationsData.push({
              id: conversationDoc.id,
              gestorId: conversationData.gestorId,
              gestorName: gestorData?.name || gestorData?.email || 'Gestor',
              obraId: conversationData.workId,
              obraTitle: conversationData.workTitle,
              lastMessage: conversationData.lastMessage || '',
              timestamp: conversationData.lastMessageTimestamp,
              unreadCount: conversationData.messages?.filter(msg => 
                msg.senderId !== auth.currentUser.uid && !msg.read
              ).length || 0
            });
          }

          // Ordenar as conversas pelo timestamp da última mensagem
          conversationsData.sort((a, b) => {
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            
            const dateA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const dateB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            
            return dateB - dateA;
          });

          setConversations(conversationsData);
          
          // First check for gestor parameter in URL
          if (gestorIdFromUrl) {
            console.log('Messages - Checking for gestor in URL parameter:', gestorIdFromUrl);
            let conversationToSelect;
            
            // If both gestor and workId are provided, find the specific conversation
            if (workIdFromUrl) {
              console.log('Messages - Also checking for workId:', workIdFromUrl);
              conversationToSelect = conversationsData.find(conv => 
                conv.gestorId === gestorIdFromUrl && conv.obraId === workIdFromUrl
              );
              
              if (conversationToSelect) {
                console.log('Messages - Found conversation matching both gestorId and workId:', conversationToSelect);
              } else {
                console.log('Messages - No conversation found matching both gestorId and workId');
                // If no conversation exists with both matches, just find by gestor ID
                conversationToSelect = conversationsData.find(conv => conv.gestorId === gestorIdFromUrl);
              }
            } else {
              // If only gestor ID is provided, find by gestor ID only
              conversationToSelect = conversationsData.find(conv => conv.gestorId === gestorIdFromUrl);
            }
            
            if (conversationToSelect) {
              console.log('Messages - Selected conversation:', conversationToSelect);
              setSelectedConversation(conversationToSelect);
              // Clear URL parameter after selecting the conversation
              navigate('/dashtecnico/mensagens', { replace: true });
              setLoading(false);
              return;
            } else {
              console.log('Messages - No matching conversation found for gestor:', gestorIdFromUrl);
              console.log('Messages - Available conversations:', conversationsData.map(c => ({ 
                id: c.id, 
                gestorId: c.gestorId,
                obraId: c.obraId,
                gestorName: c.gestorName 
              })));
            }
          }
          
          // Seleção automática da conversa se vier via location.state
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
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setLoading(false);
        setError('Erro ao carregar conversas');
      }
    };

    loadConversations();
  }, [auth.currentUser, location.state?.conversationId, gestorIdFromUrl, workIdFromUrl, navigate]);

  // Carregar e ouvir mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConversation) return;

    const conversationRef = doc(db, 'conversations', selectedConversation.id);
    
    const unsubscribe = onSnapshot(conversationRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
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

        // Scroll para a última mensagem
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

    try {
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      
      // Primeiro, buscar o documento atual
      const conversationDoc = await getDoc(conversationRef);
      if (!conversationDoc.exists()) {
        throw new Error('Conversa não encontrada');
      }

      const currentData = conversationDoc.data();
      const currentMessages = currentData.messages || [];

      // Criar a nova mensagem com timestamp do cliente
      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData?.empresaNome || userData?.name || 'Técnico',
        timestamp: new Date(),
        read: false
      };

      // Atualizar o documento com o novo array de mensagens
      await updateDoc(conversationRef, {
        messages: [...currentMessages, messageData],
        lastMessage: messageData.text,
        lastMessageTimestamp: serverTimestamp()
      });

      setNewMessage('');
      setError(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem. Por favor, tente novamente.');
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.gestorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.obraTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  <h3>{conversation.obraTitle}</h3>
                  <p>Gestor: {conversation.gestorName}</p>
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
                    <h2>{selectedConversation.gestorName}</h2>
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
                      >
                        <div className="message-content">
                          <span className="message-sender">
                            {message.senderName}
                          </span>
                          <p>{message.text}</p>
                          <span className="message-time">
                            {message.timestamp?.toDate().toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="no-messages">
                    <p>Inicie uma conversa com o gestor</p>
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