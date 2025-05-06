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
      const user = JSON.parse(sessionStorage.getItem('user')) || {};
      
      const maintenanceData = {
        ...formData,
        userEmail: user.email || 'não especificado',
        userId: user.uid || '',
        createdAt: serverTimestamp(),
        isMaintenance: true,
        status: "disponivel"
      };
      
      // Ensure budget info is stored
      if (!maintenanceData.orcamentos) {
        maintenanceData.orcamentos = {
          minimo: formData.orcamentos?.minimo || '',
          maximo: formData.orcamentos?.maximo || ''
        };
      }
      
      // Ensure prazoOrcamentos is stored
      if (!maintenanceData.prazoOrcamentos) {
        maintenanceData.prazoOrcamentos = formData.prazoOrcamentos || '';
      }
      
      // Add to maintenances collection
      await addDoc(collection(db, 'maintenances'), maintenanceData);
      
      // Also add to works collection with the same data so it appears on the technician dashboard
      await addDoc(collection(db, 'works'), maintenanceData);
      
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
  
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    const uploadedFiles = [];
    
    if (!files || files.length === 0) return uploadedFiles;
    
    try {
      // Instead of actually uploading to Firebase Storage (which has CORS issues),
      // we'll create file metadata objects with local URLs
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Create a local object URL for the file
        const localUrl = URL.createObjectURL(file);
        
        uploadedFiles.push({
          name: file.name,
          url: localUrl, // Local URL instead of Firebase storage URL
          type: file.type,
          size: file.size,
          // Store the file description to identify it's a local file
          isLocalFile: true
        });
      }
      return uploadedFiles;
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Não foi possível processar o arquivo.');
      return [];
    }
  };
  
  const handleRemoveFile = (fileToRemove) => {
    // For local files, revoke the URL to free up memory
    if (fileToRemove.isLocalFile && fileToRemove.url) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    return true;
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
          handleFileUpload={handleFileUpload}
          handleRemoveFile={handleRemoveFile}
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
            },
            orcamentos: {
              minimo: '',
              maximo: ''
            },
            prazoOrcamentos: ''
          }}
        />
      )}
    </>
  );
};

export default NewMaintenanceButton; 