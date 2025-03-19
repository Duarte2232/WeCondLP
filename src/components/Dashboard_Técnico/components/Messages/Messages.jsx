import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiSearch, FiMessageCircle, FiChevronRight, FiInfo } from 'react-icons/fi';
import './Messages.css';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/auth';

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const auth = getAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState([]);
  const [workDetails, setWorkDetails] = useState({});
  const [gestores, setGestores] = useState({});
  const messageEndRef = useRef(null);

  useEffect(() => {
    // Scroll para o final das mensagens quando são carregadas ou atualizadas
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    
    // Processar parâmetros da URL para ver se há uma conversa a ser aberta
    const queryParams = new URLSearchParams(location.search);
    const conversationId = queryParams.get('conversation');
    
    loadConversations(conversationId);
  }, [user, location.search]);

  const loadConversations = async (targetConversationId = null) => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      // Buscar todas as conversas onde o técnico é participante
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      // Processar as conversas e buscar detalhes dos trabalhos e gestores
      const conversationsData = [];
      const workIds = new Set();
      const gestorIds = new Set();
      
      querySnapshot.forEach(doc => {
        const conversation = {
          id: doc.id,
          ...doc.data()
        };
        
        // Obter IDs de obras e gestores para carregar detalhes
        if (conversation.workId) {
          workIds.add(conversation.workId);
        }
        
        // Encontrar o ID do gestor (que não é o usuário atual)
        conversation.participants.forEach(participantId => {
          if (participantId !== user.uid) {
            gestorIds.add(participantId);
          }
        });
        
        conversationsData.push(conversation);
      });
      
      setConversations(conversationsData);
      
      // Carregar detalhes das obras
      const workDetailsMap = {};
      for (const workId of workIds) {
        const workDoc = await getDoc(doc(db, 'works', workId));
        if (workDoc.exists()) {
          workDetailsMap[workId] = workDoc.data();
        }
      }
      setWorkDetails(workDetailsMap);
      
      // Carregar detalhes dos gestores
      const gestoresMap = {};
      for (const gestorId of gestorIds) {
        const gestorDoc = await getDoc(doc(db, 'users', gestorId));
        if (gestorDoc.exists()) {
          gestoresMap[gestorId] = gestorDoc.data();
        }
      }
      setGestores(gestoresMap);
      
      // Se há um conversationId específico para abrir
      if (targetConversationId) {
        const targetConversation = conversationsData.find(c => c.id === targetConversationId);
        if (targetConversation) {
          setSelectedConversation(targetConversation);
          loadMessages(targetConversationId);
        }
      }
      
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    
    try {
      // Configurar listener para mensagens da conversa selecionada
      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messagesData);
      });
      
      // Retornar função para desinscrever do listener quando a conversa mudar
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  // Selecionar uma conversa e carregar suas mensagens
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    
    // Atualizar URL para refletir a conversa selecionada
    navigate(`/dashtecnico/mensagens?conversation=${conversation.id}`, { replace: true });
    
    // Limpar mensagens anteriores e carregar novas
    setMessages([]);
    loadMessages(conversation.id);
  };

  // Enviar uma nova mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedConversation?.id) return;
    
    try {
      const messagesRef = collection(db, `conversations/${selectedConversation.id}/messages`);
      
      // Adicionar a mensagem
      await addDoc(messagesRef, {
        text: messageText.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp(),
        read: false
      });
      
      // Atualizar o último timestamp e mensagem da conversa
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      await updateDoc(conversationRef, {
        lastMessageAt: serverTimestamp(),
        lastMessage: messageText.trim()
      });
      
      // Limpar o campo de texto
      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Por favor, tente novamente.');
    }
  };

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  // Encontrar o nome do gestor para uma conversa
  const getGestorName = (conversation) => {
    if (!conversation || !conversation.participants) return 'Desconhecido';
    
    const gestorId = conversation.participants.find(id => id !== user.uid);
    if (!gestorId) return 'Desconhecido';
    
    return gestores[gestorId]?.name || gestores[gestorId]?.email || gestores[gestorId]?.empresaNome || 'Gestor';
  };

  // Encontrar o título da obra de uma conversa
  const getWorkTitle = (conversation) => {
    if (!conversation || !conversation.workId) return 'Obra não especificada';
    
    return conversation.workTitle || workDetails[conversation.workId]?.title || 'Obra';
  };

  // Filtrar conversas com base no termo de busca
  const filteredConversations = conversations.filter(conversation => {
    const gestorName = getGestorName(conversation).toLowerCase();
    const workTitle = getWorkTitle(conversation).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return gestorName.includes(searchLower) || workTitle.includes(searchLower);
  });

  // Formatar timestamp para exibição
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString();
    }
  };

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
        {loading ? (
          <div className="loading">Carregando conversas...</div>
        ) : (
          <>
            <div className="conversations-sidebar">
              <div className="search-bar">
                <FiSearch className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Pesquisar conversas" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="conversations-list">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map(conversation => (
                    <div 
                      key={conversation.id} 
                      className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="conversation-icon">
                        <FiMessageCircle />
                      </div>
                      <div className="conversation-info">
                        <div className="conversation-header">
                          <h3>{getGestorName(conversation)}</h3>
                          <span className="conversation-time">
                            {formatTimestamp(conversation.lastMessageAt)}
                          </span>
                        </div>
                        <div className="conversation-subheader">
                          <span className="work-title">{getWorkTitle(conversation)}</span>
                        </div>
                        <p className="conversation-preview">
                          {conversation.lastMessage || 'Conversa iniciada'}
                        </p>
                      </div>
                      <FiChevronRight className="conversation-arrow" />
                    </div>
                  ))
                ) : (
                  <div className="no-conversations">
                    <FiInfo />
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="messages-content">
              {selectedConversation ? (
                <>
                  <div className="chat-header">
                    <div className="chat-info">
                      <h2>{getGestorName(selectedConversation)}</h2>
                      <p>{getWorkTitle(selectedConversation)}</p>
                    </div>
                  </div>
                  
                  <div className="chat-messages">
                    {messages.map(message => {
                      const isCurrentUser = message.senderId === user.uid;
                      const isSystem = message.senderId === 'system';
                      
                      return (
                        <div 
                          key={message.id} 
                          className={`message ${isCurrentUser ? 'outgoing' : isSystem ? 'system' : 'incoming'}`}
                        >
                          {isSystem ? (
                            <div className="system-message">
                              {message.text}
                            </div>
                          ) : (
                            <>
                              <div className="message-bubble">
                                {message.text}
                              </div>
                              <div className="message-time">
                                {formatTimestamp(message.timestamp)}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messageEndRef} />
                  </div>
                  
                  <form className="chat-input" onSubmit={handleSendMessage}>
                    <input 
                      type="text" 
                      placeholder="Escreva uma mensagem..." 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                    />
                    <button type="submit" className="send-button" disabled={!messageText.trim()}>
                      <FiSend />
                    </button>
                  </form>
                </>
              ) : (
                <div className="no-conversation-selected">
                  <div className="no-conversation-icon">
                    <FiMessageCircle />
                  </div>
                  <h3>Selecione uma conversa</h3>
                  <p>Escolha uma conversa existente ou inicie uma nova a partir de uma obra.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages; 