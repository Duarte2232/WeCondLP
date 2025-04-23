import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiPlus } from 'react-icons/fi';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/auth';
import './Jobs.css';
import WorkDetailsModal from '../WorkDetailsModal/WorkDetailsModal';

function Jobs() {
  const navigate = useNavigate();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [selectedWork, setSelectedWork] = useState(null);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
    fetchObras();
  }, [user]);

  const fetchObras = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return;
      
      const worksRef = collection(db, 'works');
      const q = query(worksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const obrasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const sortedObras = obrasData.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setObras(sortedObras);
    } catch (error) {
      console.error("Erro ao buscar obras:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredObras = obras.filter(obra => {
    const matchesSearch = obra.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obra.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || obra.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || obra.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || obra.priority === priorityFilter;
    const matchesLocation = !locationFilter || 
                          (obra.location && 
                           (obra.location.morada?.toLowerCase().includes(locationFilter.toLowerCase()) ||
                            obra.location.cidade?.toLowerCase().includes(locationFilter.toLowerCase()) ||
                            obra.location.codigoPostal?.toLowerCase().includes(locationFilter.toLowerCase())));

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesLocation;
  });

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handleObraClick = (obra) => {
    setSelectedWork(obra);
  };

  const handleCloseModal = () => {
    setSelectedWork(null);
  };

  const handleNewWork = () => {
    navigate('/dashgestor/workform');
  };

  const handleComplete = async (workId, newStatus) => {
    try {
      const workRef = doc(db, 'works', workId);
      await updateDoc(workRef, {
        status: newStatus
      });
      
      // Update the local state
      setObras(prevObras => 
        prevObras.map(obra => 
          obra.id === workId ? { ...obra, status: newStatus } : obra
        )
      );
      
      // Close the modal
      setSelectedWork(null);
      
      // Optionally refresh the data
      fetchObras();
    } catch (error) {
      console.error("Erro ao atualizar status da obra:", error);
    }
  };

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft />
          <span>Voltar</span>
        </button>
      </div>

      <h1 className="main-title">Gestão de Obras</h1>

      <div className="filters-container">
        <div className="filters-inline">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Pesquisar obras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Status</option>
            <option value="disponivel">Disponível</option>
            <option value="em-andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>

          <select 
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Categorias</option>
            <option value="Infiltração">Infiltração</option>
            <option value="Fissuras e rachaduras">Fissuras</option>
            <option value="Canalização">Canalização</option>
            <option value="Jardinagem">Jardinagem</option>
            <option value="Fiscalização">Fiscalização</option>
            <option value="Reabilitação de Fachada">Fachada</option>
            <option value="Eletricidade">Eletricidade</option>
            <option value="Construção">Construção</option>
            <option value="Pintura">Pintura</option>
          </select>

          <select 
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Prioridade</option>
            <option value="Baixa">Baixa</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
            <option value="Urgente">Urgente</option>
          </select>

          <input
            type="text"
            placeholder="Localização"
            className="filter-select location-filter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />

          <button className="new-work-button" onClick={handleNewWork}>
            <FiPlus /> Nova Obra
          </button>
        </div>
      </div>
      
      <div className="obras-table-container">
        <table className="obras-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Data</th>
              <th>Categoria</th>
              <th>Prioridade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  Carregando obras...
                </td>
              </tr>
            ) : filteredObras.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhuma obra encontrada
                </td>
              </tr>
            ) : (
              filteredObras.map((obra) => (
                <tr 
                  key={obra.id} 
                  className="work-row"
                  onClick={() => handleObraClick(obra)}
                >
                  <td className="title-cell">
                    <div className="work-title">{obra.title}</div>
                    {obra.description && (
                      <div className="work-subtitle">{obra.description}</div>
                    )}
                  </td>
                  <td>{obra.date}</td>
                  <td>{obra.category}</td>
                  <td>
                    <span className={`priority-badge ${obra.priority?.toLowerCase() || ''}`}>
                      {obra.priority || 'Normal'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${obra.status?.toLowerCase() || ''}`}>
                      {obra.status === 'concluido' ? 'Concluída' :
                       obra.status === 'em-andamento' ? 'Em andamento' :
                       'Disponível'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedWork && (
        <WorkDetailsModal
          work={selectedWork}
          onClose={handleCloseModal}
          onEdit={() => {}}
          onDelete={() => {}}
          onComplete={handleComplete}
          onFileDownload={() => {}}
        />
      )}
    </div>
  );
}

export default Jobs; 