import React, { useState } from 'react';
import { FiPlusCircle } from 'react-icons/fi';
import MaintenanceForm from './MaintenanceForm';
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './NewMaintenanceButton.css';

const NewMaintenanceButton = ({ onCreated }) => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const user = JSON.parse(sessionStorage.getItem('user'));
      
      const maintenanceData = {
        ...formData,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'maintenances'), maintenanceData);
      setShowForm(false);
      
      if (onCreated) {
        onCreated();
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao criar manutenção:', error);
      alert('Ocorreu um erro ao criar a manutenção.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <button className="new-maintenance-btn" onClick={() => setShowForm(true)}>
        <FiPlusCircle /> Nova Manutenção
      </button>
      
      {showForm && (
        <MaintenanceForm 
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          isSubmitting={isSubmitting}
          editMode={false}
          initialData={{
            title: '',
            description: '',
            category: '',
            priority: '',
            date: new Date().toISOString().split('T')[0],
            status: 'disponivel',
            files: [],
            location: {
              morada: '',
              codigoPostal: '',
              cidade: '',
              andar: ''
            }
          }}
        />
      )}
    </>
  );
};

export default NewMaintenanceButton; 