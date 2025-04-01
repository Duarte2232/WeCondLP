import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiPaperclip, FiPlus, FiUser } from 'react-icons/fi';
import { getAuth } from 'firebase/auth';
import { ref, onValue, push, set, serverTimestamp, get, update } from 'firebase/database';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db, database } from '../../../../services/firebase.jsx';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();
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

    const loadConversations = async () => {
      try {
        // Buscar obras onde o gestor é o dono
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where('userId', '==', auth.currentUser.uid));
        const worksSnapshot = await getDocs(q);
        
        const conversationsData = [];
        
        for (const workDoc of worksSnapshot.docs) {
          const workData = workDoc.data();
          
          // Verificar se a obra tem um técnico atribuído
          if (workData.technicianId) {
            // Buscar dados do técnico
            const technicianDoc = await getDoc(doc(db, 'users', workData.technicianId));
            const technicianData = technicianDoc.data();

            // Criar ID único para o chat
            const chatId = [auth.currentUser.uid, workData.technicianId].sort().join('_');
            
            // Buscar mensagens
            const messagesRef = ref(database, `chats/${chatId}/messages`);
            const messagesSnapshot = await get(messagesRef);
            const messages = messagesSnapshot.val();
            
            let lastMessage = null;
            let unreadCount = 0;
            
            if (messages) {
              const messagesArray = Object.values(messages);
              lastMessage = messagesArray[messagesArray.length - 1];
              
              // Contar mensagens não lidas
              unreadCount = messagesArray.filter(msg => 
                msg.senderId !== auth.currentUser.uid && !msg.read
              ).length;
            }

            conversationsData.push({
              chatId,
              technicianId: workData.technicianId,
              technicianName: technicianData?.empresaNome || technicianData?.name || 'Técnico',
              obraId: workDoc.id,
              obraTitle: workData.title,
              lastMessage: lastMessage?.text || '',
              timestamp: lastMessage?.timestamp || null,
              unreadCount
            });
          }
        }

        // Ordenar conversas pela última mensagem
        conversationsData.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return b.timestamp - a.timestamp;
        });

        setConversations(conversationsData);
        
        // Se não houver conversa selecionada e houver conversas disponíveis, selecionar a primeira
        if (!selectedConversation && conversationsData.length > 0) {
          setSelectedConversation(conversationsData[0]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        setLoading(false);
        setError('Erro ao carregar conversas');
      }
    };

    loadConversations();
  }, [auth.currentUser, selectedConversation]);

  // Listen for new messages in all conversations
  useEffect(() => {
    if (!auth.currentUser || !conversations.length) return;

    const unsubscribeListeners = conversations.map(conversation => {
      const messagesRef = ref(database, `chats/${conversation.chatId}/messages`);
      return onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messagesArray = Object.values(data);
          const lastMessage = messagesArray[messagesArray.length - 1];
          
          // Set unread count to 0 if this conversation is currently selected
          const isSelected = selectedConversation?.chatId === conversation.chatId;
          
          // Only update unread messages if this is not the selected conversation
          if (!isSelected) {
            // Only count messages as unread if they're from the other user and not marked as read
            const unreadCount = messagesArray.filter(msg => 
              msg.senderId !== auth.currentUser.uid && !msg.read
            ).length;

            // Update conversations state with unread count
            setConversations(prevConversations => 
              prevConversations.map(conv => 
                conv.chatId === conversation.chatId
                  ? { 
                      ...conv, 
                      lastMessage: lastMessage?.text || '',
                      timestamp: lastMessage?.timestamp || null,
                      unreadCount: unreadCount
                    }
                  : conv
              )
            );
          } else {
            // For selected conversation, update last message without changing unread count
            setConversations(prevConversations => 
              prevConversations.map(conv => 
                conv.chatId === conversation.chatId
                  ? { 
                      ...conv, 
                      lastMessage: lastMessage?.text || '',
                      timestamp: lastMessage?.timestamp || null,
                      // Keep unread count at 0 for selected conversation
                      unreadCount: 0
                    }
                  : conv
              )
            );

            // Check if this is a new message (not initial load)
            const oldMessages = messages;
            
            // If this is the selected conversation, update messages and mark them as read
            // Map messages with their IDs
            const sortedMessages = Object.entries(data)
              .map(([id, message]) => ({
                id,
                ...message
              }))
              .sort((a, b) => {
                const aTime = a.timestamp?.seconds || a.timestamp;
                const bTime = b.timestamp?.seconds || b.timestamp;
                return aTime - bTime; // Sort in ascending order (oldest to newest)
              });
            
            // Update the messages state
            setMessages(sortedMessages);
            
            // Find messages that need to be marked as read
            const updates = {};
            Object.entries(data).forEach(([messageId, message]) => {
              if (message.senderId !== auth.currentUser.uid && !message.read) {
                updates[`${messageId}/read`] = true;
              }
            });
            
            // Update read status in Firebase if there are unread messages
            if (Object.keys(updates).length > 0) {
              update(ref(database, `chats/${conversation.chatId}/messages`), updates);
            }
            
            // Only scroll to bottom if:
            // 1. This is a new message (more messages than before)
            // 2. The new message is from the current user
            const hasNewMessages = sortedMessages.length > oldMessages.length;
            if (hasNewMessages) {
              const lastMsg = sortedMessages[sortedMessages.length - 1];
              const isFromCurrentUser = lastMsg.senderId === auth.currentUser.uid;
              
              if (isFromCurrentUser) {
                // Always scroll to bottom for user's own messages
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              } else {
                // For other users' messages, only scroll if near bottom
                const messagesContent = document.querySelector('.messages-content');
                if (messagesContent) {
                  const isNearBottom = messagesContent.scrollHeight - messagesContent.clientHeight - messagesContent.scrollTop < 100;
                  if (isNearBottom) {
                    setTimeout(() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }
                }
              }
            }
          }
        } else {
          // If there's no data, set empty messages array for the selected conversation
          if (selectedConversation?.chatId === conversation.chatId) {
            setMessages([]);
          }
        }
      });
    });

    return () => {
      unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    };
  }, [auth.currentUser, conversations, selectedConversation, messages]);

  // Remove scroll to bottom when selecting a conversation - will be handled in handleConversationSelect
  useEffect(() => {
    if (selectedConversation) {
      // Wait for messages to load before scrolling
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [selectedConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const messagesRef = ref(database, `chats/${selectedConversation.chatId}/messages`);
      const newMessageRef = push(messagesRef);

      const currentTime = new Date().getTime();

      await set(newMessageRef, {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: userData?.empresaNome || userData?.name || 'Gestor',
        timestamp: currentTime,
        read: false
      });

      setNewMessage('');
      setError(null);
      
      // Scroll to bottom after sending message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      if (error.message.includes('PERMISSION_DENIED')) {
        setError('Erro de permissão: Você não tem permissão para enviar mensagens neste chat. Por favor, tente fazer login novamente.');
      } else {
        setError('Erro ao enviar mensagem. Por favor, tente novamente.');
      }
    }
  };

  const handleConversationSelect = async (conversation) => {
    setSelectedConversation(conversation);
    
    // We don't need to mark messages as read here as the listener will handle it
    
    // Update local state immediately
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.chatId === conversation.chatId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
    
    // Scroll to bottom when selecting a conversation, but only after a small delay to ensure messages are loaded
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
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
                key={conversation.chatId}
                className={`conversation-item ${selectedConversation?.chatId === conversation.chatId ? 'active' : ''}`}
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
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form className="message-input-form" onSubmit={handleSendMessage}>
                <div className="message-input-container">
                  <textarea
                    className="message-input"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    rows="1"
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