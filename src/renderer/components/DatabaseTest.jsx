import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { databaseService } from '../../services/databaseService';
import '../styles/components/DatabaseTest.css';

Modal.setAppElement('#root');

const DatabaseTest = () => {
    const [testResults, setTestResults] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const runDatabaseTests = async () => {
        setIsRunning(true);
        try {
            const results = await databaseService.runDatabaseTests();
            setTestResults(results);
            setIsModalOpen(true);
            if (results.error) {
                toast.error('Algunos tests fallaron: ' + results.error);
            } else {
                toast.success(`Tests completados: ${results.summary.passedTests}/${results.summary.totalTests} exitosos`);
            }
        } catch (error) {
            console.error('Error al ejecutar tests:', error);
            toast.error('Error al ejecutar las pruebas de base de datos');
        } finally {
            setIsRunning(false);
        }
    };

    const getScoreClass = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'average';
        return 'poor';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <i className="fas fa-check-circle text-success"></i>;
            case 'warning':
                return <i className="fas fa-exclamation-triangle text-warning"></i>;
            case 'error':
                return <i className="fas fa-times-circle text-danger"></i>;
            default:
                return <i className="fas fa-question-circle"></i>;
        }
    };

    return (
        <div className="database-test">
            <button 
                onClick={runDatabaseTests}
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
                        <i className="fas fa-database"></i>
                        Ejecutar pruebas
                    </>
                )}
            </button>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                className="database-modal"
                overlayClassName="database-modal-overlay"
                ariaHideApp={false}
            >
                <div className="modal-header">
                    <h3>
                        <i className="fas fa-database"></i>
                        Resultados de las pruebas
                    </h3>
                    <button 
                        onClick={closeModal}
                        className="close-button"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                {testResults && (
                    <div className="test-results">
                        <div className="score-overview">
                            <div className={`score-circle ${getScoreClass(testResults.summary.averageScore)}`}>
                                <span className="score-value">{testResults.summary.averageScore}</span>
                                <span className="score-label">Puntuación</span>
                            </div>
                            <div className="score-details">
                                <div className="detail-item">
                                    <span>Tests completados:</span>
                                    <span>{testResults.summary.passedTests}/{testResults.summary.totalTests}</span>
                                </div>
                                <div className="detail-item">
                                    <span>Latencia:</span>
                                    <span>{testResults.summary.connectionLatency}ms</span>
                                </div>
                            </div>
                        </div>

                        <div className="tests-list">
                            {testResults.tests.map((test, index) => (
                                <div key={index} className={`test-item ${test.status}`}>
                                    <div className="test-header">
                                        {getStatusIcon(test.status)}
                                        <span className="test-name">{test.name}</span>
                                        {test.latency && (
                                            <span className="test-latency">{test.latency}</span>
                                        )}
                                    </div>
                                    <div className="test-details">
                                        {test.details}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DatabaseTest;
