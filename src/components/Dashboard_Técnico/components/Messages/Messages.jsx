import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiSearch, FiMessageCircle, FiUser, FiPaperclip, FiSmile, FiPlus, FiMenu, FiX } from 'react-icons/fi';
import './Messages.css';
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../../contexts/auth';
import * as messageService from '../../../../services/messageService';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messageInputRef = useRef(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesListRef = useRef(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Estado para armazenar informações da conversa atual
  const [activeConversation, setActiveConversation] = useState(null);
  const [pendingConversationId, setPendingConversationId] = useState(null);
  
  // Lista de conversas e mensagens
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState({});
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Função para formatar timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    // Se for um objeto Date, usar diretamente
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Função para buscar informações do usuário no Firestore
  const fetchUserInfo = async (userId) => {
    try {
      // Verificar se já temos as informações em cache
      if (participants[userId]) {
        return participants[userId];
      }
      
      // Buscar o documento do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        console.log('Usuário não encontrado:', userId);
        return null;
      }
      
      const userData = userDoc.data();
      
      // Determinar nome e tipo com base no perfil do usuário
      let nome = userData.nome;
      let tipo = 'Usuário';
      
      if (userData.perfilDeAcesso === 'gestor') {
        nome = userData.empresaNome || nome;
        tipo = userData.empresaTipo || 'Gestor';
      } else if (userData.perfilDeAcesso === 'tecnico') {
        tipo = 'Técnico';
      }
      
      const userInfo = { nome, tipo, ...userData };
      
      // Salvar as informações no estado para uso futuro
      setParticipants(prev => ({
        ...prev,
        [userId]: userInfo
      }));
      
      return userInfo;
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      return null;
    }
  };
  
  // Efeito para verificar se foi redirecionado com uma conversa para ativar
  useEffect(() => {
    if (!user?.uid) return;
    
    // Verifica primeiro se há um ID de conversa ativa no localStorage
    const activeConversationId = localStorage.getItem('activeConversationId');
    
    if (activeConversationId) {
      console.log('ID de conversa encontrado no localStorage:', activeConversationId);
      
      // Limpa o localStorage imediatamente para evitar reativações indesejadas
      localStorage.removeItem('activeConversationId');
      
      // Armazena o ID para ser usado quando as conversas forem carregadas
      setPendingConversationId(activeConversationId);
    }
  }, [user?.uid]);
  
  // Efeito para carregar as conversas do usuário atual
  useEffect(() => {
    if (!user?.uid) return;
    
    console.log('Carregando conversas do usuário:', user.uid);
    
    // Função para carregar e processar as conversas
    const loadConversations = async (conversationsData) => {
      console.log('Dados de conversas recebidos:', conversationsData);
      
      // Para cada conversa, buscar informações dos participantes
      const processedConversations = await Promise.all(
        conversationsData.map(async (conv) => {
          // Buscar informações de cada participante (exceto o usuário atual)
          const otherParticipantIds = conv.participants.filter(id => id !== user.uid);
          
          // Se não há outros participantes, mostrar como "Conversa vazia"
          if (otherParticipantIds.length === 0) {
            return {
              ...conv,
              displayName: 'Conversa vazia',
              displayInfo: 'Sem participantes',
              isOnline: false
            };
          }
          
          // Buscar informações do primeiro participante (normalmente teremos apenas um outro)
          const otherUserInfo = await fetchUserInfo(otherParticipantIds[0]);
          
          // Obter o título da obra da metadata
          const workTitle = conv.metadata?.workTitle || '';
          
          return {
            ...conv,
            displayName: otherUserInfo?.nome || 'Usuário',
            displayInfo: `${otherUserInfo?.tipo || 'Usuário'} ${workTitle ? `• Obra: ${workTitle}` : ''}`,
            isOnline: false // Eventualmente poderia implementar status online
          };
        })
      );
      
      setConversations(processedConversations);
      
      // Se existe um ID de conversa pendente, verificar se ela está na lista
      if (pendingConversationId) {
        const targetConv = processedConversations.find(conv => conv.id === pendingConversationId);
        
        if (targetConv) {
          console.log('Ativando conversa pendente:', targetConv);
          setActiveConversation(targetConv);
          setPendingConversationId(null);
        }
      }
    };
    
    // Inscrever-se para receber atualizações das conversas
    const unsubscribe = messageService.getUserConversations(user.uid, loadConversations);
    
    // Limpar inscrição ao desmontar
    return () => unsubscribe();
  }, [user?.uid, pendingConversationId]);
  
  // Efeito para verificar se foi redirecionado do Jobs com uma conversa para iniciar
  useEffect(() => {
    if (!user?.uid) return;
    
    // Verifica o método antigo por compatibilidade
    const workId = localStorage.getItem('currentWorkId');
    const gestorId = localStorage.getItem('currentGestorId');
    const workTitle = localStorage.getItem('currentWorkTitle');
    
    // Se não há dados no localStorage ou já está inicializando, não faz nada
    if (!workId || !gestorId || isInitializing) return;
    
    console.log('Iniciando conversa a partir dos dados do localStorage:', { workId, gestorId, workTitle });
    
    const initializeConversation = async () => {
      try {
        // Marca que está inicializando para evitar inicializações duplicadas
        setIsInitializing(true);
        
        // Iniciar conversa entre técnico e gestor usando o messageService
        const conversationId = await messageService.startTecnicoGestorConversation(
          user.uid,
          gestorId,
          workId,
          workTitle
        );
        
        console.log('Conversa inicializada com ID:', conversationId);
        
        // A conversa deve aparecer automaticamente na lista devido ao listener em useEffect
        // Identificar a conversa na lista de conversas e ativá-la
        const targetConversation = conversations.find(conv => conv.id === conversationId);
        
        if (targetConversation) {
          console.log('Ativando conversa:', targetConversation);
          setActiveConversation(targetConversation);
        } else {
          // Se a conversa ainda não está na lista, armazena o ID para ser usado quando as conversas forem carregadas
          setPendingConversationId(conversationId);
        }
      } catch (error) {
        console.error('Erro ao inicializar conversa:', error);
      } finally {
        // Limpa o localStorage após usar, independente do resultado
        localStorage.removeItem('currentWorkId');
        localStorage.removeItem('currentGestorId');
        localStorage.removeItem('currentWorkTitle');
        
        // Marca que terminou a inicialização
        setIsInitializing(false);
      }
    };
    
    initializeConversation();
  }, [isInitializing, user?.uid, conversations]);
  
  // Efeito para carregar mensagens quando uma conversa é selecionada
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    
    console.log('Carregando mensagens da conversa:', activeConversation.id);
    
    // Marcar conversa como lida
    messageService.markConversationAsRead(activeConversation.id, user.uid)
      .catch(error => console.error('Erro ao marcar conversa como lida:', error));
    
    // Inscrever-se para receber atualizações das mensagens
    const unsubscribe = messageService.getConversationMessages(activeConversation.id, (messagesData) => {
      console.log('Mensagens recebidas:', messagesData);
      setMessages(messagesData);
    });
    
    // Limpar inscrição ao desmontar ou trocar de conversa
    return () => unsubscribe();
  }, [activeConversation, user?.uid]);
  
  // Efeito para rolar para o final da lista de mensagens
  useEffect(() => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  }, [activeConversation, messages]);

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  // Função para criar nova conversa
  const handleNewConversation = () => {
    console.log('Criar nova conversa');
    // Para uma conversa com o suporte, precisaríamos implementar
    // a lógica para selecionar um destinatário ou criar um chat automático com o suporte
    // Por simplicidade, apenas mostramos um alerta
    alert('Funcionalidade de nova conversa será implementada em breve.');
  };

  // Função para enviar mensagem
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;
    
    // Enviar mensagem através do messageService
    messageService.sendMessage(activeConversation.id, {
      text: messageText,
      senderId: user.uid,
      metadata: {}
    }).then(messageId => {
      console.log('Mensagem enviada com ID:', messageId);
      // Não precisamos atualizar o estado manualmente pois o listener fará isso
      
      // Limpa o campo de texto
      setMessageText('');
    }).catch(error => {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    });
  };
  
  // Função para alternar a visibilidade da barra lateral em dispositivos móveis
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };
  
  // Função para selecionar uma conversa
  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    
    // Em dispositivos móveis, fechar a barra lateral ao selecionar uma conversa
    setSidebarVisible(false);
    
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Filtrar conversas baseado na pesquisa
  const filteredConversations = conversations.filter(conv => 
    (conv.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (conv.displayInfo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (conv.lastMessage?.text?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="messages-app-container">
      <div className="messages-app">
        <header className="messages-header">
          <div className="header-left">
            <button 
              className="menu-button mobile-only" 
              onClick={toggleSidebar}
              aria-label="Menu de conversas"
            >
              {sidebarVisible ? <FiX /> : <FiMenu />}
            </button>
            <h1>Mensagens</h1>
          </div>
          <button 
            className="new-conversation-btn" 
            onClick={handleNewConversation}
            aria-label="Nova conversa"
          >
            <FiPlus />
            <span>Nova Conversa</span>
          </button>
        </header>
        
        <div className="messages-content">
          {/* Sidebar com lista de conversas */}
          <aside className={`conversations-sidebar ${sidebarVisible ? 'active' : ''}`}>
            <div className="search-container">
              <div className="search-bar">
                <FiSearch className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Pesquisar conversas..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="conversations-list">
              {filteredConversations.length === 0 ? (
                <div className="empty-conversations">
                  <FiMessageCircle size={32} />
                  <p>Nenhuma conversa encontrada</p>
                  <p>Use o botão "Nova Conversa" ou inicie uma conversa a partir de uma obra.</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div 
                    key={conversation.id} 
                    className={`conversation-item ${activeConversation?.id === conversation.id ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="avatar">
                      <FiUser />
                      {conversation.isOnline && <span className="status-indicator"></span>}
                    </div>
                    <div className="conversation-content">
                      <div className="conversation-header">
                        <h3>{conversation.displayName}</h3>
                        <span className="time">{formatTimestamp(conversation.lastMessage?.timestamp)}</span>
                      </div>
                      <p className="apartment">{conversation.displayInfo}</p>
                      <p className="preview-message">{conversation.lastMessage?.text || 'Nova conversa'}</p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="unread-badge">{conversation.unreadCount}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
          
          {/* Área de chat */}
          <main className="chat-area">
            {activeConversation ? (
              <>
                {/* Cabeçalho do chat */}
                <div className="chat-header">
                  <div className="chat-contact-info">
                    <div className="avatar">
                      <FiUser />
                      {activeConversation.isOnline && <span className="status-indicator"></span>}
                    </div>
                    <div>
                      <h3>{activeConversation.displayName}</h3>
                      <p>{activeConversation.displayInfo}</p>
                    </div>
                  </div>
                </div>
                
                {/* Mensagens */}
                <div className="messages-list" ref={messagesListRef}>
                  {messages.length > 0 ? (
                    messages.map((message) => (
                      <div key={message.id} className={`message ${message.senderId === user.uid ? 'outgoing' : 'incoming'}`}>
                        <div className="message-content">
                          <p>{message.text}</p>
                          <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-chat-content">
                      <FiMessageCircle size={40} />
                      <h3>Nenhuma mensagem</h3>
                      <p>Esta conversa ainda não tem mensagens. Comece a interagir agora!</p>
                    </div>
                  )}
                </div>
                
                {/* Área de input */}
                <form className="message-input-area" onSubmit={handleSendMessage}>
                  <button 
                    type="button" 
                    className="attachment-button"
                    aria-label="Anexar arquivo"
                  >
                    <FiPaperclip />
                  </button>
                  <input 
                    ref={messageInputRef}
                    type="text" 
                    placeholder="Digite uma mensagem..." 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="emoji-button"
                    onClick={() => setShowEmojis(!showEmojis)}
                    aria-label="Inserir emoji"
                  >
                    <FiSmile />
                  </button>
                  <button 
                    type="submit" 
                    className="send-button" 
                    disabled={!messageText.trim()}
                    aria-label="Enviar mensagem"
                  >
                    <FiSend />
                  </button>
                </form>
              </>
            ) : (
              <div className="no-conversation-selected">
                <FiMessageCircle size={48} />
                <h3>Nenhuma conversa selecionada</h3>
                <p>Selecione uma conversa para começar a enviar mensagens</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Messages; 