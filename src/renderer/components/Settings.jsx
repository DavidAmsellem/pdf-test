import React from 'react';
import { toast } from 'react-toastify';
import SupabaseStatus from './SupabaseStatus';
import EmailStatusList from './sign/EmailStatusList';
import NetworkTest from './NetworkTest';
import '../styles/sign/EmailStatusList.css';
import '../styles/pages/Settings.css';

const Settings = () => {
    const handleOpenCache = async () => {
        try {
            const result = await window.electronAPI.openCacheFolder();
            if (!result.success) {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error al abrir carpeta de caché:', error);
            toast.error('No se pudo abrir la carpeta de caché');
        }
    };

    return (
        <div className="settings-container animate-fade-in">
            <h2><i className="fas fa-cog"></i> Ajustes</h2>
            <div className="settings-grid">
                <div className="settings-card">
                    <h3>Diagnóstico del Sistema</h3>
                    <SupabaseStatus />
                    <NetworkTest />
                </div>
                
                <div className="settings-card">
                    <h3>Almacenamiento</h3>
                    <div className="setting-item">
                        <label>Caché de PDFs</label>
                        <button 
                            onClick={handleOpenCache}
                            className="open-folder-button"
                        >
                            <i className="fas fa-folder-open"></i>
                            Abrir carpeta
                        </button>
                    </div>
                </div>

                
            </div>
        </div>
    );
};

export default Settings;