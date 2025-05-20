const axios = require('axios').default;
const FormData = require('form-data');

class YouSignService {
    constructor() {
        // Valores por defecto para producción
        const DEFAULT_URL = 'https://api-sandbox.yousign.app/v3';
        const DEFAULT_KEY = '8twTw6VOdfkNr8vULriwF7pQtCUoBobE';
        
        // Intentar obtener de variables de entorno, sino usar valores por defecto
        this.BASE_URL = process.env.VITE_YOUSIGN_API_URL || DEFAULT_URL;
        this.API_KEY = process.env.VITE_YOUSIGN_API_KEY || DEFAULT_KEY;
        
        console.log('YouSign API configurado:', this.BASE_URL);
    }

    async request(endpoint = '', options = {}, headers = {}) {
        const url = `${this.BASE_URL}/${endpoint}`;
        const config = {
            url,
            headers: {
                Authorization: `Bearer ${this.API_KEY}`,
                ...headers
            },
            ...options
        };

        try {
            console.log(`Enviando solicitud a: ${url}`);
            const res = await axios(config);
            return res.data;
        } catch (error) {
            console.error('Error en solicitud YouSign:', error.response?.data || error.message);
            if (error.response) {
                // La solicitud fue realizada y el servidor respondió con un código de estado
                console.error('Respuesta de error:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            } else if (error.request) {
                // La solicitud fue realizada pero no se recibió respuesta
                console.error('Sin respuesta del servidor:', error.request);
            } else {
                // Algo sucedió al configurar la solicitud que desencadenó un error
                console.error('Error de configuración:', error.message);
            }
            throw new Error(`Error en YouSign: ${error.message}`);
        }
    }

    async initiateSignatureRequest(title) {
        const body = {
            name: title || "Signature request",
            delivery_mode: 'email',
            timezone: 'Europe/Madrid',
        };
        const options = {
            method: 'POST',
            data: JSON.stringify(body),
        };
        const headers = {
            'Content-type': 'application/json',
        };
        
        return await this.request('signature_requests', options, headers);
    }

    async uploadDocument(signatureRequestId, pdfBuffer, title) {
        const form = new FormData();
        form.append('file', Buffer.from(pdfBuffer), {
            filename: `${title}.pdf`,
            contentType: 'application/pdf'
        });
        form.append('nature', 'signable_document');
        form.append('parse_anchors', 'true');

        const options = {
            method: 'POST',
            data: form,
        };
        const headers = form.getHeaders();
        
        return await this.request(`signature_requests/${signatureRequestId}/documents`, options, headers);
    }

    async addSigner(signatureRequestId, documentId, firstName, lastName, email) {
        const body = {
            info: {
                first_name: firstName,
                last_name: lastName,
                email: email,
                locale: 'es',
            },
            signature_level: 'electronic_signature',
            signature_authentication_mode: 'no_otp',
            fields: [
                {
                    document_id: documentId,
                    type: 'signature',
                    page: 1,
                    x: 77,
                    y: 581,
                }
            ]
        };
        
        const options = {
            method: 'POST',
            data: JSON.stringify(body),
        };
        const headers = {
            'Content-type': 'application/json',
        };
        
        return await this.request(`signature_requests/${signatureRequestId}/signers`, options, headers);
    }

    async activateSignatureRequest(signatureRequestId) {
        const options = {
            method: 'POST',
        };
        
        return await this.request(`signature_requests/${signatureRequestId}/activate`, options);
    }

    // Asegúrate de que esta función esté completamente implementada
    async createSignatureProcedure(pdfBuffer, { title, signerEmail, signerName }) {
        try {
            console.log('Iniciando proceso de firma para:', title);
            
            // 1. Iniciar solicitud de firma
            const signatureRequest = await this.initiateSignatureRequest(title);
            const signatureRequestId = signatureRequest.id;
            console.log('Solicitud de firma creada con ID:', signatureRequestId);
            
            // 2. Subir documento
            const document = await this.uploadDocument(signatureRequestId, pdfBuffer, title);
            const documentId = document.id;
            console.log('Documento subido con ID:', documentId);
            
            // 3. Añadir firmante
            const nameParts = signerName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || 'Apellido';
            
            const signer = await this.addSigner(
                signatureRequestId, 
                documentId,
                firstName,
                lastName,
                signerEmail
            );
            console.log('Firmante añadido con ID:', signer.id);
            
            // 4. Activar solicitud
            await this.activateSignatureRequest(signatureRequestId);
            console.log('Solicitud activada');
            
            return {
                success: true,
                procedureId: signatureRequestId,
                documentId: documentId,
                signerId: signer.id,
                signingUrl: signer.signature_url || signer.email_opened_url
            };
        } catch (error) {
            console.error('Error en proceso de firma:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Obtener estado de la solicitud
    async getProcedureStatus(signatureRequestId) {
        try {
            const options = {
                method: 'GET',
            };
            
            const response = await this.request(
                `signature_requests/${signatureRequestId}`, 
                options
            );
            
            return {
                success: true,
                status: response.status,
                procedure: response
            };
        } catch (error) {
            console.error('Error al obtener estado:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }
}

// Exportar instancia única
const youSignService = new YouSignService();
module.exports = { youSignService };