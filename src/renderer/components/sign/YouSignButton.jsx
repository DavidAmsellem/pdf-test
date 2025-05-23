import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../../supabase/client';
import YouSignWizard from './YouSignWizard';
import SignatureStatus from '../SignatureStatus';
import DownloadButton from '../DownloadButton';
import '../../styles/sign/YouSignButton.css';

// Componente funcional que recibe pdfId, title y storage_path como props
const YouSignButton = ({ pdfId, title, storage_path }) => {
    // Estado para controlar el estado de carga
    const [loading, setLoading] = useState(false);
    // Estado para mostrar/ocultar el wizard
    const [showWizard, setShowWizard] = useState(false);
    // Ref para acceder al DownloadButton
    const downloadRef = useRef();    // Función que maneja el envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault(); // Previene el comportamiento por defecto del formulario
        setLoading(true); // Activa el estado de carga
        
        try {
            const formData = new FormData(e.target);
            const data = {
                pdfId,
                title,
                signerEmail: formData.get('signerEmail'),
                signerName: formData.get('signerName')
            };

            // Envía los datos a la API de electron
            const result = await window.electronAPI.sendToYouSign(data);

            // Si no hay éxito, lanza un error
            if (!result.success) {
                throw new Error(result.error || 'Error desconocido');
            }

            // Muestra notificación de éxito
            toast.success('Documento enviado para firma con YouSign');
            
            // Si hay URL de firma, abre en nueva pestaña
            if (result.signingUrl) {
                window.open(result.signingUrl, '_blank');
            }
            
            setShowWizard(false); // Oculta el wizard
        } catch (error) {
            console.error('Error:', error);
            // Muestra notificación de error
            toast.error(error.message || 'Error al enviar documento para firma');
        } finally {
            setLoading(false); // Desactiva el estado de carga
        }
    };
    
    // Función para manejar clic en el botón de firmar
    const handleSignClick = async () => {
        try {
            setLoading(true);
            console.log('Iniciando proceso de firma silenciosa para PDF:', pdfId);
            
            // Ejecutar el cacheo silencioso antes de mostrar el wizard
            if (downloadRef.current) {
                console.log('Ejecutando cacheo silencioso...');
                await downloadRef.current.handleCacheOnly();
                console.log('Cacheo silencioso completado exitosamente');
            } else {
                throw new Error('Referencia al componente de descarga no disponible');
            }
            
            // Si el cacheo es exitoso, mostrar el wizard
            setShowWizard(true);
        } catch (error) {
            console.error('Error al preparar el documento:', error);
            toast.error('Error al preparar el documento para firma: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Botón para abrir el wizard */}
            <button
                onClick={handleSignClick}
                disabled={loading}
                className="yousign-button"
                title="Firmar con YouSign"
            >
                <i className="fas fa-file-signature"></i>
                {loading ? 'Iniciando firma...' : 'Firmar con YouSign'}
            </button>

            {/* DownloadButton oculto para manejar la descarga/caché */}
            <div style={{ display: 'none' }}>
                <DownloadButton
                    ref={downloadRef}
                    pdfData={{ id: pdfId, title, storage_path }}
                />
            </div>
            
            {/* Wizard para firma con YouSign */}
            <YouSignWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                onSubmit={handleSubmit}
                title={title}
                loading={loading}
            />
            
            {/* Componente para mostrar el estado de la firma */}
            <SignatureStatus pdfId={pdfId} />
        </div>
    );
};

export default YouSignButton; // Exporta el componente