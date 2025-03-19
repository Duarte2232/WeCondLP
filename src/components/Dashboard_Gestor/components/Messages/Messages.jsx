import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiSearch, FiMessageCircle, FiChevronRight, FiHome } from 'react-icons/fi';
import './Messages.css';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/auth';

const Messages = () => {
  const navigate = useNavigate();
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
  const [technicians, setTechnicians] = useState({});
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    
    const loadWorks = async () => {
      try {
        const worksRef = collection(db, 'works');
        const worksQuery = query(worksRef, where('userEmail', '==', user.email));
        const snapshot = await getDocs(worksQuery);
        
        const worksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setWorks(worksData);
        
        // Criar um mapa de detalhes de obras para uso rápido
        const workDetailsMap = {};
        worksData.forEach(work => {
          workDetailsMap[work.id] = {
            title: work.title,
            description: work.description,
            category: work.category,
            status: work.status
          };
        });
        
        setWorkDetails(workDetailsMap);
      } catch (error) {
        console.error('Erro ao carregar obras:', error);
      }
    };
    
    loadWorks();
    loadConversations();
  }, [user]);
  
  useEffect(() => {
    // Sempre role para o final quando mensagens mudam
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      
      // Carregar informações do técnico se ainda não estiverem carregadas
      if (!technicians[selectedConversation.technicianId]) {
        loadTechnicianInfo(selectedConversation.technicianId);
      }
    }
  }, [selectedConversation]);
  
  const loadTechnicianInfo = async (technicianId) => {
    try {
      const technicianDoc = await getDoc(doc(db, 'users', technicianId));
      if (technicianDoc.exists()) {
        const techData = technicianDoc.data();
        setTechnicians(prev => ({
          ...prev,
          [technicianId]: {
            nome: techData.nome || 'Técnico',
            sobrenome: techData.sobrenome || '',
            email: techData.email || '',
            photoURL: techData.photoURL || null
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar informações do técnico:', error);
    }
  };
  
  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageAt', 'desc')
      );
      
      // Usar onSnapshot para atualização em tempo real
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const conversationsData = [];
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          
          // Determinar qual é o ID do técnico (o outro participante)
          const technicianId = data.participants.find(id => id !== user.uid);
          
          // Se ainda não temos informações sobre este técnico, carregar
          if (technicianId && !technicians[technicianId]) {
            loadTechnicianInfo(technicianId);
          }
          
          conversationsData.push({
            id: doc.id,
            workId: data.workId,
            technicianId,
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt?.toDate(),
            unreadCount: data.unreadCount || 0
          });
        }
        
        setConversations(conversationsData);
        setLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      setLoading(false);
    }
  };
  
  const loadMessages = async (conversationId) => {
    try {
      const messagesRef = collection(db, `conversations/${conversationId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        
        setMessages(messagesData);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedConversation) return;
    
    try {
      const messageData = {
        text: messageText.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp()
      };
      
      // Adicionar a mensagem à coleção de mensagens da conversa
      const messagesRef = collection(db, `conversations/${selectedConversation.id}/messages`);
      await addDoc(messagesRef, messageData);
      
      // Atualizar informações da conversa
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      await getDoc(conversationRef).then(docSnap => {
        if (docSnap.exists()) {
          const conversationData = docSnap.data();
          
          // Atualizar o documento da conversa
          return conversationRef.update({
            lastMessage: messageText.trim(),
            lastMessageAt: serverTimestamp(),
            // Incrementar contador de não lidas para o outro participante
            [`unreadCount.${selectedConversation.technicianId}`]: 
              (conversationData.unreadCount?.[selectedConversation.technicianId] || 0) + 1
          });
        }
      });
      
      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };
  
  const handleBack = () => {
    navigate('/dashgestor');
  };
  
  const filteredConversations = conversations.filter(conversation => {
    if (!searchTerm) return true;
    
    const technicianInfo = technicians[conversation.technicianId] || {};
    const workInfo = workDetails[conversation.workId] || {};
    
    const technicianName = `${technicianInfo.nome || ''} ${technicianInfo.sobrenome || ''}`.toLowerCase();
    const workTitle = (workInfo.title || '').toLowerCase();
    
    return technicianName.includes(searchTerm.toLowerCase()) || 
           workTitle.includes(searchTerm.toLowerCase());
  });
  
  const formatDate = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const messageDate = new Date(date);
    
    // Se a mensagem é de hoje, mostrar apenas a hora
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Se a mensagem é deste ano, mostrar dia e mês
    if (messageDate.getFullYear() === now.getFullYear()) {
      return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
    
    // Se a mensagem é de outro ano, mostrar dia, mês e ano
    return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <div className="messages-container">
      <div className="messages-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1>Mensagens</h1>
      </div>
      
      <div className="messages-content">
        <div className="messages-layout">
          {/* Painel esquerdo - Lista de conversas */}
          <div className="conversations-panel">
            <div className="conversations-header">
              <h2>Conversas</h2>
              <div className="search-bar">
                <FiSearch />
                <input 
                  type="text" 
                  placeholder="Procurar..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="conversations-list">
              {loading ? (
                <div className="loading-indicator">Carregando conversas...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="empty-state">
                  <FiMessageCircle size={40} />
                  <p>Nenhuma conversa encontrada</p>
                  {searchTerm && <p>Tente outro termo de pesquisa</p>}
                </div>
              ) : (
                filteredConversations.map(conversation => {
                  const technicianInfo = technicians[conversation.technicianId] || {};
                  const workInfo = workDetails[conversation.workId] || {};
                  
                  return (
                    <div 
                      key={conversation.id}
                      className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="conversation-avatar">
                        {technicianInfo.photoURL ? (
                          <img src={technicianInfo.photoURL} alt="Avatar" />
                        ) : (
                          <div className="avatar-placeholder">
                            {technicianInfo.nome ? technicianInfo.nome.charAt(0).toUpperCase() : "T"}
                          </div>
                        )}
                      </div>
                      <div className="conversation-details">
                        <div className="conversation-header">
                          <h3>{technicianInfo.nome || 'Técnico'} {technicianInfo.sobrenome || ''}</h3>
                          <span className="conversation-date">{formatDate(conversation.lastMessageAt)}</span>
                        </div>
                        <div className="conversation-work">
                          <span>Obra: {workInfo.title || 'Sem título'}</span>
                        </div>
                        <p className="conversation-preview">{conversation.lastMessage || 'Sem mensagens'}</p>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="unread-badge">{conversation.unreadCount}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Painel direito - Chat ou placeholder */}
          <div className="chat-panel">
            {selectedConversation ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-user">
                    <div className="chat-avatar">
                      {technicians[selectedConversation.technicianId]?.photoURL ? (
                        <img src={technicians[selectedConversation.technicianId].photoURL} alt="Avatar" />
                      ) : (
                        <div className="avatar-placeholder">
                          {technicians[selectedConversation.technicianId]?.nome 
                            ? technicians[selectedConversation.technicianId].nome.charAt(0).toUpperCase() 
                            : "T"}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3>{technicians[selectedConversation.technicianId]?.nome || 'Técnico'} {technicians[selectedConversation.technicianId]?.sobrenome || ''}</h3>
                      <p className="chat-subheader">Técnico</p>
                    </div>
                  </div>
                  <div className="chat-work-info">
                    <div className="work-badge">
                      <FiHome />
                      <span>Obra: {workDetails[selectedConversation.workId]?.title || 'Sem título'}</span>
                    </div>
                    {workDetails[selectedConversation.workId]?.category && (
                      <div className="category-badge">
                        {workDetails[selectedConversation.workId].category}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="empty-chat">
                      <FiMessageCircle size={50} />
                      <p>Nenhuma mensagem ainda</p>
                      <p>Comece a conversar agora</p>
                    </div>
                  ) : (
                    messages.map(message => (
                      <div 
                        key={message.id} 
                        className={`message ${message.senderId === user.uid ? 'my-message' : 'other-message'}`}
                      >
                        <div className="message-content">
                          <p>{message.text}</p>
                          <span className="message-time">
                            {message.timestamp ? formatDate(message.timestamp) : 'Enviando...'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messageEndRef} />
                </div>
                
                <form className="chat-input" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Escreva sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="send-button"
                    disabled={!messageText.trim()}
                  >
                    <FiSend />
                  </button>
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                <FiMessageCircle size={60} />
                <h3>Nenhuma conversa selecionada</h3>
                <p>Selecione uma conversa para começar a enviar mensagens</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages; 