import React from 'react';
import { FiCheckCircle, FiMessageSquare } from 'react-icons/fi';
import './Jobs.css';

const BudgetAcceptedNotification = ({ onDismiss, onMessageGestor }) => {
  return (
    <div className="budget-accepted-notification">
      <div className="notification-content">
        <FiCheckCircle className="notification-icon" />
        <h3>Orçamento Aceito!</h3>
        <p>Envie Mensagem ao Gestor!</p>
        <div className="notification-actions">
          <button className="message-gestor-btn" onClick={onMessageGestor}>
            <FiMessageSquare />
            Mensagem ao Gestor
          </button>
          <button className="dismiss-btn" onClick={onDismiss}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetAcceptedNotification; 