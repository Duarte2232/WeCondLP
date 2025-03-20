import React from 'react';
import { FiPlusCircle } from 'react-icons/fi';
import './NewMaintenanceButton.css';

const NewMaintenanceButton = ({ onClick }) => {
  return (
    <button className="new-maintenance-btn" onClick={onClick}>
      <FiPlusCircle /> Nova Manutenção
    </button>
  );
};

export default NewMaintenanceButton; 