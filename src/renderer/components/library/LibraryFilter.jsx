import React from 'react';
import '../../styles/library/LibraryFilter.css';

const LibraryFilter = ({ 
    onFilterChange, 
    onSortChange, 
    totalItems,
    filterActive = false 
}) => {
    return (
        <div className="library-filter">
            <div className="filter-stats">
                <span className="total-items">
                    <i className="fas fa-book"></i>
                    {totalItems} {totalItems === 1 ? 'elemento' : 'elementos'}
                </span>
                {filterActive && (
                    <button 
                        className="clear-filter"
                        onClick={() => onFilterChange('')}
                    >
                        <i className="fas fa-times"></i>
                        Limpiar filtros
                    </button>
                )}
            </div>
            
            <div className="filter-controls">
                <div className="search-wrapper">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Buscar bibliotecas..."
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="filter-input"
                    />
                </div>
                
                <select 
                    className="sort-select"
                    onChange={(e) => onSortChange(e.target.value)}
                    defaultValue="name-asc"
                >
                    <option value="name-asc">Nombre (A-Z)</option>
                    <option value="name-desc">Nombre (Z-A)</option>
                    <option value="date-new">Más recientes</option>
                    <option value="date-old">Más antiguos</option>
                    <option value="size-large">Más elementos</option>
                    <option value="size-small">Menos elementos</option>
                </select>
            </div>
        </div>
    );
};

export default LibraryFilter;