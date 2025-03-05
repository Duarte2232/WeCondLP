import React from 'react';
import './Metrics.css';
import LoadingAnimation from '../../../LoadingAnimation/LoadingAnimation';

const Metrics = ({ metrics, isLoading }) => {
  return (
    <section className="metrics-grid">
      {isLoading ? (
        <div className="loading-container">
          <LoadingAnimation />
        </div>
      ) : (
        <>
          <div className="metric-card">
            <h3>Total de Obras</h3>
            <p className="metric-value">{metrics.total}</p>
          </div>
          <div className="metric-card">
            <h3>Obras Pendentes</h3>
            <p className="metric-value">{metrics.pending}</p>
          </div>
          <div className="metric-card">
            <h3>Em Andamento</h3>
            <p className="metric-value">{metrics.inProgress}</p>
          </div>
          <div className="metric-card">
            <h3>Concluídas</h3>
            <p className="metric-value">{metrics.completed}</p>
          </div>
        </>
      )}
    </section>
  );
};

export default Metrics; 