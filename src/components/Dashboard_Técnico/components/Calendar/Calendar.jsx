import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock } from 'react-icons/fi';
import './Calendar.css';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const navigate = useNavigate();

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
        newDate.setMonth(prevDate.getMonth() + direction);
      } else if (view === 'week') {
        newDate.setDate(prevDate.getDate() + (7 * direction));
      } else if (view === 'day') {
        newDate.setDate(prevDate.getDate() + direction);
      }
      return newDate;
    });
  };

  // Função para ir para hoje
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

  // Eventos de exemplo (você pode substituir por dados reais do Firebase)
  const events = [
    {
      id: 1,
      title: 'Reparação de Canalização',
      date: '2024-03-05',
      time: '09:00 - 11:00',
      startHour: 9,
      endHour: 11,
      type: 'yellow'
    },
    {
      id: 2,
      title: 'Reparação Elétrica',
      date: '2024-03-06',
      time: '13:00 - 15:00',
      startHour: 13,
      endHour: 15,
      type: 'blue'
    },
    {
      id: 3,
      title: 'Manutenção de AVAC',
      date: '2024-03-07',
      time: '10:00 - 12:00',
      startHour: 10,
      endHour: 12,
      type: 'green'
    },
    {
      id: 4,
      title: 'Substituição de Janela',
      date: '2024-03-08',
      time: '14:00 - 17:00',
      startHour: 14,
      endHour: 17,
      type: 'yellow'
    }
  ];

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
              {weekDays.map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            <div className="days">
              {getDaysInMonth().map((week, weekIndex) => (
                <div key={weekIndex} className="week">
                  {week.map((day, dayIndex) => (
                    <div 
                      key={`${weekIndex}-${dayIndex}`} 
                      className={`day ${day ? '' : 'empty'}`}
                    >
                      {day && (
                        <>
                          <span className="day-number">{day}</span>
                          <div className="events">
                            {events
                              .filter(event => {
                                const eventDate = new Date(event.date);
                                return (
                                  eventDate.getDate() === day &&
                                  eventDate.getMonth() === currentDate.getMonth() &&
                                  eventDate.getFullYear() === currentDate.getFullYear()
                                );
                              })
                              .map(event => (
                                <div 
                                  key={event.id} 
                                  className={`event ${event.type}`}
                                >
                                  <span className="event-title">{event.title}</span>
                                  <span className="event-time">{event.time}</span>
                                </div>
                              ))
                            }
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