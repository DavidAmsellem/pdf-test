// Utilidad para obtener información de políticas de Supabase
import { supabase } from '../supabase/client';

/**
 * Obtiene un resumen de todas las políticas implementadas en Supabase
 * Nota: Requiere permisos de administrador o acceso al esquema pg_policy
 * @returns {Promise<Array>} Array con las políticas
 */
export const getPoliciesSummary = async () => {
    try {
        // Esta consulta requiere permisos de superusuario en PostgreSQL
        const { data, error } = await supabase.rpc('get_all_policies');
        
        if (error) {
            console.error('Error al obtener políticas:', error);
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error al consultar políticas:', error);
        return null;
    }
};

/**
 * Obtiene las políticas para una tabla específica
 * @param {string} tableName - Nombre de la tabla
 * @returns {Promise<Object>} - Información sobre la tabla y sus políticas
 */
export const getTablePolicies = async (tableName) => {
    try {
        const { data, error } = await supabase
            .from('information_schema.policies')
            .select('*')
            .eq('table_name', tableName);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error al obtener políticas para ${tableName}:`, error);
        return null;
    }
};

/**
 * Obtiene un resumen de las tablas disponibles en la base de datos
 * @returns {Promise<Array>} - Lista de tablas
 */
export const getAvailableTables = async () => {
    try {
        // Consultar tablas disponibles
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');
            
        if (error) throw error;
        return data.map(item => item.table_name);
    } catch (error) {
        console.error('Error al obtener tablas:', error);
        return [];
    }
};
