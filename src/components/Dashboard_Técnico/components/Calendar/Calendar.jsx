import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
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

  // Função para navegar entre meses
  const navigateMonth = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + direction);
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

  // Eventos de exemplo (você pode substituir por dados reais do Firebase)
  const events = [
    {
      id: 1,
      title: 'Reparação de Canalização',
      date: '2024-03-05',
      time: '09:00 - 11:00',
      type: 'yellow'
    },
    {
      id: 2,
      title: 'Reparação Elétrica',
      date: '2024-03-06',
      time: '13:00 - 15:00',
      type: 'blue'
    },
    {
      id: 3,
      title: 'Manutenção de AVAC',
      date: '2024-03-07',
      time: '10:00 - 12:00',
      type: 'green'
    },
    {
      id: 4,
      title: 'Substituição de Janela',
      date: '2024-03-08',
      time: '14:00 - 17:00',
      type: 'yellow'
    }
  ];

  return (
    <div className="main-content calendar-page">
      <div className="calendar-header-container">
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
            <h2>{formatMonthYear(currentDate)}</h2>
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
      </div>
    </div>
  );
};

export default Calendar; 