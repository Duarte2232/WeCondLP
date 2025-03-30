import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiSearch, FiMessageCircle, FiUser, FiPaperclip, FiSmile, FiPlus } from 'react-icons/fi';
import './Messages.css';
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../../contexts/auth';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messageInputRef = useRef(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesListRef = useRef(null);
  
  // Estado para armazenar informações da conversa atual
  const [activeConversation, setActiveConversation] = useState(null);
  
  // Lista de conversas e mensagens
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [gestoresInfo, setGestoresInfo] = useState({});
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Função para buscar informações do gestor no Firebase
  const fetchGestorInfo = async (gestorId) => {
    try {
      console.log('Buscando informações do gestor:', gestorId);
      
      // Verifica se já temos as informações deste gestor em cache
      if (gestoresInfo[gestorId]) {
        return gestoresInfo[gestorId];
      }
      
      // Busca o documento do gestor no Firebase
      const gestorDoc = await getDoc(doc(db, 'users', gestorId));
      
      if (!gestorDoc.exists()) {
        console.log('Gestor não encontrado:', gestorId);
        return null;
      }
      
      const gestorData = gestorDoc.data();
      console.log('Dados do gestor:', gestorData);
      
      // Salva as informações no estado para uso futuro
      const gestorInfo = {
        nome: gestorData.empresaNome || gestorData.nome || 'Empresa',
        tipo: gestorData.empresaTipo || 'Gestor'
      };
      
      setGestoresInfo(prev => ({
        ...prev,
        [gestorId]: gestorInfo
      }));
      
      return gestorInfo;
    } catch (error) {
      console.error('Erro ao buscar informações do gestor:', error);
      return null;
    }
  };
  
  // Efeito para verificar se foi redirecionado do Jobs com uma conversa para iniciar
  useEffect(() => {
    const workId = localStorage.getItem('currentWorkId');
    const gestorId = localStorage.getItem('currentGestorId');
    const workTitle = localStorage.getItem('currentWorkTitle');
    
    // Se não há dados no localStorage ou já está inicializando, não faz nada
    if (!workId || !gestorId || isInitializing) return;
    
    const initializeConversation = async () => {
      try {
        // Marca que está inicializando para evitar inicializações duplicadas
        setIsInitializing(true);
        
        console.log('Inicializando conversa com:', { workId, gestorId, workTitle });
        
        // Buscar informações do gestor no Firebase
        const gestorInfo = await fetchGestorInfo(gestorId);
        
        if (!gestorInfo) {
          console.log('Não foi possível obter informações do gestor, usando valores padrão');
        }
        
        // Criar um ID único para a conversa
        const conversationId = `work-${workId}-gestor-${gestorId}`;
        
        // Verificar se esta conversa já existe
        const existingConversationIndex = conversations.findIndex(
          conv => conv.id === conversationId
        );
        
        if (existingConversationIndex >= 0) {
          // Se a conversa já existe, apenas a torna ativa
          setActiveConversation(conversations[existingConversationIndex]);
        } else {
          // Criar uma conversa com o gestor/empresa
          const newConversation = {
            id: conversationId,
            name: gestorInfo?.nome || 'Empresa',
            apt: `${gestorInfo?.tipo || 'Gestor'} • Obra: ${workTitle || workId}`,
            lastMessage: 'Nova conversa iniciada',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            isOnline: true,
            workId,
            gestorId
          };
          
          // Se a conversa não existe, adiciona à lista e torna ativa
          setConversations(prevConversations => [newConversation, ...prevConversations]);
          setActiveConversation(newConversation);
        }
      } catch (error) {
        console.error('Erro ao inicializar conversa:', error);
      } finally {
        // Limpe o localStorage após usar, independente do resultado
        localStorage.removeItem('currentWorkId');
        localStorage.removeItem('currentGestorId');
        localStorage.removeItem('currentWorkTitle');
        
        // Marca que terminou a inicialização
        setIsInitializing(false);
      }
    };
    
    initializeConversation();
  }, []);  // Removida a dependência de conversations
  
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
    // Criação de conversa de suporte
    const newConversation = {
      id: `new-${Date.now()}`,
      name: "WeCond Suporte",
      apt: 'Suporte Técnico',
      lastMessage: 'Conversa iniciada',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      isOnline: true
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation);
  };

  // Função para enviar mensagem
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;
    
    // Cria nova mensagem
    const newMessage = {
      id: `msg-${Date.now()}`,
      text: messageText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Adiciona mensagem ao estado
    setMessages(prev => [...prev, newMessage]);
    
    // Atualiza a última mensagem da conversa ativa
    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeConversation.id 
          ? {...conv, lastMessage: messageText, time: newMessage.time} 
          : conv
      )
    );
    
    // Limpa o campo de texto
    setMessageText('');
    
    // Simula resposta automática após 1 segundo
    setTimeout(() => {
      const autoReply = {
        id: `msg-${Date.now()}`,
        text: 'Mensagem recebida. Nossa equipe entrará em contato em breve para discutir mais detalhes sobre a obra.',
        sender: 'other',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, autoReply]);
    }, 1000);
  };
  
  // Função para selecionar uma conversa
  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    
    // Limpa as mensagens atuais (em um cenário real, aqui buscaríamos as mensagens desta conversa)
    setMessages([]);
    
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Filtrar conversas baseado na pesquisa
  const filteredConversations = conversations.filter(conv => 
    (conv.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (conv.apt?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (conv.lastMessage?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="messages-app">
      <header className="messages-header">
        <h1>Mensagens</h1>
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
        <aside className="conversations-sidebar">
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
                      <h3>{conversation.name}</h3>
                      <span className="time">{conversation.time}</span>
                    </div>
                    <p className="apartment">{conversation.apt}</p>
                    <p className="preview-message">{conversation.lastMessage}</p>
                  </div>
                  {conversation.unread > 0 && (
                    <div className="unread-badge">{conversation.unread}</div>
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
                    <h3>{activeConversation.name}</h3>
                    <p>{activeConversation.apt}</p>
                  </div>
                </div>
              </div>
              
              {/* Mensagens */}
              <div className="messages-list" ref={messagesListRef}>
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message.id} className={`message ${message.sender === 'me' ? 'outgoing' : 'incoming'}`}>
                      <div className="message-content">
                        <p>{message.text}</p>
                        <span className="message-time">{message.time}</span>
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
  );
};

export default Messages; 