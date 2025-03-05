import React from 'react';
import './Metrics.css';

const Metrics = ({ metrics }) => {
  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-header">Obras Pendentes</div>
        <div className="metric-value">{metrics.pending}</div>
      </div>
      
      <div className="metric-card">
        <div className="metric-header">Obras Concluídas</div>
        <div className="metric-value">{metrics.completed}</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">Este Mês</div>
        <div className="metric-value">{metrics.thisMonth} Obras</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">Avaliação Média</div>
        <div className="metric-value">{metrics.rating}/5</div>
      </div>
    </div>
  );
};

export default Metrics; 