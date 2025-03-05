import React from 'react';
import './WorkForm.css';
import { FiPlusCircle } from 'react-icons/fi';
import './NewWorkButton.css';

const NewWorkButton = ({ onClick }) => {
  return (
    <button className="new-work-btn" onClick={onClick}>
      <FiPlusCircle /> Nova Obra
    </button>
  );
};

export default NewWorkButton; 