/**
 * Formatea una fecha relativa al momento actual
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Texto formateado (ej: "hace 2 días", "en 3 horas")
 */
export const formatRelativeTime = (date) => {
    if (!date) return 'Fecha no disponible';

    const now = new Date();
    const targetDate = new Date(date);
    const diffInSeconds = Math.floor((targetDate - now) / 1000);
    const absSeconds = Math.abs(diffInSeconds);

    const units = [
        { unit: 'año', seconds: 31536000 },
        { unit: 'mes', seconds: 2592000 },
        { unit: 'día', seconds: 86400 },
        { unit: 'hora', seconds: 3600 },
        { unit: 'minuto', seconds: 60 },
        { unit: 'segundo', seconds: 1 }
    ];

    for (const { unit, seconds } of units) {
        const value = Math.floor(absSeconds / seconds);
        
        if (value > 0) {
            const plural = value === 1 ? '' : 's';
            return diffInSeconds < 0 
                ? `hace ${value} ${unit}${plural}`
                : `en ${value} ${unit}${plural}`;
        }
    }

    return 'ahora mismo';
};

/**
 * Formatea una fecha a formato local español
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada (ej: "18 de mayo de 2024")
 */
export const formatLocalDate = (date) => {
    if (!date) return 'Fecha no disponible';

    return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Formatea una fecha con hora en formato local español
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} - Fecha y hora formateada (ej: "18 de mayo de 2024, 15:30")
 */
export const formatLocalDateTime = (date) => {
    if (!date) return 'Fecha no disponible';

    return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
