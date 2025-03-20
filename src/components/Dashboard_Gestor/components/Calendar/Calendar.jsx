import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiChevronLeft, FiChevronRight, FiFilter, FiCheck } from 'react-icons/fi';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import './Calendar.css';

const Calendar = () => {
  const navigate = useNavigate();
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
    prazosOrcamentos: true
  });

  // Buscar as obras e eventos ao carregar a página
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Buscar as obras no Firestore
        const q = query(collection(db, 'works'));
        const querySnapshot = await getDocs(q);
        const obrasData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('Obras carregadas:', obrasData); // Debug log
        setObras(obrasData);

        // Transformar as obras em eventos de calendário
        const obrasEventos = [];
        
        obrasData.forEach(obra => {
          // Adicionar a data da obra
          if (obra.date) {
            try {
              const obraDate = new Date(obra.date);
              if (!isNaN(obraDate.getTime())) {
                // Create the base event
                const baseEvent = {
                  id: `obra-${obra.id}`,
                  titulo: obra.title,
                  data: formatDateToDisplay(obraDate),
                  tipo: obra.isMaintenance ? 'Manutenção' : 'Obra',
                  color: obra.isMaintenance ? '#f59e0b' : '#2563eb',
                  details: obra.description,
                  local: obra.location ? `${obra.location.morada || ''}, ${obra.location.cidade || ''}` : '',
                  originalDate: obraDate,
                  frequency: obra.frequency || 'Única' // Add frequency information
                };

                // Add the event to the array
                obrasEventos.push(baseEvent);

                // If it's a maintenance with a frequency, generate recurring events
                if (obra.isMaintenance && obra.frequency && obra.frequency !== 'Única') {
                  const startDate = new Date(obraDate);
                  // Generate recurring events up to 1 year in the future
                  const endDate = new Date(startDate);
                  endDate.setFullYear(endDate.getFullYear() + 1);
                  
                  let currentDate = new Date(startDate);
                  currentDate.setDate(currentDate.getDate() + 1); // Start from the next day
                  
                  while (currentDate <= endDate) {
                    let shouldAddEvent = false;
                    
                    // Calculate the next occurrence based on frequency
                    switch(obra.frequency) {
                      case 'Diária':
                        shouldAddEvent = true;
                        currentDate.setDate(currentDate.getDate() + 1);
                        break;
                      case 'Semanal':
                        shouldAddEvent = true;
                        currentDate.setDate(currentDate.getDate() + 7);
                        break;
                      case 'Quinzenal':
                        shouldAddEvent = true;
                        currentDate.setDate(currentDate.getDate() + 14);
                        break;
                      case 'Mensal':
                        shouldAddEvent = true;
                        currentDate.setMonth(currentDate.getMonth() + 1);
                        break;
                      case 'Trimestral':
                        shouldAddEvent = true;
                        currentDate.setMonth(currentDate.getMonth() + 3);
                        break;
                      case 'Semestral':
                        shouldAddEvent = true;
                        currentDate.setMonth(currentDate.getMonth() + 6);
                        break;
                      case 'Anual':
                        shouldAddEvent = true;
                        currentDate.setFullYear(currentDate.getFullYear() + 1);
                        break;
                      default:
                        // If no valid frequency, don't add recurring events
                        currentDate = new Date(endDate);
                        currentDate.setDate(currentDate.getDate() + 1); // break the loop
                    }
                    
                    if (shouldAddEvent) {
                      const recurringDate = new Date(currentDate);
                      obrasEventos.push({
                        ...baseEvent,
                        id: `${baseEvent.id}-recur-${recurringDate.getTime()}`,
                        titulo: `${baseEvent.titulo} (${obra.frequency})`,
                        data: formatDateToDisplay(recurringDate),
                        originalDate: new Date(recurringDate),
                        isRecurring: true
                      });
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Erro ao processar data da obra:', error);
            }
          }
          
          // Adicionar o prazo de orçamentos se existir
          if (obra.prazoOrcamentos) {
            try {
              const prazoDate = new Date(obra.prazoOrcamentos);
              if (!isNaN(prazoDate.getTime())) {
                obrasEventos.push({
                  id: `prazo-${obra.id}`,
                  titulo: `Prazo: ${obra.title}`,
                  data: formatDateToDisplay(prazoDate),
                  tipo: 'Prazo Orçamento',
                  color: '#10b981',
                  details: `Prazo final para envio de orçamentos para a obra "${obra.title}"`,
                  local: obra.location ? `${obra.location.morada || ''}, ${obra.location.cidade || ''}` : '',
                  originalDate: prazoDate
                });
              }
            } catch (error) {
              console.error('Erro ao processar prazo de orçamentos:', error);
            }
          }
        });
        
        console.log('Eventos gerados das obras:', obrasEventos); // Debug log

        // Eventos padrão - apenas eventos futuros
        const dataAtual = new Date();
        const eventosPadrao = [
          {
            id: 1,
            titulo: 'Reunião de Condomínio',
            data: '25/05/2024',
            horario: '19:00',
            local: 'Salão de Festas',
            tipo: 'Evento',
            color: '#6366f1',
            originalDate: new Date(2024, 4, 25) // Maio é mês 4 no JavaScript
          },
          {
            id: 2,
            titulo: 'Vencimento Taxa Mensal',
            data: '10/06/2024',
            tipo: 'Evento',
            color: '#6366f1',
            originalDate: new Date(2024, 5, 10) // Junho é mês 5 no JavaScript
          }
        ];

        // Combinar com os eventos existentes
        const todosEventos = [
          ...eventosPadrao,
          ...obrasEventos
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
  }, [db]);

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
                                className="day-event-item"
                                style={{ backgroundColor: evento.color || '#2563EB' }}
                                title={evento.titulo}
                              >
                                <span className="event-title">{evento.titulo}</span>
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
                  <div key={evento.id} className="event-card">
                    <div className="event-header">
                      <h3>{evento.titulo}</h3>
                      <span className="event-type" style={{ backgroundColor: evento.color }}>
                        {evento.tipo}
                      </span>
                    </div>
                    <div className="event-details">
                      <p><strong>Data:</strong> {evento.data}</p>
                      {evento.horario && <p><strong>Horário:</strong> {evento.horario}</p>}
                      {evento.local && <p><strong>Local:</strong> {evento.local}</p>}
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