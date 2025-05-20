import React, { useState } from 'react';
import '../styles/components/LibraryFilter.css';

const LibraryFilter = ({
    onFilterChange,
    onSortChange,
    onSearchTypeChange,
    totalItems,
    filterActive,
    searchType = 'all'
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        onFilterChange(value);
    };

    const handleSearchTypeChange = (e) => {
        const type = e.target.value;
        onSearchTypeChange(type);
        // Volver a aplicar el término de búsqueda actual con el nuevo tipo
        onFilterChange(searchTerm, type);
    };

    const clearSearch = () => {
        setSearchTerm('');
        onFilterChange('');
    };

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
                        onClick={clearSearch}
                        aria-label="Limpiar búsqueda"
                    >
                        <i className="fas fa-times"></i>
                        Limpiar filtros
                    </button>
                )}
            </div>
            
            <div className="filter-controls">
                <div className="search-container">
                    <div className="search-wrapper">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder={`Buscar ${searchType === 'libraries' ? 'bibliotecas' : 
                                        searchType === 'pdfs' ? 'PDFs' : 
                                        'bibliotecas y PDFs'}...`}
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="filter-input"
                        />
                    </div>
                    <select 
                        className="search-type-select"
                        value={searchType}
                        onChange={handleSearchTypeChange}
                    >
                        <option value="all">Todo</option>
                        <option value="libraries">Bibliotecas</option>
                        <option value="pdfs">PDFs</option>
                    </select>
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