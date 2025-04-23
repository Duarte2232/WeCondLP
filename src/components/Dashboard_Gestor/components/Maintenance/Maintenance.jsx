import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch } from 'react-icons/fi';
import NewMaintenanceButton from './NewMaintenanceButton';
import WorkDetailsModal from '../WorkDetailsModal/WorkDetailsModal';
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import './Maintenance.css';

function Maintenance() {
  const navigate = useNavigate();
  const [manutencoes, setManutencoes] = useState([]);
  const [filteredManutencoes, setFilteredManutencoes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null);

  useEffect(() => {
    // Obter o usuário atual do sessionStorage
    const currentUser = JSON.parse(sessionStorage.getItem('user'));
    setUser(currentUser);

    if (currentUser) {
      fetchManutencoes(currentUser);
    }
  }, []);

  const fetchManutencoes = async (currentUser) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'maintenances'),
        where('userEmail', '==', currentUser.email)
      );
      const querySnapshot = await getDocs(q);
      const manutencoesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setManutencoes(manutencoesData);
      setFilteredManutencoes(manutencoesData);
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = manutencoes.filter(manutencao => {
      const matchesSearch = manutencao.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           manutencao.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || manutencao.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || manutencao.category === categoryFilter;
      const matchesPriority = priorityFilter === 'all' || manutencao.priority === priorityFilter;
      const matchesLocation = !locationFilter || 
                            (manutencao.location && 
                             (manutencao.location.morada?.toLowerCase().includes(locationFilter.toLowerCase()) ||
                              manutencao.location.cidade?.toLowerCase().includes(locationFilter.toLowerCase()) ||
                              manutencao.location.codigoPostal?.toLowerCase().includes(locationFilter.toLowerCase())));

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesLocation;
    });

    setFilteredManutencoes(filtered);
  }, [manutencoes, searchTerm, statusFilter, categoryFilter, priorityFilter, locationFilter]);

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handleManutencaoClick = (manutencao) => {
    setSelectedWork(manutencao);
  };

  const handleComplete = async (workId, newStatus) => {
    if (!workId) return;

    try {
      // Atualizar no Firestore
      const workRef = doc(db, 'maintenances', workId);
      await updateDoc(workRef, {
        status: newStatus
      });

      // Atualizar localmente
      setManutencoes(prevManutencoes => 
        prevManutencoes.map(manutencao => 
          manutencao.id === workId 
            ? { ...manutencao, status: newStatus } 
            : manutencao
        )
      );

      // Fechar o modal
      setSelectedWork(null);
    } catch (error) {
      console.error('Erro ao atualizar status da manutenção:', error);
      alert('Ocorreu um erro ao atualizar o status da manutenção.');
    }
  };

  const handleCloseModal = () => {
    setSelectedWork(null);
  };

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft /> Voltar
        </button>
        <h1>Manutenções</h1>
      </div>

      <div className="filters-container">
        <div className="filters-inline">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Pesquisar manutenções..."
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

          <NewMaintenanceButton onCreated={() => fetchManutencoes(user)} />
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
                <td colSpan="5" className="loading-message">
                  <p>Carregando manutenções...</p>
                </td>
              </tr>
            ) : filteredManutencoes.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data-message">
                  <p>Nenhuma manutenção encontrada</p>
                </td>
              </tr>
            ) : (
              filteredManutencoes.map((manutencao) => (
                <tr 
                  key={manutencao.id} 
                  className="work-row"
                  onClick={() => handleManutencaoClick(manutencao)}
                >
                  <td className="title-cell">
                    <div className="work-title">{manutencao.title}</div>
                    {manutencao.description && (
                      <div className="work-subtitle">{manutencao.description}</div>
                    )}
                  </td>
                  <td>{manutencao.date}</td>
                  <td>{manutencao.category}</td>
                  <td>
                    <span className={`priority-badge ${manutencao.priority?.toLowerCase() || ''}`}>
                      {manutencao.priority || 'Normal'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${manutencao.status?.toLowerCase() || ''}`}>
                      {manutencao.status === 'concluido' ? 'Concluída' :
                       manutencao.status === 'em-andamento' ? 'Em andamento' :
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

export default Maintenance; 