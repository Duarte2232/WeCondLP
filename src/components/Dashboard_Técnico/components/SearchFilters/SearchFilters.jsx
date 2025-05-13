import React from 'react';
import { FiSearch } from 'react-icons/fi';
import './SearchFilters.css';

function SearchFilters({ 
  searchTerm, 
  setSearchTerm, 
  selectedFilters, 
  setSelectedFilters 
}) {
  return (
    <div className="jobs-search-section">
      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisar obras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="filters-section">
        <select
          value={selectedFilters.status}
          onChange={(e) => setSelectedFilters({...selectedFilters, status: e.target.value})}
        >
          <option value="">Status</option>
          <option value="disponivel">Disponível</option>
          <option value="orcamento-enviado">Orçamento Enviado</option>
          <option value="em-andamento">Em Andamento</option>
          <option value="concluida">Concluída</option>
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

        <input
          type="text"
          placeholder="Filtrar por localização..."
          value={selectedFilters.location}
          onChange={(e) => setSelectedFilters({...selectedFilters, location: e.target.value})}
          className="location-filter"
        />
      </div>
    </div>
  );
}

export default SearchFilters; 