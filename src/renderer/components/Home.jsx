import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { databaseService } from '../../services/databaseService';
import { toast } from 'react-toastify';
import CacheStatus from './CacheStatus';
import '../styles/pages/Home.css';

const Home = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);

    const loadStats = async () => {
        try {
            const { data, error } = await databaseService.getStats(user.id);
            if (error) throw error;
            setStats(data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            toast.error('Error al cargar estadísticas');
        }
    };

    useEffect(() => {
        if (user) {
            loadStats();
        }
    }, [user]);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="home-container">
            <div className="welcome-section">
                <h1>Bienvenido, {user?.email}</h1>
                <p>Gestiona tus PDFs de forma fácil y organizada</p>
            </div>

            <div className="stats-dashboard">
                <div className="stats-panel">
                    <div className="stat-card">
                        <i className="fas fa-file-pdf"></i>
                        <div className="stat-info">
                            <h3>PDFs Totales</h3>
                            <p>{stats?.totalPdfs || 0}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <i className="fas fa-database"></i>
                        <div className="stat-info">
                            <h3>Espacio Usado</h3>
                            <p>{stats ? formatBytes(stats.totalSize) : '0 B'}</p>
                        </div>
                    </div>
                    {stats?.lastUpdated && (
                        <div className="stat-card">
                         
                            <div className="stat-info">
                                <h3>Último PDF Actualizado</h3>
                                <p>{stats.lastUpdated.title}</p>
                                <small>
                                    En {stats.lastUpdated.library} - {stats.lastUpdated.date}
                                </small>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="cache-section">
                <CacheStatus />
            </div>
        </div>
    );
};

export default Home;