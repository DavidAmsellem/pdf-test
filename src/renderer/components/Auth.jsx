import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AnimatedSignature from './AnimatedSignature';
import '../styles/pages/Auth.css';

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Solo una confirmación
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState(null);
    const { signIn, signUp } = useAuth();

    const validateEmail = (email) => {
        const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        return re.test(email);
    };

    // Modificar la validación de contraseñas
    const validatePasswords = () => {
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validar email
        if (!validateEmail(email)) {
            setError('Por favor, introduce un email válido');
            return;
        }

        // Validar contraseña
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (!isLogin && !validatePasswords()) {
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setIsLogin(!isLogin);
    };

    return (
        <div className="auth-wrapper">
            <div className="floating-icons">
                <i className="fas fa-file-pdf floating-icon"></i>
                <i className="fas fa-book floating-icon"></i>
                <i className="fas fa-file-alt floating-icon"></i>
                <i className="fas fa-file-pdf floating-icon"></i>
                <i className="fas fa-book-reader floating-icon"></i>
                <i className="fas fa-file-pdf floating-icon"></i>
                <i className="fas fa-book-open floating-icon"></i>
                <i className="fas fa-file-pdf floating-icon"></i>
            </div>
            <div className="auth-title-bar">
                <div className="title-text">
                    <i className="fas fa-book"></i>
                    PDF Biblioteca
                </div>
                <div className="window-controls">
                    <button 
                        className="window-control minimize"
                        onClick={() => window.electron.minimizeWindow()}
                    >
                        <i className="fas fa-window-minimize"></i>
                    </button>
                    <button 
                        className="window-control close"
                        onClick={() => window.electron.closeWindow()}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <i className="fas fa-book"></i>
                        <h2>PDF Biblioteca</h2>
                        <p>{isLogin ? 'Iniciar Sesión' : 'Registro'}</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <i className="fas fa-exclamation-circle"></i>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={error && !validateEmail(email) ? 'input-error' : ''}
                                placeholder="ejemplo@correo.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={error && password.length < 6 ? 'input-error' : ''}
                                placeholder="Mínimo 6 caracteres"
                                required
                            />
                        </div>
                        {!isLogin && (
                            <div className="form-group">
                                <label>Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={error && password !== confirmPassword ? 'input-error' : ''}
                                    placeholder="Repite tu contraseña"
                                    required
                                />
                            </div>
                        )}
                        <button 
                            type="submit" 
                            className="btn-auth"
                            disabled={loading}
                        >
                            {loading ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <button 
                            className="btn-switch"
                            onClick={resetForm}
                        >
                            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                        </button>
                        <AnimatedSignature />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;