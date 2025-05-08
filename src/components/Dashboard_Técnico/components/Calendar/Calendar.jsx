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
        // Determinar o tipo de evento baseado na categoria
        let eventType = 'blue'; // Padrão
        if (obra.category) {
          const category = obra.category.toLowerCase();
          if (category.includes('eletricidade') || category.includes('eletr')) {
            eventType = 'yellow';
          } else if (category.includes('canalizacao') || category.includes('canal')) {
            eventType = 'blue';
          } else {
            eventType = 'green';
          }
        }
        
        // Extrair a data e hora da obra
        // Formato padrão da data: 'YYYY-MM-DD'
        const date = obra.date || new Date().toISOString().split('T')[0];
        
        // Determinar hora de início e fim (padrão: 2 horas de duração)
        let startHour = 9; // Padrão: 9h
        let endHour = 11;  // Padrão: 11h
        
        if (obra.time) {
          // Se a obra tiver um horário específico no formato "HH:MM - HH:MM"
          const timeParts = obra.time.split(' - ');
          if (timeParts.length === 2) {
            const startTime = timeParts[0].trim();
            const endTime = timeParts[1].trim();
            
            startHour = parseInt(startTime.split(':')[0], 10) || 9;
            endHour = parseInt(endTime.split(':')[0], 10) || (startHour + 2);
          }
        }
        
        return {
          id: obra.id,
          title: obra.title || 'Obra sem título',
          date: date,
          time: obra.time || `${startHour}:00 - ${endHour}:00`,
          startHour: startHour,
          endHour: endHour,
          type: eventType,
          location: obra.location?.cidade || '',
          description: obra.description || '',
          status: obra.status || 'disponivel'
        };
      });
      
      setEvents(convertedEvents);
    } else {
      // Se não houver obras, usar um array vazio para os eventos
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
          <div className="calendar-grid">
            <div className="weekdays">
              {weekDays.map((day, index) => (
                <div key={index} className="weekday">{day}</div>
              ))}
            </div>
            <div className="days">
              {getDaysInMonth().map((week, weekIndex) => (
                <div key={weekIndex} className="week">
                  {week.map((day, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className={`day ${!day ? 'empty' : ''} ${day && isToday(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) ? 'today' : ''}`}
                    >
                      {day && (
                        <>
                          <div className="day-number">{day}</div>
                          <div className="events">
                            {getEventsForDay(day).slice(0, 3).map(event => (
                              <div 
                                key={event.id} 
                                className={`event ${event.type}`}
                                title={event.title}
                              >
                                <div className="event-title">{event.title}</div>
                                <div className="event-time">{event.time}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
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