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
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Starting fetchOrcamentosForWork for workId: ${workId}`);
      }
      
      // First check if the work document already has orcamentos array
      const workRef = doc(db, 'ObrasPedidos', workId);
      const workDoc = await getDoc(workRef);
      const workData = workDoc.data();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Work data:`, workData);
      }

      if (workData && Array.isArray(workData.orcamentos) && workData.orcamentos.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Found ${workData.orcamentos.length} orcamentos in work document:`, workData.orcamentos);
        }
        return workData.orcamentos;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] No orcamentos array found in work document, checking orcamentos collection`);
      }

      // If not found in the work document, try to fetch from orcamentos collection
      const orcamentosRef = collection(db, 'ObrasOrçamentos');
      const q = query(orcamentosRef, where('workId', '==', workId));
      const querySnapshot = await getDocs(q);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Orcamentos collection query result: ${querySnapshot.size} documents found`);
      }
      
      if (querySnapshot.empty) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] No orcamentos found in collection for workId: ${workId}`);
        }
        return [];
      }
      
      const orcamentosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Orcamento document data:`, data);
        }
        return {
          id: doc.id,
          ...data
        };
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Processed ${orcamentosData.length} orcamentos from collection:`, orcamentosData);
      }

      // Update the work document with these orcamentos for future reference
      if (orcamentosData.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Updating work document with orcamentos array`);
        }
        await updateDoc(workRef, {
          orcamentos: orcamentosData
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] Work document updated successfully`);
        }
      }

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
  const handleAcceptOrcamento = async (workId, orcamentoIndex) => {
    try {
      setLoading(true);
      const workRef = doc(db, 'ObrasPedidos', workId);
      const workDoc = await getDoc(workRef);
      const workData = workDoc.data();
      
      if (!workData.orcamentos || !Array.isArray(workData.orcamentos)) {
        alert('Não foi possível encontrar os orçamentos desta obra.');
        return;
      }

      // Update the specific orcamento to mark it as accepted and viewed
      const updatedOrcamentos = workData.orcamentos.map((orcamento, index) => {
        if (index === orcamentoIndex) {
          return { ...orcamento, aceito: true, visualizado: true };
        }
        return orcamento;
      });

      // Update in Firestore - both orcamentos and status
      await updateDoc(workRef, {
        orcamentos: updatedOrcamentos,
        status: 'em-andamento'
      });

      // Update local state
      setObras(prevObras => 
        prevObras.map(obra => 
          obra.id === workId ? { ...obra, orcamentos: updatedOrcamentos, status: 'em-andamento' } : obra
        )
      );
      
      // Update the selected work
      if (selectedWork && selectedWork.id === workId) {
        setSelectedWork({
          ...selectedWork,
          orcamentos: updatedOrcamentos,
          status: 'em-andamento'
        });
      }

      // Show success message
      alert('Orçamento aceito com sucesso!');
    } catch (error) {
      console.error('Erro ao aceitar orçamento:', error);
      alert('Erro ao aceitar orçamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workId) => {
    if (!workId) return;
    if (window.confirm('Tem certeza que deseja eliminar esta obra?')) {
      try {
        const workRef = doc(db, 'ObrasPedidos', workId);
        await deleteDoc(workRef);
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
            return {
              ...obra,
              status: 'disponivel',
              technicianId: null,
              orcamentos: obra.orcamentos?.map(orc => 
                orc.id === orcamentoId ? { ...orc, aceito: false } : orc
              )
            };
          }
          return obra;
        })
      );

      // Recarregar os dados
      await fetchObras();
      
      // Fechar o modal
      setSelectedWork(null);
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