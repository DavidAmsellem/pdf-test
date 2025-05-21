import React, { useState } from 'react';
import { supabase } from '../../supabase/client';
import { toast } from 'react-toastify';
import '../styles/components/NetworkTest.css';

const NetworkTest = () => {
    const [testResults, setTestResults] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    const runNetworkTests = async () => {
        setIsRunning(true);
        setTestResults(null);
        
        const results = {
            supabase: { success: false, latency: null, error: null },
            internet: { success: false, latency: null, error: null },
            cache: { success: false, latency: null, error: null }
        };

        try {
            // Test Supabase
            const supabaseStart = Date.now();
            const { error: supabaseError } = await supabase.from('pdfs').select('count');
            results.supabase = {
                success: !supabaseError,
                latency: Date.now() - supabaseStart,
                error: supabaseError?.message
            };

            // Test Internet
            const internetStart = Date.now();
            try {
                await fetch('https://www.google.com');
                results.internet = {
                    success: true,
                    latency: Date.now() - internetStart
                };
            } catch (error) {
                results.internet = {
                    success: false,
                    latency: null,
                    error: error.message
                };
            }

            // Test Cache Speed (a través de la API de Electron)
            const cacheStart = Date.now();
            try {
                await window.electronAPI.testCacheAccess();
                results.cache = {
                    success: true,
                    latency: Date.now() - cacheStart
                };
            } catch (error) {
                results.cache = {
                    success: false,
                    latency: null,
                    error: error.message
                };
            }

            setTestResults(results);
            toast.success('Pruebas de red completadas');
        } catch (error) {
            toast.error('Error al ejecutar las pruebas de red');
            console.error('Error en pruebas de red:', error);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="network-test-container">
            <button 
                onClick={runNetworkTests}
                disabled={isRunning}
                className="test-button"
            >
                {isRunning ? (
                    <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Ejecutando pruebas...
                    </>
                ) : (
                    <>
                        <i className="fas fa-network-wired"></i>
                        Ejecutar pruebas de red
                    </>
                )}
            </button>

            {testResults && (
                <div className="test-results">
                    <h4>Resultados de las pruebas</h4>
                    
                    <div className="result-item">
                        <span className="result-label">Conexión Supabase:</span>
                        <div className="result-value">
                            <span className={`status-dot ${testResults.supabase.success ? 'success' : 'error'}`}></span>
                            {testResults.supabase.latency ? `${testResults.supabase.latency}ms` : 'Error'}
                        </div>
                    </div>

                    <div className="result-item">
                        <span className="result-label">Conexión a Internet:</span>
                        <div className="result-value">
                            <span className={`status-dot ${testResults.internet.success ? 'success' : 'error'}`}></span>
                            {testResults.internet.latency ? `${testResults.internet.latency}ms` : 'Error'}
                        </div>
                    </div>

                    <div className="result-item">
                        <span className="result-label">Acceso a Caché:</span>
                        <div className="result-value">
                            <span className={`status-dot ${testResults.cache.success ? 'success' : 'error'}`}></span>
                            {testResults.cache.latency ? `${testResults.cache.latency}ms` : 'Error'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkTest;