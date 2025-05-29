import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiChevronLeft, FiChevronRight, FiFilter, FiCheck } from 'react-icons/fi';
import { collection, getDocs, query, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/auth';
import './Calendar.css';

const Calendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [obras, setObras] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventos: true,
    obras: true,
    manutencoes: true,
    prazosOrcamentos: true,
    orcamentosNaoAceitos: true
  });

  // Buscar as obras e eventos ao carregar a página
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Function to calculate recurring dates based on frequency
        const calculateRecurringDates = (startDate, frequency, maxMonthsAhead = 12) => {
          const dates = [];
          const start = new Date(startDate);
          const maxDate = new Date();
          maxDate.setMonth(maxDate.getMonth() + maxMonthsAhead);

          if (!frequency || frequency === 'Única') {
            return [start];
          }

          let currentDate = new Date(start);
          while (currentDate <= maxDate) {
            dates.push(new Date(currentDate));

            switch (frequency) {
              case 'Diária':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
              case 'Semanal':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
              case 'Quinzenal':
                currentDate.setDate(currentDate.getDate() + 14);
                break;
              case 'Mensal':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
              case 'Trimestral':
                currentDate.setMonth(currentDate.getMonth() + 3);
                break;
              case 'Semestral':
                currentDate.setMonth(currentDate.getMonth() + 6);
                break;
              case 'Anual':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
              default:
                // Se não reconhecer a frequência, tratar como única
                return [start];
            }
          }

          return dates;
        };

        // Buscar manutenções do usuário atual
        let manutencoesData = [];
        if (user?.email) {
          const manutencoesEmailQuery = query(
            collection(db, 'ManutençãoPedidos'),
            where('userEmail', '==', user.email)
          );
          
          const manutencoesUserIdQuery = query(
            collection(db, 'ManutençãoPedidos'),
            where('userId', '==', user.uid)
          );
          
          const [manutencoesEmailSnapshot, manutencoesUserIdSnapshot] = await Promise.all([
            getDocs(manutencoesEmailQuery),
            getDocs(manutencoesUserIdQuery)
          ]);
          
          // Criar um mapa para evitar duplicações
          const manutencoesMap = new Map();
          [...manutencoesEmailSnapshot.docs, ...manutencoesUserIdSnapshot.docs].forEach(doc => {
            if (!manutencoesMap.has(doc.id)) {
              manutencoesMap.set(doc.id, {
                id: doc.id,
                ...doc.data()
              });
            }
          });
          
          manutencoesData = Array.from(manutencoesMap.values());
        }

        // Buscar todos os orçamentos (aceitos e não aceitos)
        const orcamentosRefObras = collection(db, 'ObrasOrçamentos');
        const orcamentosRefManutencao = collection(db, 'ManutençãoOrçamentos');
        
        const [orcamentosObrasSnapshot, orcamentosManutencaoSnapshot] = await Promise.all([
          getDocs(query(orcamentosRefObras)),
          getDocs(query(orcamentosRefManutencao))
        ]);
        
        const todosOrcamentos = [
          ...orcamentosObrasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'Obra' })),
          ...orcamentosManutencaoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'Manutenção' }))
        ];

        // Buscar as obras correspondentes aos orçamentos
        const obrasPromises = todosOrcamentos.map(async (orcamento) => {
          const collectionName = orcamento.tipo === 'Obra' ? 'ObrasPedidos' : 'ManutençãoPedidos';
          const workId = orcamento.workId;
          
          if (!workId) return null;
          
          const obraRef = doc(db, collectionName, workId);
          const obraDoc = await getDoc(obraRef);
          
          if (obraDoc.exists()) {
            return { 
              id: obraDoc.id, 
              ...obraDoc.data(), 
              orcamento: orcamento,
              tipoServico: orcamento.tipo 
            };
          }
          return null;
        });
        
        const obrasData = (await Promise.all(obrasPromises)).filter(Boolean);
        setObras(obrasData);

        // Transformar as obras em eventos de calendário
        const obrasEventos = [];
        
        // Processar os orçamentos e criar eventos
        todosOrcamentos.forEach(orcamento => {
          // Verificar se tem data de disponibilidade
          if (orcamento.availabilityDate) {
            try {
              // Data de disponibilidade (quando o técnico pode realizar a obra)
              const disponibilidadeDate = new Date(orcamento.availabilityDate);
              
              if (!isNaN(disponibilidadeDate.getTime())) {
                // Encontrar a obra correspondente
                const obraRelacionada = obrasData.find(obra => obra.id === orcamento.workId);
                
                if (obraRelacionada) {
                  // Adicionar evento de disponibilidade
                  obrasEventos.push({
                    id: `orcamento-${orcamento.id}`,
                    titulo: obraRelacionada.title,
                    data: formatDateToDisplay(disponibilidadeDate),
                    tipo: orcamento.tipo,
                    color: orcamento.aceito ? '#10B981' : '#3B82F6',
                    details: orcamento.description,
                    local: obraRelacionada.location ? `${obraRelacionada.location.morada || ''}, ${obraRelacionada.location.cidade || ''}` : '',
                    originalDate: disponibilidadeDate,
                    orcamento: orcamento,
                    aceito: orcamento.aceito || false,
                    valor: orcamento.amount || orcamento.valor || 0,
                    technicianId: orcamento.technicianId,
                    technicianEmail: orcamento.technicianEmail,
                    isOrcamento: true
                  });
                  
                  // Se for múltiplos dias, criar eventos para os dias adicionais
                  if (orcamento.isMultipleDays && orcamento.endDate) {
                    const dataFinal = new Date(orcamento.endDate);
                    if (!isNaN(dataFinal.getTime())) {
                      const diasDiferenca = Math.ceil((dataFinal - disponibilidadeDate) / (1000 * 60 * 60 * 24));
                      
                      for (let i = 1; i <= diasDiferenca; i++) {
                        const dataAdicional = new Date(disponibilidadeDate);
                        dataAdicional.setDate(disponibilidadeDate.getDate() + i);
                        
                        obrasEventos.push({
                          id: `orcamento-${orcamento.id}-dia-${i}`,
                          titulo: obraRelacionada.title,
                          data: formatDateToDisplay(dataAdicional),
                          tipo: orcamento.tipo,
                          color: orcamento.aceito ? '#10B981' : '#3B82F6',
                          details: orcamento.description,
                          local: obraRelacionada.location ? `${obraRelacionada.location.morada || ''}, ${obraRelacionada.location.cidade || ''}` : '',
                          originalDate: dataAdicional,
                          orcamento: orcamento,
                          aceito: orcamento.aceito || false,
                          valor: orcamento.amount || orcamento.valor || 0,
                          technicianId: orcamento.technicianId,
                          technicianEmail: orcamento.technicianEmail,
                          isOrcamento: true,
                          isMultiDayPart: true
                        });
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Erro ao processar data do orçamento:', error);
            }
          }
        });

        // Criar eventos das manutenções
        const manutencoesEventos = [];
        manutencoesData.forEach(manutencao => {
          if (manutencao.date) {
            try {
              const startDate = new Date(manutencao.date);
              
              if (!isNaN(startDate.getTime())) {
                // Calcular todas as datas baseadas na frequência
                const recurringDates = calculateRecurringDates(startDate, manutencao.frequency);
                
                recurringDates.forEach((date, index) => {
                  const isFirstOccurrence = index === 0;
                  
                  manutencoesEventos.push({
                    id: `manutencao-${manutencao.id}-${index}`,
                    titulo: manutencao.title,
                    data: formatDateToDisplay(date),
                    tipo: 'Manutenção',
                    color: getMaintenanceColor(manutencao.status),
                    details: manutencao.description,
                    local: manutencao.location ? `${manutencao.location.morada || ''}, ${manutencao.location.cidade || ''}` : '',
                    originalDate: date,
                    manutencao: manutencao,
                    status: manutencao.status,
                    priority: manutencao.priority,
                    category: manutencao.category,
                    frequency: manutencao.frequency,
                    isFirstOccurrence: isFirstOccurrence,
                    isMaintenance: true
                  });
                });
              }
            } catch (error) {
              console.error('Erro ao processar data da manutenção:', error);
            }
          }
        });

        // Função para definir cor baseada no status da manutenção
        function getMaintenanceColor(status) {
          switch (status) {
            case 'disponivel':
              return '#6366f1'; // Azul
            case 'em-andamento':
              return '#f59e0b'; // Amarelo
            case 'concluido':
              return '#10b981'; // Verde
            case 'cancelado':
              return '#ef4444'; // Vermelho
            default:
              return '#6b7280'; // Cinza
          }
        }

        // Eventos padrão - apenas eventos futuros
        const eventosPadrao = [
          {
            id: 1,
            titulo: 'Reunião de Condomínio',
            data: '25/05/2024',
            horario: '19:00',
            local: 'Salão de Festas',
            tipo: 'Evento',
            color: '#6366f1',
            originalDate: new Date(2024, 4, 25)
          },
          {
            id: 2,
            titulo: 'Vencimento Taxa Mensal',
            data: '10/06/2024',
            tipo: 'Evento',
            color: '#6366f1',
            originalDate: new Date(2024, 5, 10)
          }
        ];

        const todosEventos = [
          ...eventosPadrao,
          ...obrasEventos,
          ...manutencoesEventos
        ];
        setEventos(todosEventos);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Re-run this effect whenever the component mounts
    // This ensures that any new events added elsewhere in the app will be displayed
  }, [user]);

  const formatDateToDisplay = (date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prevMonth => {
      const date = new Date(prevMonth);
      date.setMonth(date.getMonth() - 1);
      return date;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => {
      const date = new Date(prevMonth);
      date.setMonth(date.getMonth() + 1);
      return date;
    });
  };

  const toggleFilter = (filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  // Formatar o nome do mês e ano
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  };

  // Filtrar eventos com base nos filtros selecionados
  const filteredEventos = eventos.filter(evento => {
    if (evento.tipo === 'Evento' && !filters.eventos) return false;
    if (evento.tipo === 'Obra' && !filters.obras) return false;
    if (evento.tipo === 'Manutenção' && !filters.manutencoes) return false;
    if (evento.tipo === 'Prazo Orçamento' && !filters.prazosOrcamentos) return false;
    // Filtrar orçamentos não aceitos
    if (evento.isOrcamento && !evento.aceito && !filters.orcamentosNaoAceitos) return false;
    return true;
  });

  // Gerar dias para o calendário
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1);
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0);
    
    // Dia da semana do primeiro dia (0 = domingo, 1 = segunda, etc.)
    const firstDayIndex = firstDay.getDay();
    
    // Dias do mês anterior para preencher o início do calendário
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      prevMonthDays.push({
        day: prevMonthLastDay - i,
        month: 'prev',
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    
    // Dias do mês atual
    const currentMonthDays = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      currentMonthDays.push({
        day: i,
        month: 'current',
        date: new Date(year, month, i)
      });
    }
    
    // Dias do próximo mês para preencher o fim do calendário
    const nextMonthDays = [];
    const remainingDays = 42 - (prevMonthDays.length + currentMonthDays.length);
    for (let i = 1; i <= remainingDays; i++) {
      nextMonthDays.push({
        day: i,
        month: 'next',
        date: new Date(year, month + 1, i)
      });
    }
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  // Obter eventos de um dia específico
  const getEventsForDay = (date) => {
    return filteredEventos.filter(evento => {
      const eventDate = evento.originalDate;
      return (
        eventDate.getDate() === date.getDate() && 
        eventDate.getMonth() === date.getMonth() && 
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Gerar grid do calendário
  const calendarDays = generateCalendarDays();

  return (
    <div className="calendar-container">
      <div className="calendar-content">
        <div className="calendar-header">
          <button className="back-button" onClick={handleBack}>
            <FiArrowLeft />
            <span>Voltar</span>
          </button>
          <div className="calendar-header-actions">
            <button className="filter-button" onClick={() => setShowFilters(!showFilters)}>
              <FiFilter /> Filtros
            </button>
            <button className="new-event-button" onClick={() => setShowNewEventForm(true)}>
              <FiPlus /> Novo Evento
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-container">
            <div className="filter-options">
              <div className="filter-title">Filtrar por tipo:</div>
              <label className={`filter-option ${filters.eventos ? 'active' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={filters.eventos} 
                  onChange={() => toggleFilter('eventos')}
                />
                <span className="filter-checkbox"></span>
                <span className="filter-label">Eventos</span>
              </label>
              <label className={`filter-option ${filters.obras ? 'active' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={filters.obras} 
                  onChange={() => toggleFilter('obras')}
                />
                <span className="filter-checkbox"></span>
                <span className="filter-label">Obras</span>
              </label>
              <label className={`filter-option ${filters.manutencoes ? 'active' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={filters.manutencoes} 
                  onChange={() => toggleFilter('manutencoes')}
                />
                <span className="filter-checkbox"></span>
                <span className="filter-label">Manutenções</span>
              </label>
              <label className={`filter-option ${filters.prazosOrcamentos ? 'active' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={filters.prazosOrcamentos} 
                  onChange={() => toggleFilter('prazosOrcamentos')}
                />
                <span className="filter-checkbox"></span>
                <span className="filter-label">Prazos de Orçamentos</span>
              </label>
              <label className={`filter-option ${filters.orcamentosNaoAceitos ? 'active' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={filters.orcamentosNaoAceitos} 
                  onChange={() => toggleFilter('orcamentosNaoAceitos')}
                />
                <span className="filter-checkbox"></span>
                <span className="filter-label">Orçamentos Não Aceitos</span>
              </label>
            </div>
          </div>
        )}

        <div className="calendar-layout">
          <div className="calendar-main">
            <div className="calendar-toolbar">
              <div className="calendar-navigation">
                <button onClick={handlePrevMonth} className="month-nav-btn">
                  <FiChevronLeft />
                </button>
                <h3>{formatMonthYear(currentMonth)}</h3>
                <button onClick={handleNextMonth} className="month-nav-btn">
                  <FiChevronRight />
                </button>
              </div>
            </div>
            
            <div className="calendar-grid">
              <div className="calendar-days-header">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>
              
              <div className="calendar-days">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDay(day.date);
                  return (
                    <div 
                      key={index} 
                      className={`calendar-day ${day.month} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                    >
                      <span className="day-number">{day.day}</span>
                      <div className="day-events">
                        {dayEvents.length > 0 && (
                          <div className="day-events-list">
                            {dayEvents.map((evento, idx) => (
                              <div 
                                key={idx} 
                                className={`day-event-item ${evento.isOrcamento && !evento.aceito ? 'orcamento-nao-aceito' : ''}`}
                                style={{ backgroundColor: evento.color || '#2563EB' }}
                                title={`${evento.titulo} ${evento.isOrcamento ? (evento.aceito ? '(Orçamento Aceito)' : '(Orçamento Pendente)') : ''}`}
                              >
                                <span className="event-title">
                                  {evento.titulo}
                                  {evento.isOrcamento && evento.aceito && (
                                    <FiCheck className="event-check-icon" />
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="events-list">
            <h2>Eventos do Mês</h2>
            
            <div className="events-container">
              {isLoading ? (
                <div className="loading-message">Carregando eventos...</div>
              ) : filteredEventos
                .filter(evento => 
                  evento.originalDate.getMonth() === currentMonth.getMonth() && 
                  evento.originalDate.getFullYear() === currentMonth.getFullYear()
                )
                .sort((a, b) => a.originalDate - b.originalDate)
                .map(evento => (
                  <div 
                    key={evento.id} 
                    className={`event-card ${evento.isOrcamento ? (evento.aceito ? 'orcamento-aceito' : 'orcamento-pendente') : ''} ${evento.isMaintenance ? 'maintenance-event' : ''}`}
                  >
                    <div className="event-header">
                      <h3>{evento.titulo}</h3>
                      <span className="event-type" style={{ backgroundColor: evento.color }}>
                        {evento.isOrcamento ? (evento.aceito ? 'Aceito' : 'Pendente') : evento.tipo}
                        {evento.isMaintenance && evento.frequency && evento.frequency !== 'Única' && ` (${evento.frequency})`}
                      </span>
                    </div>
                    <div className="event-details">
                      <p><strong>Data:</strong> {evento.data}</p>
                      {evento.horario && <p><strong>Horário:</strong> {evento.horario}</p>}
                      {evento.local && <p><strong>Local:</strong> {evento.local}</p>}
                      {evento.isOrcamento && (
                        <>
                          <p><strong>Valor:</strong> {evento.valor}€</p>
                          <p><strong>Técnico:</strong> {evento.technicianEmail}</p>
                        </>
                      )}
                      {evento.isMaintenance && (
                        <>
                          {evento.priority && <p><strong>Prioridade:</strong> {evento.priority}</p>}
                          {evento.category && <p><strong>Categoria:</strong> {evento.category}</p>}
                          {evento.status && <p><strong>Status:</strong> {evento.status}</p>}
                          {evento.frequency && evento.frequency !== 'Única' && (
                            <p><strong>Frequência:</strong> {evento.frequency}</p>
                          )}
                          {!evento.isFirstOccurrence && (
                            <p><em>Ocorrência recorrente</em></p>
                          )}
                        </>
                      )}
                      {evento.details && <p><strong>Detalhes:</strong> {evento.details}</p>}
                    </div>
                  </div>
                ))}
              {!isLoading && filteredEventos.filter(evento => 
                evento.originalDate.getMonth() === currentMonth.getMonth() && 
                evento.originalDate.getFullYear() === currentMonth.getFullYear()
              ).length === 0 && (
                <div className="no-events-message">
                  Não há eventos para o mês selecionado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewEventForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Novo Evento</h2>
              <button className="close-btn" onClick={() => setShowNewEventForm(false)}>
                <FiArrowLeft />
              </button>
            </div>
            <form className="event-form">
              <div className="form-group">
                <label>Título do Evento</label>
                <input type="text" placeholder="Digite o título do evento" required />
              </div>
              <div className="form-group">
                <label>Data</label>
                <input type="date" required />
              </div>
              <div className="form-group">
                <label>Tipo de Evento</label>
                <select required>
                  <option value="">Selecione o tipo</option>
                  <option value="Evento">Evento Geral</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Financeiro">Financeiro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Local (opcional)</label>
                <input type="text" placeholder="Local do evento" />
              </div>
              <div className="form-group">
                <label>Horário (opcional)</label>
                <input type="time" />
              </div>
              <div className="form-group">
                <label>Detalhes (opcional)</label>
                <textarea rows="3" placeholder="Detalhes adicionais sobre o evento"></textarea>
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowNewEventForm(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 