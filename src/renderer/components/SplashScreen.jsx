import React from 'react';
import '../styles/components/SplashScreen.css';

const SplashScreen = () => {
    return (
        <div className="splash-screen">
            <div className="splash-content">
                <img 
                    src="../../assets/icon.ico" 
                    alt="PDF Biblioteca" 
                    className="splash-logo"
                />
                <h1>PDF Biblioteca</h1>
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
                <p>Iniciando aplicación...</p>
            </div>
        </div>
    );
};

export default SplashScreen;
