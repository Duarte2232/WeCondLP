import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiUser } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { ref, onValue, push, set, serverTimestamp, get } from 'firebase/database';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, database } from '../../../../services/firebase.jsx';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

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

  // Carregar conversas do gestor
  useEffect(() => {
    const loadConversations = async () => {
      if (!auth.currentUser) return;

      try {
        const conversationsMap = new Map();
        
        // Buscar todas as obras onde o gestor é o dono ou participante
        const obrasRef = collection(db, 'works');
        const obrasQuery = query(
          obrasRef,
          where('userId', '==', auth.currentUser.uid)
        );
        const obrasSnapshot = await getDocs(obrasQuery);
        
        // Para cada obra, verificar se tem um técnico atribuído
        for (const obraDoc of obrasSnapshot.docs) {
          const obraData = obraDoc.data();
          
          // Verificar se a obra tem um técnico atribuído
          if (obraData.technicianId) {
            // Criar o chatId para esta conversa
            const chatId = [auth.currentUser.uid, obraData.technicianId].sort().join('_');
            
            // Buscar dados do técnico
            const technicianDoc = await getDoc(doc(db, 'users', obraData.technicianId));
            const technicianData = technicianDoc.exists() ? technicianDoc.data() : null;
            
            // Buscar mensagens desta conversa
            const messagesRef = ref(database, `chats/${chatId}/messages`);
            const messagesSnapshot = await get(messagesRef);
            
            let lastMessage = null;
            let unreadCount = 0;
            
            if (messagesSnapshot.exists()) {
              const messages = messagesSnapshot.val();
              const messagesArray = Object.values(messages);
              lastMessage = messagesArray[messagesArray.length - 1];
              
              // Contar mensagens não lidas
              unreadCount = messagesArray.filter(msg => 
                msg.senderId !== auth.currentUser.uid && !msg.read
              ).length;
            }

            conversationsMap.set(chatId, {
              chatId,
              technicianId: obraData.technicianId,
              technicianName: technicianData?.empresaNome || technicianData?.name || 'Técnico',
              obraId: obraDoc.id,
              obraTitle: obraData.title,
              lastMessage: lastMessage?.text || '',
              timestamp: lastMessage?.timestamp || null,
              unreadCount
            });
          }
        }

        // Converter Map para array e ordenar por última mensagem
        const conversationsArray = Array.from(conversationsMap.values()).sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return b.timestamp - a.timestamp;
        });

        setConversations(conversationsArray);
        
        // Se não houver conversa selecionada e houver conversas disponíveis, selecionar a primeira
        if (!selectedConversation && conversationsArray.length > 0) {
          setSelectedConversation(conversationsArray[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading conversations:', error);
        setError('Erro ao carregar conversas');
        setLoading(false);
      }
    };

    loadConversations();
  }, [auth.currentUser, selectedConversation]);

  // Carregar mensagens quando uma conversa é selecionada
  useEffect(() => {
    if (!selectedConversation) return;

    const messagesRef = ref(database, `chats/${selectedConversation.chatId}/messages`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesArray = Object.entries(data).map(([id, message]) => ({
          id,
          ...message
        })).sort((a, b) => {
          const aTime = a.timestamp?.seconds || a.timestamp;
          const bTime = b.timestamp?.seconds || b.timestamp;
          return aTime - bTime;
        });
        
        setMessages(messagesArray);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const messagesRef = ref(database, `chats/${selectedConversation.chatId}/messages`);
      const newMessageRef = push(messagesRef);

      await set(newMessageRef, {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData?.empresaNome || userData?.name || 'Gestor',
        timestamp: serverTimestamp(),
        type: 'text',
        obraId: selectedConversation.obraId,
        obraTitle: selectedConversation.obraTitle,
        read: false
      });

      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem');
    }
  };

  const handleConversationSelect = async (conversation) => {
    setSelectedConversation(conversation);
    
    // Mark all messages as read
    const messagesRef = ref(database, `chats/${conversation.chatId}/messages`);
    const snapshot = await get(messagesRef);
    
    if (snapshot.exists()) {
      Object.entries(snapshot.val()).forEach(([messageId, message]) => {
        if (message.senderId !== auth.currentUser.uid && !message.read) {
          const messageRef = ref(database, `chats/${conversation.chatId}/messages/${messageId}`);
          set(messageRef, {
            ...message,
            read: true
          });
        }
      });
      
      // Update local state
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.chatId === conversation.chatId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.technicianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                key={conversation.chatId}
                className={`conversation-item ${selectedConversation?.chatId === conversation.chatId ? 'active' : ''}`}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div className="conversation-info">
                  <h3>{conversation.obraTitle}</h3>
                  <p>Técnico: {conversation.technicianName}</p>
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
                    <h2>{selectedConversation.technicianName}</h2>
                    <span className="obra-title">{selectedConversation.obraTitle}</span>
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
                          <p>{message.text}</p>
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