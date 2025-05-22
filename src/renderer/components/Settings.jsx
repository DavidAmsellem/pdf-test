import React from 'react';
import { toast } from 'react-toastify';
import SupabaseStatus from './SupabaseStatus';
import EmailStatusList from './sign/EmailStatusList';
import NetworkTest from './NetworkTest';
import NetworkDiagnostics from './NetworkDiagnostics';
import DatabaseTest from './DatabaseTest';
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
                    <div className="setting-item">
                        <h4>Pruebas de Base de Datos</h4>
                        <p className="setting-description">
                            Ejecuta diagnósticos para verificar el estado y rendimiento de la base de datos.
                        </p>
                        <DatabaseTest />
                    </div>
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

                <div className="settings-card full-width">
                    <h3><i className="fas fa-network-wired"></i> Pruebas de Estabilidad de Red</h3>
                    <p className="setting-description">
                        Ejecuta un diagnóstico completo para verificar la estabilidad de la conexión y detectar posibles problemas de red.
                    </p>
                    <NetworkDiagnostics />
                </div>
            </div>
        </div>
    );
};

export default Settings;