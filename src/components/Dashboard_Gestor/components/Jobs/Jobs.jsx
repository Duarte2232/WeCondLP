import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiPlus } from 'react-icons/fi';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/auth';
import { toast } from 'react-hot-toast';
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Instead of using useEffect for debugging, we'll create a separate utility function
  const logWorkData = (work) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] Work data:`, {
        id: work.id,
        title: work.title,
        hasOrcamentos: Array.isArray(work.orcamentos),
        orcamentosCount: Array.isArray(work.orcamentos) ? work.orcamentos.length : 'N/A'
      });
    }
  };

  useEffect(() => {
    fetchObras();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, priorityFilter, locationFilter]);

  const fetchObras = async () => {
    try {
      setLoading(true);
      const obrasRef = collection(db, 'ObrasPedidos');
      const q = query(obrasRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const obrasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort works by date in descending order when first fetched
      const sortedObras = obrasData.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });
      
      setObras(sortedObras);
    } catch (error) {
      console.error('Erro ao buscar obras:', error);
      toast.error('Erro ao carregar obras');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch orcamentos for a specific work
  const fetchOrcamentosForWork = async (workId) => {
    try {
      // Only fetch from ObrasOrçamentos collection
      const orcamentosRef = collection(db, 'ObrasOrçamentos');
      const q = query(orcamentosRef, where('workId', '==', workId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      const orcamentosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return orcamentosData;
    } catch (error) {
      console.error(`[ERROR] Error fetching orcamentos:`, error);
      return [];
    }
  };

  const filteredObras = obras.filter(obra => {
    const matchesSearch = obra.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obra.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || obra.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || obra.category === categoryFilter;
    
    // Normalizar as prioridades para comparação
    const normalizePriority = (priority) => {
      if (!priority) return '';
      return priority.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace('media', 'média');
    };

    const matchesPriority = priorityFilter === 'all' || 
                           (obra.priority && normalizePriority(obra.priority) === normalizePriority(priorityFilter));
    
    const matchesLocation = !locationFilter || 
                          (obra.location && 
                           (obra.location.morada?.toLowerCase().includes(locationFilter.toLowerCase()) ||
                            obra.location.cidade?.toLowerCase().includes(locationFilter.toLowerCase()) ||
                            obra.location.codigoPostal?.toLowerCase().includes(locationFilter.toLowerCase())));

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesLocation;
  });

  const totalPages = Math.ceil(filteredObras.length / itemsPerPage);
  const paginatedObras = filteredObras.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleBack = () => {
    navigate('/dashgestor');
  };

  const handleObraClick = async (obra) => {
    try {
      // Show loading state
      setLoading(true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] handleObraClick called for obra:`, {
          id: obra.id,
          title: obra.title,
          hasOrcamentos: Array.isArray(obra.orcamentos),
          orcamentosCount: Array.isArray(obra.orcamentos) ? obra.orcamentos.length : 'N/A'
        });
      }
      
      // Check if obra has an orcamentos array
      if (!Array.isArray(obra.orcamentos)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Obra doesn't have orcamentos array, fetching from database`);
        }
        // Fetch orcamentos if needed
        const orcamentos = await fetchOrcamentosForWork(obra.id);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Fetched orcamentos:`, orcamentos);
        }
        obra = { ...obra, orcamentos };
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Updated obra object with orcamentos`);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Obra already has ${obra.orcamentos.length} orcamentos:`, obra.orcamentos);
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Setting selectedWork with obra:`, obra);
      }
      
      setSelectedWork(obra);
      
      // Log after setting selectedWork
      if (process.env.NODE_ENV === 'development' && obra) {
        logWorkData(obra);
      }
    } catch (error) {
      console.error(`[ERROR] Error in handleObraClick:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedWork(null);
  };

  const handleNewWork = () => {
    navigate('/dashgestor/workform');
  };

  const handleComplete = async (workId, newStatus) => {
    try {
      const workRef = doc(db, 'ObrasPedidos', workId);
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

  // Function to handle file download
  const handleFileDownload = (file) => {
    if (file && file.url) {
      window.open(file.url, '_blank');
    }
  };

  // Function to handle accepting an orcamento
  const handleAcceptOrcamento = async (workId, orcamentoId) => {
    try {
      setLoading(true);
      
      // Referências
      const workRef = doc(db, 'ObrasPedidos', workId);
      const orcamentoRef = doc(db, 'ObrasOrçamentos', orcamentoId);
      
      // Verificar se os documentos existem
      const workDoc = await getDoc(workRef);
      const orcamentoDoc = await getDoc(orcamentoRef);
      
      if (!workDoc.exists()) {
        throw new Error('Obra não encontrada');
      }
      
      if (!orcamentoDoc.exists()) {
        throw new Error('Orçamento não encontrado');
      }
      
      // Atualizar status da obra
      await updateDoc(workRef, {
        status: 'em-andamento'
      });
      
      // Atualizar status do orçamento
      await updateDoc(orcamentoRef, {
        aceito: true
      });

      // Atualizar estado local das obras
      setObras(prevObras => 
        prevObras.map(obra => {
          if (obra.id === workId) {
            // Create a safe copy of the obra
            const updatedObra = {
              ...obra,
              status: 'em-andamento'
            };
            
            // Update orcamentos if they exist
            if (Array.isArray(obra.orcamentos)) {
              updatedObra.orcamentos = obra.orcamentos.map(orc => 
                orc.id === orcamentoId ? { ...orc, aceito: true } : orc
              );
            }
            
            return updatedObra;
          }
          return obra;
        })
      );
      
      // Atualizar o selected work
      if (selectedWork && selectedWork.id === workId) {
        const updatedWork = {
          ...selectedWork,
          status: 'em-andamento'
        };

        // Update orcamentos in selectedWork if they exist
        if (Array.isArray(selectedWork.orcamentos)) {
          updatedWork.orcamentos = selectedWork.orcamentos.map(orc =>
            orc.id === orcamentoId ? { ...orc, aceito: true } : orc
          );
        }

        setSelectedWork(updatedWork);
      }

      // Show success message
      toast.success('Orçamento aceito com sucesso!');
    } catch (error) {
      console.error('Erro ao aceitar orçamento:', error);
      toast.error('Erro ao aceitar orçamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workId) => {
    if (!workId) return;
    if (window.confirm('Tem certeza que deseja eliminar esta obra?')) {
      try {
        // First, delete all associated orçamentos
        const orcamentosRef = collection(db, 'ObrasOrçamentos');
        const q = query(orcamentosRef, where('workId', '==', workId));
        const querySnapshot = await getDocs(q);
        
        // Delete each orçamento
        const deleteOrcamentosPromises = querySnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deleteOrcamentosPromises);

        // Then delete the work itself
        const workRef = doc(db, 'ObrasPedidos', workId);
        await deleteDoc(workRef);
        
        // Update local state
        setObras(prevObras => prevObras.filter(obra => obra.id !== workId));
        setSelectedWork(null);
      } catch (error) {
        console.error('Erro ao eliminar obra:', error);
        alert('Ocorreu um erro ao eliminar a obra.');
      }
    }
  };

  const handleCancelarAceitacao = async (workId, orcamentoId, isMaintenance = false) => {
    try {
      // Atualizar o orçamento na coleção ObrasOrçamentos
      const orcamentoRef = doc(db, 'ObrasOrçamentos', orcamentoId);
      await updateDoc(orcamentoRef, {
        aceito: false
      });

      // Atualizar o status da obra
      const obraRef = doc(db, 'ObrasPedidos', workId);
      await updateDoc(obraRef, {
        status: 'disponivel',
        technicianId: null
      });

      // Atualizar o estado local
      setObras(prevObras => 
        prevObras.map(obra => {
          if (obra.id === workId) {
            // Create a safe copy of the obra without modifying orcamentos if they don't exist
            const updatedObra = {
              ...obra,
              status: 'disponivel',
              technicianId: null
            };
            
            // Only modify orcamentos if they exist and are an array
            if (Array.isArray(obra.orcamentos)) {
              updatedObra.orcamentos = obra.orcamentos.map(orc => 
                orc.id === orcamentoId ? { ...orc, aceito: false } : orc
              );
            }
            
            return updatedObra;
          }
          return obra;
        })
      );

      // Update selectedWork if it's the current one
      if (selectedWork && selectedWork.id === workId) {
        const updatedWork = {
          ...selectedWork,
          status: 'disponivel',
          technicianId: null
        };
        
        // Only modify orcamentos if they exist and are an array
        if (Array.isArray(selectedWork.orcamentos)) {
          updatedWork.orcamentos = selectedWork.orcamentos.map(orc => 
            orc.id === orcamentoId ? { ...orc, aceito: false } : orc
          );
        }
        
        setSelectedWork(updatedWork);
      }

      // Success message
      toast.success('Orçamento cancelado com sucesso!');
      
      // Recarregar os dados em segundo plano
      fetchObras();
    } catch (error) {
      console.error('Erro ao cancelar aceitação:', error);
      toast.error('Erro ao cancelar aceitação do orçamento. Por favor, tente novamente.');
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
            ) : paginatedObras.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhuma obra encontrada
                </td>
              </tr>
            ) : (
              paginatedObras.map((obra) => (
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
          onClose={handleCloseModal}
          onEdit={() => {}}
          onDelete={() => handleDelete(selectedWork.id)}
          onComplete={handleComplete}
          onFileDownload={handleFileDownload}
          onAcceptOrcamento={handleAcceptOrcamento}
          onCancelarAceitacao={handleCancelarAceitacao}
        />
      )}
    </div>
  );
}

export default Jobs; 