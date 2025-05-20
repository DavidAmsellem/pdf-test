import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase/client";
import "../../styles/sign/EmailStatusList.css";
import EmailStatusSearch from './EmailStatusSearch';

const EmailStatusList = () => {
    const [signatureEvents, setSignatureEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        loadEmails();
        
        const channel = supabase
            .channel('email-status-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'yousign_events' },
                () => loadEmails()
            )
            .subscribe();

        return () => channel.unsubscribe();
    }, []);

    const loadEmails = async () => {
        try {
            const { data, error } = await supabase
                .from('yousign_events')
                .select('*, metadata')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Agrupar por ID de procedimiento
            const grouped = data.reduce((acc, event) => {
                const procedureId = event.metadata?.data?.signature_request?.id;
                if (!procedureId) return acc;

                if (!acc[procedureId]) {
                    acc[procedureId] = {
                        events: [],
                        currentStatus: '',
                        documentName: '',
                        expiration_date: null,
                        workspace_id: '',
                        signers: []
                    };
                }

                const signatureRequest = event.metadata?.data?.signature_request;
                const signerInfo = event.metadata?.data?.signer?.info;
                
                // Actualizar información del procedimiento
                acc[procedureId].events.push(event);
                acc[procedureId].currentStatus = signatureRequest?.status || acc[procedureId].currentStatus;
                acc[procedureId].documentName = signatureRequest?.name || acc[procedureId].documentName;

                // Actualizar información del firmante si está presente
                if (signerInfo) {
                    const signer = {
                        id: event.metadata?.data?.signer?.id,
                        email: signerInfo.email,
                        firstName: signerInfo.first_name,
                        lastName: signerInfo.last_name,
                        status: event.metadata?.data?.signer?.status
                    };
                    
                    // Actualizar o añadir firmante
                    const existingSignerIndex = acc[procedureId].signers.findIndex(s => s.id === signer.id);
                    if (existingSignerIndex >= 0) {
                        acc[procedureId].signers[existingSignerIndex] = signer;
                    } else {
                        acc[procedureId].signers.push(signer);
                    }
                }

                return acc;
            }, {});

            setSignatureEvents(grouped);
        } catch (error) {
            console.error('Error cargando emails:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEventName = (eventName) => {
        const eventMap = {
            // Eventos de firma
            'signature_request.activated': 'Solicitud de firma activada | Signature request activated',
            'signature_request.completed': 'Solicitud de firma completada | Signature request completed',
            'signature_request.expired': 'Solicitud de firma expirada | Signature request expired',
            'signature_request.refused': 'Solicitud de firma rechazada | Signature request refused',
            'signature_request.done': 'Firma completada | Signature completed',
            
            // Eventos del firmante
            'signer.notified': 'Firmante notificado | Signer notified',
            'signer.signed': 'Firmante ha firmado | Signer has signed',
            'signer.link_opened': 'Enlace abierto | Link opened',
            'signer.done': 'Firmante completado | Signer completed',
            
            // Estado general
            'completed': 'Completado | Completed',
            'ongoing': 'En proceso | Ongoing',
            'expired': 'Expirado | Expired',
            'refused': 'Rechazado | Refused'
        };
        return eventMap[eventName] || eventName;
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'ongoing': { class: 'status-ongoing', text: 'En Proceso | Ongoing' },
            'done': { class: 'status-completed', text: 'Completado | Done' }, // Cambiado de 'completed' a 'done'
            'refused': { class: 'status-refused', text: 'Rechazado | Refused' },
            'expired': { class: 'status-expired', text: 'Expirado | Expired' },
            'initiated': { class: 'status-initiated', text: 'Iniciado | Initiated' }
        };
        return statusMap[status?.toLowerCase()] || { class: 'status-unknown', text: status || 'Desconocido | Unknown' };
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const downloadSignedDocument = async (procedureId) => {
        try {
            setDownloading(true);
            const response = await fetch(`${process.env.YOUSIGN_API_URL}/procedures/${procedureId}/files`, {
                headers: {
                    'Authorization': `Bearer ${process.env.YOUSIGN_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error al obtener el documento');

            const data = await response.json();
            const downloadUrl = data[0]?.download_url;

            if (downloadUrl) {
                const documentResponse = await fetch(downloadUrl);
                const blob = await documentResponse.blob();
                
                // Crear URL para descarga
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `documento_firmado_${procedureId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Error descargando documento:', error);
            toast.error('Error al descargar el documento firmado');
        } finally {
            setDownloading(false);
        }
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        filterEvents(term, statusFilter);
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        filterEvents(searchTerm, status);
    };

    const filterEvents = (term, status) => {
        let filtered = Object.entries(signatureEvents);

        if (term) {
            const searchLower = term.toLowerCase();
            filtered = filtered.filter(([_, procedure]) => 
                procedure.documentName.toLowerCase().includes(searchLower) ||
                procedure.signers.some(signer => 
                    signer.email?.toLowerCase().includes(searchLower) ||
                    `${signer.firstName} ${signer.lastName}`.toLowerCase().includes(searchLower)
                )
            );
        }

        if (status !== 'all') {
            filtered = filtered.filter(([_, procedure]) => {
                // Manejar específicamente el caso de 'completed' en el filtro
                if (status === 'completed') {
                    return procedure.currentStatus.toLowerCase() === 'done';
                }
                return procedure.currentStatus.toLowerCase() === status.toLowerCase();
            });
        }

        const filteredObject = Object.fromEntries(filtered);
        setFilteredEvents(filteredObject);
    };

    useEffect(() => {
        filterEvents(searchTerm, statusFilter);
    }, [signatureEvents]);

    if (loading) {
        return (
            <div className="loading-container">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Cargando estados de firmas...</span>
            </div>
        );
    }

    return (
        <div className="email-status-list">
            <EmailStatusSearch 
                onSearch={handleSearch}
                onFilterStatus={handleStatusFilter}
            />
            
            {Object.keys(filteredEvents).length === 0 ? (
                <div className="no-data">
                    {searchTerm || statusFilter !== 'all' ? 
                        'No se encontraron resultados' : 
                        'No hay eventos de firma'}
                </div>
            ) : (
                Object.entries(filteredEvents).map(([procedureId, procedure]) => (
                    <div key={procedureId} className="email-card">
                        <div className="email-header">
                            <div className="document-info">
                                <h4>{procedure.documentName}</h4>
                                <span className={`status-badge ${getStatusBadge(procedure.currentStatus).class}`}>
                                    {getStatusBadge(procedure.currentStatus).text}
                                </span>
                            </div>
                            <div className="document-actions">
                                {procedure.currentStatus === 'completed' && (
                                    <button 
                                        className="download-button"
                                        onClick={() => downloadSignedDocument(procedureId)}
                                        disabled={downloading}
                                    >
                                        <i className="fas fa-download"></i>
                                        {downloading ? 'Descargando...' : 'Descargar PDF'}
                                    </button>
                                )}
                                <span className="email-date">
                                    {formatDate(procedure.events[procedure.events.length - 1]?.created_at)}
                                </span>
                            </div>
                        </div>
                        <div className="email-details">
                            <div className="signers-list">
                                <h5>Firmantes:</h5>
                                {procedure.signers.map(signer => (
                                    <p key={signer.id} className="signer-info">
                                        <i className="fas fa-user"></i>
                                        <div className="signer-details">
                                            <span className="signer-name">
                                                {signer.firstName} {signer.lastName}
                                            </span>
                                            <span className="signer-email">{signer.email || 'Sin correo'}</span>
                                            <span className="signer-status">Estado: {signer.status}</span>
                                        </div>
                                    </p>
                                ))}
                            </div>
                            <div className="events-timeline">
                                <h5>Historial:</h5>
                                {procedure.events.map(event => (
                                    <p key={event.id} className="event-info">
                                        <i className="fas fa-clock"></i>
                                        <span>{formatDate(event.created_at)}: {getEventName(event.metadata.event_name)}</span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default EmailStatusList;