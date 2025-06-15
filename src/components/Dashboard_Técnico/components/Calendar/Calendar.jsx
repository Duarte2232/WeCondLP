import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock } from 'react-icons/fi';
import './Calendar.css';

const Calendar = ({ obras, loading }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  // Converter obras para eventos do calendário quando as obras mudarem
  useEffect(() => {
    if (obras && obras.length > 0) {
      const convertedEvents = obras.map(obra => {
        try {
          // Determine event color based on status
          const eventType = obra.status === 'aceito' ? 'green' : 'blue';
          
          // Extract and validate date
          let date;
          if (obra.date) {
            const parsedDate = new Date(obra.date);
            if (!isNaN(parsedDate.getTime())) {
              date = obra.date;
            } else {
              console.warn(`Invalid date for obra ${obra.id}: ${obra.date}`);
              date = new Date().toISOString().split('T')[0];
            }
          } else {
            date = new Date().toISOString().split('T')[0];
          }
          
          // Extract and validate time
          let startHour = 9;
          let endHour = 11;
          let timeString = `${startHour}:00 - ${endHour}:00`;
          
          if (obra.time) {
            try {
              const timeParts = obra.time.split(' - ');
              if (timeParts.length === 2) {
                const startTime = timeParts[0].trim();
                const endTime = timeParts[1].trim();
                
                const startHourMatch = startTime.match(/^(\d{1,2}):/);
                const endHourMatch = endTime.match(/^(\d{1,2}):/);
                
                if (startHourMatch && endHourMatch) {
                  startHour = parseInt(startHourMatch[1], 10);
                  endHour = parseInt(endHourMatch[1], 10);
                  
                  // Validate hours
                  if (startHour >= 0 && startHour <= 23 && endHour >= 0 && endHour <= 23) {
                    timeString = obra.time;
                  } else {
                    console.warn(`Invalid hours for obra ${obra.id}: ${obra.time}`);
                  }
                }
              }
            } catch (error) {
              console.warn(`Error parsing time for obra ${obra.id}:`, error);
            }
          }
          
          return {
            id: obra.id,
            title: obra.title || 'Obra sem título',
            date: date,
            time: timeString,
            startHour: startHour,
            endHour: endHour,
            type: eventType,
            location: obra.location?.cidade || 'Local não especificado',
            description: obra.description || 'Sem descrição',
            status: obra.status || 'pendente'
          };
        } catch (error) {
          console.error(`Error processing obra ${obra.id}:`, error);
          return null;
        }
      }).filter(Boolean); // Remove any null events from processing errors
      
      setEvents(convertedEvents);
    } else {
      setEvents([]);
    }
  }, [obras]);

  // Função para formatar o mês e ano
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Função para formatar a semana
  const formatWeek = (date) => {
    const startOfWeek = new Date(date);
    const day = date.getDay();
    startOfWeek.setDate(date.getDate() - day);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startMonth = startOfWeek.toLocaleDateString('pt-BR', { month: 'long' });
    const endMonth = endOfWeek.toLocaleDateString('pt-BR', { month: 'long' });
    
    if (startMonth === endMonth) {
      return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${startMonth}`;
    } else {
      return `${startOfWeek.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth}`;
    }
  };

  // Função para formatar o dia
  const formatDay = (date) => {
    const weekDay = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('pt-BR', { month: 'long' });
    return `${weekDay}, ${day} ${month}`;
  };

  // Função para navegar entre meses/semanas/dias
  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (view === 'month') {
        newDate.setMonth(newDate.getMonth() + direction);
      } else if (view === 'week') {
        newDate.setDate(newDate.getDate() + direction * 7);
      } else if (view === 'day') {
        newDate.setDate(newDate.getDate() + direction);
      }
      return newDate;
    });
  };

  // Função para voltar para a data atual
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Função para voltar ao painel
  const goBackToDashboard = () => {
    navigate('/dashtecnico');
  };

  // Array com os dias da semana em português
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Horas do dia para a visualização semanal/diária
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // Das 8h às 19h

  // Função para gerar os dias do mês
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    let dayCounter = 1;

    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < startingDay) {
          week.push(null);
        } else if (dayCounter > daysInMonth) {
          week.push(null);
        } else {
          week.push(dayCounter);
          dayCounter++;
        }
      }
      days.push(week);
      if (dayCounter > daysInMonth) break;
    }

    return days;
  };

  // Função para gerar os dias da semana atual
  const getDaysInWeek = () => {
    const result = [];
    const date = new Date(currentDate);
    const day = date.getDay();
    
    // Começar do primeiro dia da semana (domingo)
    date.setDate(date.getDate() - day);
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(date);
      result.push({
        date: currentDate,
        day: currentDate.getDate(),
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        isToday: isToday(currentDate)
      });
      date.setDate(date.getDate() + 1);
    }
    
    return result;
  };

  // Função para verificar se uma data é hoje
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Função para verificar se um evento ocorre em uma determinada data e hora
  const getEventsForDateAndHour = (date, hour) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear() &&
        hour >= event.startHour && hour < event.endHour
      );
    });
  };

  // Função para verificar se há eventos em uma data específica do mês
  const getEventsForDay = (day) => {
    if (!day) return [];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, day);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Mostrar mensagem de carregamento se necessário
  if (loading) {
    return (
      <div className="main-content calendar-page">
        <div className="page-header-container">
          <button className="back-button" onClick={goBackToDashboard}>
            <FiArrowLeft />
            <span>Voltar</span>
          </button>
          <h1 className="page-title">Calendário</h1>
        </div>
        <div className="loading">Carregando obras...</div>
      </div>
    );
  }

  return (
    <div className="main-content calendar-page">
      <div className="page-header-container">
        <button className="back-button" onClick={goBackToDashboard}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
        <h1 className="page-title">Calendário</h1>
      </div>
      
      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-navigation">
            <button onClick={() => navigateMonth(-1)}>&lt;</button>
            <h2>
              {view === 'month' 
                ? formatMonthYear(currentDate) 
                : view === 'week' 
                  ? formatWeek(currentDate)
                  : formatDay(currentDate)
              }
            </h2>
            <button onClick={() => navigateMonth(1)}>&gt;</button>
          </div>
          <button className="today-button" onClick={goToToday}>Hoje</button>
          <div className="view-options">
            <button 
              className={view === 'month' ? 'active' : ''} 
              onClick={() => setView('month')}
            >
              Mês
            </button>
            <button 
              className={view === 'week' ? 'active' : ''} 
              onClick={() => setView('week')}
            >
              Semana
            </button>
            <button 
              className={view === 'day' ? 'active' : ''} 
              onClick={() => setView('day')}
            >
              Dia
            </button>
          </div>
        </div>

        {view === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
            <div style={{ flex: 1 }}>
              <div className="calendar-grid">
                <div className="calendar-days-header">
                  {weekDays.map((day, index) => (
                    <div key={index}>{day}</div>
                  ))}
                </div>
                <div className="calendar-days">
                  {getDaysInMonth().flat().map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    return (
                      <div
                        key={idx}
                        className={`calendar-day${!day ? ' empty' : ''}`}
                      >
                        {day && <span className="day-number">{day}</span>}
                        <div className="day-events">
                          {dayEvents.length > 0 && (
                            <div className="day-events-list">
                              {dayEvents.map((event, i) => (
                                <div
                                  key={event.id}
                                  className={`day-event-item ${event.type === 'blue' ? 'orcamento-nao-aceito' : ''}`}
                                  style={{ backgroundColor: event.type === 'green' ? '#10B981' : '#3B82F6', color: 'white' }}
                                  title={event.title}
                                >
                                  <span className="event-title">{event.title}</span>
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
            <div className="events-list" style={{ width: 380, background: 'white', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowY: 'auto', maxHeight: 650 }}>
              <h2>Eventos do Mês</h2>
              <div className="events-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {events
                  .filter(event => {
                    const eventDate = new Date(event.date);
                    return (
                      eventDate.getMonth() === currentDate.getMonth() &&
                      eventDate.getFullYear() === currentDate.getFullYear()
                    );
                  })
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map(event => (
                    <div
                      key={event.id}
                      className="event-card"
                      style={{
                        borderLeft: `4px solid ${event.type === 'green' ? '#10B981' : '#3B82F6'}`,
                        background: event.type === 'green' ? 'rgba(16,185,129,0.05)' : 'rgba(59,130,246,0.05)',
                        marginBottom: 8,
                        padding: 16,
                        borderRadius: 8
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                      <div style={{ fontSize: 13, color: '#374151' }}>{new Date(event.date).toLocaleDateString()} {event.time}</div>
                    </div>
                  ))}
                {events.filter(event => {
                  const eventDate = new Date(event.date);
                  return (
                    eventDate.getMonth() === currentDate.getMonth() &&
                    eventDate.getFullYear() === currentDate.getFullYear()
                  );
                }).length === 0 && (
                  <div style={{ color: '#6B7280', fontStyle: 'italic', textAlign: 'center', padding: 24, background: '#F9FAFB', borderRadius: 8, border: '1px dashed #E5E7EB' }}>
                    Não há eventos para o mês selecionado.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="week-view-container">
            <div className="week-header">
              <div className="time-column"></div>
              {getDaysInWeek().map((dayInfo, index) => (
                <div key={index} className={`day-column-header ${dayInfo.isToday ? 'today' : ''}`}>
                  <div className="weekday">{weekDays[index]}</div>
                  <div className="day-number">{dayInfo.day}</div>
                </div>
              ))}
            </div>
            <div className="week-grid">
              <div className="time-slots">
                {hours.map(hour => (
                  <div key={hour} className="time-slot">
                    <div className="hour-label">
                      <FiClock className="clock-icon" />
                      <span>{hour}:00</span>
                    </div>
                    <div className="hour-line"></div>
                  </div>
                ))}
              </div>
              <div className="day-columns">
                {getDaysInWeek().map((dayInfo, dayIndex) => (
                  <div key={dayIndex} className="day-column">
                    {hours.map(hour => (
                      <div key={`${dayIndex}-${hour}`} className="day-cell">
                        {getEventsForDateAndHour(dayInfo.date, hour).map(event => (
                          <div 
                            key={`${event.id}-${hour}`} 
                            className={`week-event ${event.type}`}
                          >
                            <div className="event-title">{event.title}</div>
                            <div className="event-time">{event.time}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'day' && (
          <div className="day-view-container">
            <div className="day-header">
              <div className="day-title">
                <div className="day-name">{formatDay(currentDate)}</div>
              </div>
            </div>
            <div className="day-grid">
              <div className="time-slots">
                {hours.map(hour => (
                  <div key={hour} className="time-slot">
                    <div className="hour-label">
                      <span>{hour}:00</span>
                    </div>
                    <div className="hour-line"></div>
                  </div>
                ))}
              </div>
              <div className="day-events-column">
                {hours.map(hour => (
                  <div key={hour} className="day-cell">
                    {getEventsForDateAndHour(currentDate, hour).map(event => (
                      <div 
                        key={`${event.id}-${hour}`} 
                        className={`day-event ${event.type}`}
                      >
                        <div className="event-title">{event.title}</div>
                        <div className="event-time">{event.time}</div>
                        <div className="event-details">
                          <div className="event-location">Localização: {event.location || 'A definir'}</div>
                          <div className="event-description">{event.description || 'Sem descrição disponível'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar; 