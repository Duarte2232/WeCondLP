import { rtdb } from './firebase';
import { ref, push, set, get, onValue, update, remove, query, orderByChild, serverTimestamp } from 'firebase/database';

// Estrutura do banco:
// /conversations/{conversationId}
// /messages/{conversationId}/{messageId}
// /user_conversations/{userId}/{conversationId}

/**
 * Cria uma nova conversa entre usuários
 * @param {Object} conversationData - Dados da conversa
 * @param {string} conversationData.title - Título da conversa (opcional)
 * @param {Array} conversationData.participants - IDs dos participantes
 * @param {Object} conversationData.metadata - Metadados como workId, workTitle, etc.
 * @returns {Promise<string>} ID da conversa criada
 */
export const createConversation = async (conversationData) => {
  try {
    // Garantir que temos os dados essenciais
    if (!conversationData.participants || conversationData.participants.length < 2) {
      throw new Error('Uma conversa precisa de pelo menos 2 participantes');
    }

    // Referência para o nó de conversas
    const conversationsRef = ref(rtdb, 'conversations');
    
    // Criar uma nova chave para a conversa
    const newConvRef = push(conversationsRef);
    const conversationId = newConvRef.key;
    
    // Prepara dados da conversa
    const convData = {
      title: conversationData.title || '',
      participants: conversationData.participants,
      metadata: conversationData.metadata || {},
      createdAt: serverTimestamp(),
      lastMessage: {
        text: 'Conversa iniciada',
        timestamp: serverTimestamp(),
        senderId: conversationData.participants[0]
      }
    };
    
    // Salvar a conversa
    await set(newConvRef, convData);
    
    // Adicionar esta conversa ao registro de cada participante
    for (const userId of conversationData.participants) {
      const userConvRef = ref(rtdb, `user_conversations/${userId}/${conversationId}`);
      await set(userConvRef, {
        participantIds: conversationData.participants.filter(id => id !== userId),
        lastRead: null,
        unreadCount: 0
      });
    }
    
    return conversationId;
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    throw error;
  }
};

/**
 * Envia uma mensagem em uma conversa
 * @param {string} conversationId - ID da conversa
 * @param {Object} messageData - Dados da mensagem
 * @param {string} messageData.text - Texto da mensagem
 * @param {string} messageData.senderId - ID do remetente
 * @param {Object} messageData.metadata - Metadados como anexos, etc.
 * @returns {Promise<string>} ID da mensagem criada
 */
export const sendMessage = async (conversationId, messageData) => {
  try {
    // Referência para o nó de mensagens desta conversa
    const messagesRef = ref(rtdb, `messages/${conversationId}`);
    
    // Criar uma nova chave para a mensagem
    const newMessageRef = push(messagesRef);
    const messageId = newMessageRef.key;
    
    // Prepara dados da mensagem
    const msgData = {
      text: messageData.text,
      senderId: messageData.senderId,
      timestamp: serverTimestamp(),
      metadata: messageData.metadata || {}
    };
    
    // Salvar a mensagem
    await set(newMessageRef, msgData);
    
    // Atualizar lastMessage na conversa
    const convRef = ref(rtdb, `conversations/${conversationId}/lastMessage`);
    await set(convRef, {
      text: messageData.text,
      timestamp: serverTimestamp(),
      senderId: messageData.senderId
    });
    
    // Atualizar contagem de não lidas para outros participantes
    const convDetailsRef = ref(rtdb, `conversations/${conversationId}`);
    const convSnapshot = await get(convDetailsRef);
    
    if (convSnapshot.exists()) {
      const convData = convSnapshot.val();
      const participants = convData.participants || [];
      
      // Para cada participante (exceto o remetente), incrementa contador de não lidas
      for (const userId of participants) {
        if (userId !== messageData.senderId) {
          const userConvRef = ref(rtdb, `user_conversations/${userId}/${conversationId}`);
          const userConvSnapshot = await get(userConvRef);
          
          if (userConvSnapshot.exists()) {
            const userData = userConvSnapshot.val();
            const currentCount = userData.unreadCount || 0;
            
            await update(userConvRef, {
              unreadCount: currentCount + 1
            });
          }
        }
      }
    }
    
    return messageId;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

/**
 * Obtém todas as conversas de um usuário
 * @param {string} userId - ID do usuário
 * @param {function} callback - Função de callback para receber atualizações em tempo real
 * @returns {function} Função para remover o listener
 */
export const getUserConversations = (userId, callback) => {
  try {
    // Referência para as conversas do usuário
    const userConvsRef = ref(rtdb, `user_conversations/${userId}`);
    
    // Criar um listener para mudanças neste nó
    const unsubscribe = onValue(userConvsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const userConversations = snapshot.val();
      const conversationsWithDetails = [];
      
      // Para cada conversa do usuário, buscar os detalhes completos
      for (const [convId, userConvData] of Object.entries(userConversations)) {
        const convRef = ref(rtdb, `conversations/${convId}`);
        const convSnapshot = await get(convRef);
        
        if (convSnapshot.exists()) {
          const convData = convSnapshot.val();
          
          // Buscar detalhes dos outros participantes
          const otherParticipantIds = userConvData.participantIds || [];
          const participantsDetails = {};
          
          // Normalmente buscaríamos detalhes dos participantes do Firestore
          // mas por simplicidade apenas adicionamos os IDs
          
          conversationsWithDetails.push({
            id: convId,
            title: convData.title || '',
            participants: convData.participants || [],
            participantsDetails,
            lastMessage: convData.lastMessage || null,
            metadata: convData.metadata || {},
            unreadCount: userConvData.unreadCount || 0,
            lastRead: userConvData.lastRead || null
          });
        }
      }
      
      // Ordenar conversas pela data da última mensagem (mais recente primeiro)
      conversationsWithDetails.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0;
        const timeB = b.lastMessage?.timestamp || 0;
        return timeB - timeA;
      });
      
      callback(conversationsWithDetails);
    });
    
    // Retornar função para desinscrever o listener
    return unsubscribe;
  } catch (error) {
    console.error('Erro ao obter conversas do usuário:', error);
    return () => {};
  }
};

/**
 * Obtém mensagens de uma conversa
 * @param {string} conversationId - ID da conversa
 * @param {function} callback - Função de callback para receber atualizações em tempo real
 * @returns {function} Função para remover o listener
 */
export const getConversationMessages = (conversationId, callback) => {
  try {
    // Referência para as mensagens da conversa, ordenadas por timestamp
    const messagesRef = query(
      ref(rtdb, `messages/${conversationId}`),
      orderByChild('timestamp')
    );
    
    // Criar um listener para mudanças neste nó
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const messagesData = snapshot.val();
      const messagesList = Object.entries(messagesData).map(([messageId, data]) => ({
        id: messageId,
        ...data,
        // Converter timestamp do Firebase em Date se existir
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      }));
      
      // Ordenar mensagens por timestamp (mais antigas primeiro)
      messagesList.sort((a, b) => a.timestamp - b.timestamp);
      
      callback(messagesList);
    });
    
    // Retornar função para desinscrever o listener
    return unsubscribe;
  } catch (error) {
    console.error('Erro ao obter mensagens da conversa:', error);
    return () => {};
  }
};

/**
 * Marca mensagens como lidas
 * @param {string} conversationId - ID da conversa
 * @param {string} userId - ID do usuário
 * @returns {Promise<void>}
 */
export const markConversationAsRead = async (conversationId, userId) => {
  try {
    const userConvRef = ref(rtdb, `user_conversations/${userId}/${conversationId}`);
    
    await update(userConvRef, {
      unreadCount: 0,
      lastRead: serverTimestamp()
    });
  } catch (error) {
    console.error('Erro ao marcar conversa como lida:', error);
    throw error;
  }
};

/**
 * Inicia uma conversa entre um técnico e um gestor sobre uma obra
 * @param {string} tecnicoId - ID do técnico
 * @param {string} gestorId - ID do gestor
 * @param {string} workId - ID da obra
 * @param {string} workTitle - Título da obra
 * @returns {Promise<string>} ID da conversa criada ou existente
 */
export const startTecnicoGestorConversation = async (tecnicoId, gestorId, workId, workTitle) => {
  try {
    // Verificar se já existe uma conversa sobre esta obra entre estes usuários
    const userConvsRef = ref(rtdb, `user_conversations/${tecnicoId}`);
    const userConvsSnapshot = await get(userConvsRef);
    
    if (userConvsSnapshot.exists()) {
      const userConvs = userConvsSnapshot.val();
      
      // Procurar nas conversas existentes
      for (const [convId, userConvData] of Object.entries(userConvs)) {
        // Verificar se o gestor está nesta conversa
        if (userConvData.participantIds.includes(gestorId)) {
          // Buscar os detalhes da conversa para verificar se é sobre a mesma obra
          const convRef = ref(rtdb, `conversations/${convId}`);
          const convSnapshot = await get(convRef);
          
          if (convSnapshot.exists()) {
            const convData = convSnapshot.val();
            
            // Se for sobre a mesma obra, retornar o ID desta conversa
            if (convData.metadata && convData.metadata.workId === workId) {
              console.log('Conversa existente encontrada:', convId);
              return convId;
            }
          }
        }
      }
    }
    
    // Se não encontrou, criar uma nova conversa
    console.log('Criando nova conversa técnico-gestor');
    const conversationId = await createConversation({
      title: `Obra: ${workTitle}`,
      participants: [tecnicoId, gestorId],
      metadata: {
        workId,
        workTitle,
        type: 'obra'
      }
    });
    
    return conversationId;
  } catch (error) {
    console.error('Erro ao iniciar conversa técnico-gestor:', error);
    throw error;
  }
};

/**
 * Inicia uma conversa entre um gestor e um técnico sobre uma obra 
 * (similar a startTecnicoGestorConversation, mas com adaptações para uso pelo gestor)
 * @param {string} tecnicoId - ID do técnico
 * @param {string} gestorId - ID do gestor
 * @param {string} workId - ID da obra
 * @param {string} workTitle - Título da obra
 * @returns {Promise<string>} ID da conversa criada ou existente
 */
export const startGestorTecnicoConversation = async (tecnicoId, gestorId, workId, workTitle) => {
  try {
    // Esta função é essencialmente a mesma que startTecnicoGestorConversation
    // A única diferença é a ordem dos participantes na UI e possivelmente em logs
    return await startTecnicoGestorConversation(tecnicoId, gestorId, workId, workTitle);
  } catch (error) {
    console.error('Erro ao iniciar conversa gestor-técnico:', error);
    throw error;
  }
}; 