import CryptoJS from 'crypto-js';

// Clave de encriptación por defecto para producción
const DEFAULT_KEY = 'd8e8fca2dc0f896fd7cb4cb0031ba249';

// Usar la variable de entorno si está disponible, sino usar la clave por defecto
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || DEFAULT_KEY;

if (!SECRET_KEY) {
    console.error('⚠️ Usando clave de encriptación por defecto');
}

export const encryptionService = {
    encrypt: (data) => {
        if (!data) return null;
        try {
            const stringData = typeof data === 'object' ? JSON.stringify(data) : String(data);
            return CryptoJS.AES.encrypt(stringData, SECRET_KEY).toString();
        } catch (error) {
            console.error('Error al cifrar:', error);
            return null;
        }
    },

    decrypt: (encryptedData) => {
        if (!encryptedData) return null;
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            try {
                return JSON.parse(decryptedString);
            } catch {
                return decryptedString;
            }
        } catch (error) {
            console.error('Error al descifrar:', error);
            return null;
        }
    }
};