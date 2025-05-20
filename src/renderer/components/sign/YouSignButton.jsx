import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../../supabase/client';
import YouSignWizard from './YouSignWizard';
import SignatureStatus from '../SignatureStatus';
import '../../styles/sign/YouSignButton.css';// Asegúrate de que la ruta sea correcta

// Componente funcional que recibe pdfId y title como props
const YouSignButton = ({ pdfId, title }) => {
    // Estado para controlar el estado de carga
    const [loading, setLoading] = useState(false);
    // Estado para mostrar/ocultar el wizard
    const [showWizard, setShowWizard] = useState(false);

    // Función para asegurar que el PDF esté en caché antes de firmarlo
    const ensurePdfIsCached = async () => {
        try {
            // Primero verificar si ya está en caché
            const cached = await window.electronAPI.getFromCache(pdfId);
            if (cached) return true;

            // Si no está en caché, obtener URL y descargar
            const { data: { signedUrl }, error: urlError } = await supabase.storage
                .from('pdfs')
                .createSignedUrl(pdfId, 60);

            if (urlError) throw urlError;

            const result = await window.electronAPI.downloadAndCache({
                id: pdfId,
                url: signedUrl,
                metadata: { title }
            });

            if (!result.success) throw new Error(result.error);
            return true;
        } catch (error) {
            console.error('Error al cachear PDF:', error);
            return false;
        }
    };

    // Función que maneja el envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault(); // Previene el comportamiento por defecto del formulario
        setLoading(true); // Activa el estado de carga

        try {
            // Asegurarse de que el PDF esté en caché antes de proceder
            const isCached = await ensurePdfIsCached();
            if (!isCached) {
                throw new Error('No se pudo preparar el PDF para la firma');
            }

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
    const handleSignClick = () => {
        setShowWizard(true);
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