import React from 'react';
import '../styles/components/TitleBar.css';

const TitleBar = () => {
    return (
        <div className="titlebar">
            <div className="titlebar-drag-region">
                <div className="window-title">
                    <i className="fas fa-book"></i>
                    <span>PDF Biblioteca</span>
                </div>
            </div>
            <div className="window-controls">
                <button 
                    className="window-control minimize"
                    onClick={() => window.electron.minimizeWindow()}
                >
                    <i className="fas fa-window-minimize"></i>
                </button>
                <button 
                    className="window-control maximize"
                    onClick={() => window.electron.maximizeWindow()}
                >
                    <i className="fas fa-window-maximize"></i>
                </button>
                <button 
                    className="window-control close"
                    onClick={() => window.electron.closeWindow()}
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
        </div>
    );
};

export default TitleBar;