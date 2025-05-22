import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getAvailableTables, getTablePolicies } from '../../utils/supabasePolicies';
import '../styles/components/PoliciesSummary.css';

const SupabasePolicies = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Cargar tablas al montar el componente
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            setLoading(true);
            const tablesData = await getAvailableTables();
            setTables(tablesData || []);
            setLoading(false);
            
            // Si hay tablas, seleccionar la primera por defecto
            if (tablesData && tablesData.length > 0) {
                setSelectedTable(tablesData[0]);
                loadPolicies(tablesData[0]);
            }
        } catch (error) {
            console.error('Error al cargar tablas:', error);
            toast.error('Error al cargar las tablas de Supabase');
            setLoading(false);
        }
    };

    const loadPolicies = async (tableName) => {
        if (!tableName) return;
        
        try {
            setLoading(true);
            const policiesData = await getTablePolicies(tableName);
            setPolicies(policiesData || []);
            setLoading(false);
        } catch (error) {
            console.error(`Error al cargar políticas de ${tableName}:`, error);
            toast.error(`Error al cargar políticas para ${tableName}`);
            setPolicies([]);
            setLoading(false);
        }
    };

    const handleTableChange = (e) => {
        const tableName = e.target.value;
        setSelectedTable(tableName);
        loadPolicies(tableName);
    };

    return (
        <div className="policies-summary-container">
            <h4>Políticas de Seguridad de Supabase</h4>
            
            {loading ? (
                <div className="policies-loading">
                    <i className="fas fa-spinner fa-spin"></i> Cargando...
                </div>
            ) : (
                <>
                    <div className="table-selector">
                        <label>Selecciona una tabla:</label>
                        <select 
                            value={selectedTable} 
                            onChange={handleTableChange}
                            disabled={loading}
                        >
                            {tables.map(table => (
                                <option key={table} value={table}>{table}</option>
                            ))}
                        </select>
                    </div>

                    {policies && policies.length > 0 ? (
                        <div className="policies-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Operación</th>
                                        <th>Expresión</th>
                                        <th>Rol</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policies.map((policy, index) => (
                                        <tr key={index}>
                                            <td>{policy.policy_name}</td>
                                            <td>{policy.operation}</td>
                                            <td>
                                                <code>{policy.definition || policy.expression}</code>
                                            </td>
                                            <td>{policy.role_name || 'public'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-policies">
                            {tables.length > 0 ? (
                                <p>No hay políticas configuradas para esta tabla.</p>
                            ) : (
                                <p>No se encontraron tablas en la base de datos.</p>
                            )}
                        </div>
                    )}
                </>
            )}
            
            <div className="policies-info">
                <p><i className="fas fa-info-circle"></i> Las políticas de Row-Level Security (RLS) controlan qué filas pueden ser leídas, insertadas, actualizadas o eliminadas según el usuario actual.</p>
            </div>
        </div>
    );
};

export default SupabasePolicies;
