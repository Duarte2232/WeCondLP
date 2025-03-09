import React from 'react';
import './SearchFilters.css';
import { FiSearch } from 'react-icons/fi';

function SearchFilters({ 
  searchTerm, 
  setSearchTerm, 
  selectedFilters, 
  setSelectedFilters
}) {
  return (
    <div className="filters-container">
      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar obras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="filters">
        <select
          value={selectedFilters.status}
          onChange={(e) => setSelectedFilters({...selectedFilters, status: e.target.value})}
        >
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Concluído">Concluído</option>
        </select>
        <select
          value={selectedFilters.category}
          onChange={(e) => setSelectedFilters({...selectedFilters, category: e.target.value})}
        >
          <option value="">Categoria</option>
          <option value="Infiltração">Infiltração</option>
          <option value="Fissuras e rachaduras">Fissuras e rachaduras</option>
          <option value="Canalização">Canalização</option>
          <option value="Manutenção">Manutenção</option>
          <option value="Jardinagem">Jardinagem</option>
          <option value="Fiscalização">Fiscalização</option>
          <option value="Reabilitação de Fachada">Reabilitação de Fachada</option>
          <option value="Eletricidade">Eletricidade</option>
          <option value="Construção">Construção</option>
          <option value="Pintura">Pintura</option>
        </select>
      </div>
    </div>
  );
}

export default SearchFilters; 