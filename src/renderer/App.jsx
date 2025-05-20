import React, { useState } from 'react';
import { useAuth, AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import './styles/base/App.css';
import Sidebar from './components/Sidebar';
import TitleBar from './components/TitleBar';
import Home from './components/Home';
import PDFLibrary from './components/PDFLibrary';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PDFPreloader from './components/PDFPreloader';
import DocumentSigningLog from './components/sign/DocumentSigningLog';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';

function App() {
    const [currentView, setCurrentView] = useState('home');
    const { user } = useAuth();
    const [darkMode, setDarkMode] = useState(false);

    if (!user) {
        return <Auth />;
    }

    const renderContent = () => {
        switch(currentView) {
            case 'home':
                return <Home />;
            case 'library':
                return <PDFLibrary />;
            case 'signing-log':
                return <DocumentSigningLog />;
            case 'settings':
                return <Settings />;
            default:
                return <Home />;
        }
    };

    return (
        <AuthProvider>
            <ThemeProvider>
                <Router>
                    <div className="app" data-theme={darkMode ? 'dark' : 'light'}>
                        <PDFPreloader />
                        <TitleBar />
                        <div className="app-content">
                            <Sidebar 
                                onNavigate={setCurrentView} 
                                currentView={currentView}
                                user={user}
                            />
                            <main className="main-content">
                                <div className="content-wrapper">
                                    {renderContent()}
                                </div>
                            </main>
                        </div>
                        <ToastContainer 
                            position="bottom-right"
                            autoClose={3000}
                            hideProgressBar={false}
                            newestOnTop
                            closeOnClick
                            rtl={false}
                            pauseOnFocusLoss
                            draggable
                            pauseOnHover
                        />
                    </div>
                    <Routes>
                        <Route path="/splash" element={<SplashScreen />} />
                    </Routes>
                </Router>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;