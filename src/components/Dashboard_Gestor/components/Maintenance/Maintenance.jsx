import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiRefreshCcw } from 'react-icons/fi';
import NewMaintenanceButton from './NewMaintenanceButton';
import WorkDetailsModal from '../WorkDetailsModal/WorkDetailsModal';
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../../../contexts/auth';
import './Maintenance.css';

function Maintenance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [manutencoes, setManutencoes] = useState([]);
  const [filteredManutencoes, setFilteredManutencoes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [orcamentos, setOrcamentos] = useState([]);
  const [orcamentosLoading, setOrcamentosLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchManutencoes();
    }
  }, [user]);

  const fetchManutencoes = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      console.log('Fetching maintenances for user:', user.email, 'userId:', user.uid);
      
      // Query the ManutençãoPedidos collection using both email and userId
      const maintenancesEmailQuery = query(
        collection(db, 'ManutençãoPedidos'),
        where('userEmail', '==', user.email)
      );
      
      const maintenancesUserIdQuery = query(
        collection(db, 'ManutençãoPedidos'),
        where('userId', '==', user.uid)
      );
      
      const [maintenancesEmailSnapshot, maintenancesUserIdSnapshot] = await Promise.all([
        getDocs(maintenancesEmailQuery),
        getDocs(maintenancesUserIdQuery)
      ]);
      
      console.log('Maintenances found by email:', maintenancesEmailSnapshot.docs.length);
      console.log('Maintenances found by userId:', maintenancesUserIdSnapshot.docs.length);
      
      // Create a unique set of maintenances by ID
      const maintenanceDocsMap = new Map();
      
      [...maintenancesEmailSnapshot.docs, ...maintenancesUserIdSnapshot.docs].forEach(doc => {
        if (!maintenanceDocsMap.has(doc.id)) {
          maintenanceDocsMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            source: 'ManutençãoPedidos'
          });
        }
      });
      
      const manutencoesData = Array.from(maintenanceDocsMap.values());
      console.log('Total unique maintenance records:', manutencoesData.length);
      
      const sortedManutencoes = manutencoesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      setManutencoes(sortedManutencoes);
      setFilteredManutencoes(sortedManutencoes);
      console.log('Maintenance state updated with:', sortedManutencoes.length, 'items');
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, priorityFilter, locationFilter]);

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handleManutencaoClick = (manutencao) => {
    setSelectedWork(manutencao);
    fetchOrcamentos(manutencao.id);
  };

  const handleComplete = async (workId, newStatus) => {
    if (!workId) return;

    try {
      const workRef = doc(db, 'ManutençãoPedidos', workId);
      await updateDoc(workRef, {
        status: newStatus
      });

      setManutencoes(prevManutencoes => 
        prevManutencoes.map(manutencao => 
          manutencao.id === workId 
            ? { ...manutencao, status: newStatus } 
            : manutencao
        )
      );

      setSelectedWork(null);
    } catch (error) {
      console.error('Erro ao atualizar status da manutenção:', error);
      alert('Ocorreu um erro ao atualizar o status da manutenção.');
    }
  };

  const handleEdit = (manutencao) => {
    navigate(`/dashgestor/edit-maintenance/${manutencao.id}`);
  };

  const handleDelete = async (workId) => {
    if (!workId) return;

    if (window.confirm('Tem certeza que deseja excluir esta manutenção?')) {
      try {
        const workRef = doc(db, 'ManutençãoPedidos', workId);
        await deleteDoc(workRef);

        setManutencoes(prevManutencoes => 
          prevManutencoes.filter(manutencao => manutencao.id !== workId)
        );

        setSelectedWork(null);
      } catch (error) {
        console.error('Erro ao deletar manutenção:', error);
        alert('Ocorreu um erro ao deletar a manutenção.');
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedWork(null);
  };

  const totalPages = Math.ceil(filteredManutencoes.length / itemsPerPage);
  const paginatedManutencoes = filteredManutencoes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchOrcamentos = async (manutencaoId) => {
    setOrcamentosLoading(true);
    try {
      const orcamentosQuery = query(
        collection(db, 'ManutençãoOrçamentos'),
        where('manutencaoId', '==', manutencaoId)
      );
      const snapshot = await getDocs(orcamentosQuery);
      const orcamentosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrcamentos(orcamentosData);
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      setOrcamentos([]);
    } finally {
      setOrcamentosLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="jobs-container">
        <div className="jobs-header">
          <button className="back-button" onClick={handleBack}>
            <FiArrowLeft /> Voltar
          </button>
          <h1>Manutenções</h1>
        </div>
        <div className="loading-container">
          <p>Carregando manutenções...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft /> Voltar
        </button>
        <h1>Manutenções</h1>
        <button 
          className="refresh-button" 
          onClick={fetchManutencoes}
          title="Atualizar lista de manutenções"
        >
          <FiRefreshCcw /> Atualizar
        </button>
      </div>

      <div className="content-wrapper">
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

            <NewMaintenanceButton onCreated={fetchManutencoes} user={user} />
          </div>
        </div>

        <div className="obras-table-container">
          {filteredManutencoes.length > 0 ? (
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
                {paginatedManutencoes.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                      Nenhuma manutenção encontrada
                    </td>
                  </tr>
                ) : (
                  paginatedManutencoes.map((manutencao) => (
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
                      <td>{manutencao.date && new Date(manutencao.date).toLocaleDateString()}</td>
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
          ) : (
            <div className="no-maintenances-message">
              <p>Nenhuma manutenção encontrada</p>
            </div>
          )}
        </div>

        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx + 1}
              className={`pagination-button${currentPage === idx + 1 ? ' active' : ''}`}
              onClick={() => setCurrentPage(idx + 1)}
            >
              {idx + 1}
            </button>
          ))}
          <button
            className="pagination-button"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </button>
          <span className="pagination-info">
            Página {currentPage} de {totalPages}
          </span>
        </div>
      </div>

      {selectedWork && (
        <WorkDetailsModal
          work={selectedWork}
          workOrcamentos={orcamentos}
          orcamentosLoading={orcamentosLoading}
          onClose={handleCloseModal}
          onEdit={() => handleEdit(selectedWork)}
          onDelete={() => handleDelete(selectedWork.id)}
          onComplete={handleComplete}
          onFileDownload={() => {}}
        />
      )}
    </div>
  );
}

export default Maintenance; 