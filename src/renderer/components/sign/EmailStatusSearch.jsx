import React from 'react';
import '../../styles/sign/EmailStatusSearch.css';

const EmailStatusSearch = ({ onSearch, onFilterStatus }) => {
    return (
        <div className="email-status-search">
            <div className="search-container">
                <div className="search-input-wrapper">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="Buscar por título o email..."
                        onChange={(e) => onSearch(e.target.value)}
                        className="status-search-input"
                    />
                </div>
                <select
                    onChange={(e) => onFilterStatus(e.target.value)}
                    className="status-filter-select"
                    defaultValue="all"
                >
                    <option value="all">Todos los estados</option>
                    <option value="ongoing">En proceso</option>
                    <option value="done">Completado</option> {/* Cambiado de 'completed' a 'done' */}
                    <option value="refused">Rechazado</option>
                    <option value="expired">Expirado</option>
                    <option value="initiated">Iniciado</option>
                </select>
            </div>
        </div>
    );
};

export default EmailStatusSearch;