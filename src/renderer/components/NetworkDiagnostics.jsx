import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { toast } from 'react-toastify';
import '../styles/components/NetworkDiagnostics.css';
import '../styles/components/RealTimeLog.css';
import '../styles/components/SecurityTest.css';

const NetworkDiagnostics = () => {
    const [testResults, setTestResults] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [detailedReport, setDetailedReport] = useState(false);
    const [stability, setStability] = useState(null);    const [stressTest, setStressTest] = useState({
        running: false,
        progress: 0,
        results: null
    });
    const [securityTest, setSecurityTest] = useState({
        running: false,
        progress: 0,
        results: null
    });
    const [realTimeLogs, setRealTimeLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const logEndRef = useRef(null);
    const downloadRef = useRef(null);
    const abortControllerRef = useRef(null);
    
    // Efecto para hacer scroll automático cuando se agregan nuevos logs
    useEffect(() => {
        if (autoScroll && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [realTimeLogs, autoScroll]);
      // Función para ejecutar pruebas avanzadas de red
    const runDiagnostics = async () => {
        setIsRunning(true);
        setTestResults(null);
        setStability(null);
        // Limpiar los logs previos para esta prueba
        setRealTimeLogs([`[${new Date().toLocaleTimeString()}] Iniciando diagnóstico de red...`]);
        
        const results = {
            timestamp: new Date().toISOString(),
            supabase: { success: false, latency: null, error: null },
            internet: { success: false, latency: null, error: null },
            cache: { success: false, latency: null, error: null },
            dns: { success: false, latency: null, error: null },
            youSign: { success: false, latency: null, error: null }
        };

        try {
            // Test Supabase - Realizamos 3 pruebas para evaluar estabilidad
            const supabaseTimes = [];
            let supabaseSuccess = true;
            
            for (let i = 0; i < 3; i++) {
                const start = Date.now();
                try {
                    const { error } = await supabase.from('pdfs').select('count');
                    if (error) throw error;
                    supabaseTimes.push(Date.now() - start);
                } catch (error) {
                    supabaseSuccess = false;
                    results.supabase.error = error.message;
                    break;
                }
                // Pequeña pausa entre pruebas
                await new Promise(r => setTimeout(r, 200));
            }
            
            if (supabaseSuccess) {
                results.supabase.success = true;
                results.supabase.latency = Math.round(
                    supabaseTimes.reduce((a, b) => a + b, 0) / supabaseTimes.length
                );
                results.supabase.variance = calculateVariance(supabaseTimes);
            }

            // Test Internet (Google + CloudFlare)
            const internetStart = Date.now();
            try {
                // Probamos múltiples servicios para mejor diagnóstico
                const [googleResp, cloudflareResp] = await Promise.allSettled([
                    fetch('https://www.google.com'),
                    fetch('https://1.1.1.1')
                ]);
                
                const googleOk = googleResp.status === 'fulfilled' && googleResp.value.ok;
                const cloudflareOk = cloudflareResp.status === 'fulfilled' && cloudflareResp.value.ok;
                
                results.internet = {
                    success: googleOk || cloudflareOk,
                    latency: Date.now() - internetStart,
                    details: {
                        google: googleOk,
                        cloudflare: cloudflareOk
                    }
                };
            } catch (error) {
                results.internet = {
                    success: false,
                    latency: null,
                    error: error.message
                };
            }

            // Test DNS
            const dnsStart = Date.now();
            try {
                // Simulamos una consulta DNS con fetch
                await fetch('https://dns.google/resolve?name=supabase.co&type=A');
                results.dns = {
                    success: true,
                    latency: Date.now() - dnsStart
                };
            } catch (error) {
                results.dns = {
                    success: false,
                    latency: null,
                    error: error.message
                };
            }

            // Test YouSign API
            const youSignStart = Date.now();
            try {
                const apiUrl = await window.electronAPI.getYouSignApiUrl();
                if (apiUrl) {
                    await fetch(`${apiUrl.replace('/v3', '')}/healthz`);
                    results.youSign = {
                        success: true,
                        latency: Date.now() - youSignStart
                    };
                } else {
                    throw new Error('URL de YouSign no configurada');
                }
            } catch (error) {
                results.youSign = {
                    success: false,
                    latency: null,
                    error: error.message
                };
            }

            // Test Cache Speed
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
            
            // Calcular puntuación de estabilidad global
            const stabilityScore = calculateStabilityScore(results);
            setStability(stabilityScore);

            setTestResults(results);
            toast.success('Diagnóstico de red completado');
        } catch (error) {
            toast.error('Error al ejecutar el diagnóstico de red');
            console.error('Error en diagnóstico de red:', error);
        } finally {
            setIsRunning(false);
        }
    };
    
    // Función para calcular varianza en latencias (indicador de estabilidad)
    const calculateVariance = (times) => {
        if (!times || times.length <= 1) return 0;
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const squareDiffs = times.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / times.length);
    };
      // Calcula la puntuación de estabilidad de 0-100
    const calculateStabilityScore = (results) => {
        let score = 0;
        let totalTests = 0;
        
        // Supabase (0-30 puntos)
        if (results.supabase.success) {
            totalTests++;
            // Latencia < 200ms = excelente
            score += 30 * Math.min(1, Math.max(0, (1000 - results.supabase.latency) / 800));
        }
        
        // Internet (0-25 puntos)
        if (results.internet.success) {
            totalTests++;
            score += 25 * Math.min(1, Math.max(0, (500 - results.internet.latency) / 400));
        }
        
        // DNS (0-15 puntos)
        if (results.dns.success) {
            totalTests++; 
            score += 15 * Math.min(1, Math.max(0, (300 - results.dns.latency) / 250));
        }
        
        // YouSign (0-15 puntos)
        if (results.youSign.success) {
            totalTests++;
            score += 15 * Math.min(1, Math.max(0, (500 - results.youSign.latency) / 400));
        }
        
        // Caché (0-15 puntos)
        if (results.cache.success) {
            totalTests++;
            score += 15 * Math.min(1, Math.max(0, (100 - results.cache.latency) / 80));
        }
        
        // Si no se ejecutaron pruebas, devolver null
        if (totalTests === 0) return null;
        
        // Normalizar en base a pruebas ejecutadas
        return Math.round(score * 100 / (totalTests * 20));
    };
    
    // Función para ejecutar la prueba de saturación de red
    const runNetworkStressTest = async () => {
        // Configurar estado inicial
        setStressTest({
            running: true,
            progress: 0,
            results: null
        });
        
        // Crear un AbortController para poder cancelar las peticiones
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        try {
            toast.info('Iniciando prueba de saturación de red. Esto puede tardar hasta 30 segundos.');
            
            // Resultados de la prueba
            const stressResults = {
                timestamp: new Date().toISOString(),
                parallelRequests: [],      // Resultados de pruebas de peticiones en paralelo
                burstRequests: [],         // Resultados de pruebas de peticiones en ráfaga
                largeDownloads: [],        // Resultados de descarga de archivos grandes
                completionRate: 0,         // % de operaciones completadas con éxito
                averageLatency: 0,         // Latencia media durante saturación
                maxConcurrentSuccess: 0    // Máximo de peticiones concurrentes exitosas
            };
            
            // Añadir log inicial
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Iniciando prueba de saturación de red...`]);
            
            // 1. Prueba de peticiones en paralelo (5, 10, 20 peticiones simultáneas)
            for (let numRequests of [5, 10, 20]) {
                if (signal.aborted) break;
                
                setStressTest(prev => ({...prev, progress: prev.progress + 10}));
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Iniciando prueba de peticiones paralelas: ${numRequests} peticiones simultáneas`]);
                
                const startTime = Date.now();
                const requestPromises = [];
                
                // Crear N peticiones simultáneas
                for (let i = 0; i < numRequests; i++) {
                    requestPromises.push(
                        fetch('https://httpbin.org/get?id=' + i, {signal})
                        .then(res => res.ok)
                        .catch(() => false)
                    );
                }
                
                // Esperar a que todas se completen
                const results = await Promise.allSettled(requestPromises);
                const endTime = Date.now();
                
                // Calcular estadísticas
                const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
                
                const totalTime = endTime - startTime;
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Completadas ${successCount}/${numRequests} peticiones en ${totalTime}ms. Tasa de éxito: ${Math.round((successCount / numRequests) * 100)}%`]);
                
                stressResults.parallelRequests.push({
                    concurrent: numRequests,
                    successRate: (successCount / numRequests) * 100,
                    totalTime: endTime - startTime,
                    averageTime: (endTime - startTime) / numRequests
                });
                
                if (successCount === numRequests && numRequests > stressResults.maxConcurrentSuccess) {
                    stressResults.maxConcurrentSuccess = numRequests;
                }
            }
            
            // 2. Prueba de ráfagas de peticiones (50 peticiones rápidas secuenciales)
            if (!signal.aborted) {
                setStressTest(prev => ({...prev, progress: prev.progress + 10}));
                
                const burstSize = 50;
                const startTime = Date.now();
                let successCount = 0;
                const latencies = [];
                
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Iniciando prueba de ráfagas con ${burstSize} peticiones secuenciales`]);
                
                for (let i = 0; i < burstSize; i++) {
                    if (signal.aborted) break;
                    
                    const reqStart = Date.now();
                    try {
                        const res = await fetch('https://httpbin.org/get?burst=' + i, {signal, timeout: 3000});
                        const reqEnd = Date.now();
                        
                        if (res.ok) {
                            successCount++;
                            latencies.push(reqEnd - reqStart);
                            
                            // Log cada 10 peticiones para no saturar la interfaz
                            if (i % 10 === 0 || i === burstSize - 1) {
                                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Completadas ${i+1}/${burstSize} peticiones en ráfaga (${successCount} exitosas)`]);
                            }
                        }
                        
                        // Actualizar progreso dinámico
                        setStressTest(prev => ({
                            ...prev, 
                            progress: Math.min(80, 30 + Math.floor((i / burstSize) * 50))
                        }));
                        
                    } catch (e) {
                        // Ignorar errores individuales en la prueba de saturación
                    }
                }
                
                const endTime = Date.now();
                
                stressResults.burstRequests.push({
                    burstSize,
                    successRate: (successCount / burstSize) * 100,
                    totalTime: endTime - startTime,
                    averageLatency: latencies.length > 0 ? 
                        latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
                });
            }
            
            // 3. Prueba de descarga de archivos grandes (1MB, 5MB)
            if (!signal.aborted) {
                setStressTest(prev => ({...prev, progress: 85}));
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Iniciando pruebas de descarga de archivos grandes`]);
                
                for (let size of [1, 5]) {
                    if (signal.aborted) break;
                    
                    setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Descargando archivo de ${size}MB...`]);
                    const startTime = Date.now();
                    try {
                        const res = await fetch(`https://httpbin.org/bytes/${size * 1024 * 1024}`, {signal});
                        if (res.ok) {
                            await res.arrayBuffer(); // Asegurar que descargamos todo el contenido
                            const endTime = Date.now();
                            const downloadTime = endTime - startTime;
                            const speed = (size * 1024 * 1024) / (downloadTime / 1000); // bytes por segundo
                            
                            stressResults.largeDownloads.push({
                                size: `${size}MB`,
                                success: true,
                                downloadTime,
                                speed
                            });
                            
                            const speedMbps = (speed / (1024 * 1024)).toFixed(2);
                            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Descarga de ${size}MB completada en ${downloadTime}ms (${speedMbps} MB/s)`]);
                        }
                    } catch (e) {
                        stressResults.largeDownloads.push({
                            size: `${size}MB`,
                            success: false,
                            error: e.message
                        });
                        
                        setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Error en descarga de ${size}MB: ${e.message}`]);
                    }
                }
            }
            
            // Calcular estadísticas globales
            const successCounts = [
                ...stressResults.parallelRequests.map(r => r.successRate),
                ...stressResults.burstRequests.map(r => r.successRate)
            ];
            
            stressResults.completionRate = successCounts.length > 0 ? 
                successCounts.reduce((a, b) => a + b, 0) / successCounts.length : 0;
                
            const allLatencies = [
                ...stressResults.parallelRequests.flatMap(r => [r.averageTime]),
                ...stressResults.burstRequests.flatMap(r => [r.averageLatency])
            ].filter(l => l > 0);
            
            stressResults.averageLatency = allLatencies.length > 0 ? 
                allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length : 0;
                  // Agregar log final con resumen
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Prueba de saturación completada`]);
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Tasa de completado: ${stressResults.completionRate.toFixed(2)}%`]);
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Latencia media: ${stressResults.averageLatency.toFixed(2)}ms`]);
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Máximo de peticiones concurrentes exitosas: ${stressResults.maxConcurrentSuccess}`]);
            
            // Actualizar estado con resultados
            setStressTest({
                running: false,
                progress: 100,
                results: stressResults
            });
            
            toast.success('Prueba de saturación completada');
            
        } catch (error) {
            console.error('Error en prueba de saturación:', error);
            
            // Solo mostrar error si no fue una cancelación manual
            if (!signal.aborted) {
                toast.error('Error al ejecutar la prueba de saturación: ' + error.message);
                
                setStressTest({
                    running: false,
                    progress: 0,
                    results: null,
                    error: error.message
                });
            }
        }    };
    
    // Función para cancelar la prueba de saturación
    const cancelStressTest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            toast.info('Prueba de saturación cancelada');
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Prueba de saturación cancelada por el usuario`]);
            setStressTest({
                running: false,
                progress: 0,
                results: null
            });
        }
    };
      // Función para ejecutar pruebas de seguridad de red
    const runSecurityTest = async () => {
        // Configurar estado inicial
        setSecurityTest({
            running: true,
            progress: 0,
            results: null
        });
        
        // Limpiar logs previos y mostrar mensaje inicial
        setRealTimeLogs([`[${new Date().toLocaleTimeString()}] Iniciando prueba de seguridad de red...`]);
        
        // Crear un AbortController para poder cancelar las peticiones
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        try {
            toast.info('Iniciando prueba de seguridad de red. Esto puede tardar hasta 20 segundos.');
            
            // Resultados de la prueba de seguridad
            const securityResults = {
                timestamp: new Date().toISOString(),
                tlsTests: [],        // Resultados de pruebas de TLS/SSL
                certificateTests: [], // Resultados de verificación de certificados
                httpSecurityTests: [], // Resultados de pruebas de seguridad HTTP
                securityScore: 0      // Puntuación global de seguridad (0-100)
            };
            
            // 1. Pruebas de TLS/SSL
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Verificando configuración TLS/SSL...`]);
            setSecurityTest(prev => ({...prev, progress: 10}));
            
            const endpoints = [
                { url: 'https://www.howsmyssl.com/a/check', name: 'Verificación TLS' },
                { url: 'https://api.ssllabs.com/api/v3/info', name: 'SSL Labs API' },
                { url: 'https://badssl.com/', name: 'Referencia de certificados' }
            ];
            
            for (const endpoint of endpoints) {
                if (signal.aborted) break;
                
                try {
                    const startTime = Date.now();
                    const response = await fetch(endpoint.url, { 
                        signal, 
                        method: 'GET',
                        headers: { 'User-Agent': 'Mozilla/5.0 PDF4All Security Test' }
                    });
                    
                    // Analizar respuesta para TLS
                    let tlsVersion = 'Desconocida';
                    let securityLevel = 'Medio';
                    
                    if (endpoint.url.includes('howsmyssl') && response.ok) {
                        const data = await response.json();
                        tlsVersion = data.tls_version || 'Desconocida';
                        
                        // Evaluar seguridad según versión TLS
                        if (tlsVersion.includes('1.3')) {
                            securityLevel = 'Alto';
                        } else if (tlsVersion.includes('1.2')) {
                            securityLevel = 'Medio';
                        } else {
                            securityLevel = 'Bajo';
                        }
                        
                        securityResults.tlsTests.push({
                            endpoint: endpoint.name,
                            success: true,
                            tlsVersion,
                            securityLevel,
                            responseTime: Date.now() - startTime
                        });
                        
                        setRealTimeLogs(logs => [...logs, 
                            `[${new Date().toLocaleTimeString()}] Versión TLS detectada: ${tlsVersion} (Nivel de seguridad: ${securityLevel})`
                        ]);
                    } else {
                        securityResults.tlsTests.push({
                            endpoint: endpoint.name,
                            success: response.ok,
                            statusCode: response.status,
                            responseTime: Date.now() - startTime
                        });
                    }
                } catch (error) {
                    securityResults.tlsTests.push({
                        endpoint: endpoint.name,
                        success: false,
                        error: error.message
                    });
                    
                    setRealTimeLogs(logs => [...logs, 
                        `[${new Date().toLocaleTimeString()}] Error al verificar ${endpoint.name}: ${error.message}`
                    ]);
                }
                
                // Actualizar progreso
                setSecurityTest(prev => ({...prev, progress: Math.min(30, prev.progress + 7)}));
            }
            
            // 2. Prueba de verificación de certificados
            if (!signal.aborted) {
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Verificando certificados de seguridad...`]);
                setSecurityTest(prev => ({...prev, progress: 35}));
                
                const certificateTestUrls = [
                    { url: 'https://valid-isrgrootx1.letsencrypt.org/', name: 'Certificado válido (Let\'s Encrypt)' },
                    { url: 'https://revoked.badssl.com/', name: 'Certificado revocado' },
                    { url: 'https://self-signed.badssl.com/', name: 'Certificado auto-firmado' }
                ];
                
                for (const certTest of certificateTestUrls) {
                    if (signal.aborted) break;
                    
                    try {
                        const startTime = Date.now();
                        // Solo verificamos si el dominio responde, no hacemos fetch completo
                        await fetch(certTest.url, { 
                            signal, 
                            method: 'HEAD',
                            mode: 'no-cors' // Intentar conexión sin importar errores CORS
                        });
                        
                        // Si llegamos aquí con self-signed o revoked, es porque el cliente no validó correctamente
                        const isCertificateSuspicious = certTest.url.includes('badssl.com') && 
                                                      !certTest.url.includes('valid');
                        
                        securityResults.certificateTests.push({
                            url: certTest.name,
                            validationSucceeded: true,
                            suspicious: isCertificateSuspicious,
                            responseTime: Date.now() - startTime
                        });
                        
                        if (isCertificateSuspicious) {
                            setRealTimeLogs(logs => [...logs, 
                                `[${new Date().toLocaleTimeString()}] ⚠️ Advertencia: El cliente aceptó un certificado no confiable (${certTest.name})`
                            ]);
                        } else {
                            setRealTimeLogs(logs => [...logs, 
                                `[${new Date().toLocaleTimeString()}] Verificación de certificado correcta: ${certTest.name}`
                            ]);
                        }
                    } catch (error) {
                        // En caso de error con certificados no válidos, es el comportamiento esperado
                        const isExpectedFailure = certTest.url.includes('badssl.com') && 
                                                !certTest.url.includes('valid');
                        
                        securityResults.certificateTests.push({
                            url: certTest.name,
                            validationSucceeded: false,
                            expectedFailure: isExpectedFailure,
                            error: error.message
                        });
                        
                        if (isExpectedFailure) {
                            setRealTimeLogs(logs => [...logs, 
                                `[${new Date().toLocaleTimeString()}] ✅ Correcto: Se rechazó certificado no válido (${certTest.name})`
                            ]);
                        } else {
                            setRealTimeLogs(logs => [...logs, 
                                `[${new Date().toLocaleTimeString()}] Error al verificar certificado: ${certTest.name} - ${error.message}`
                            ]);
                        }
                    }
                    
                    // Actualizar progreso
                    setSecurityTest(prev => ({...prev, progress: Math.min(60, prev.progress + 8)}));
                }
            }
            
            // 3. Pruebas de seguridad HTTP
            if (!signal.aborted) {
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Analizando seguridad HTTP...`]);
                setSecurityTest(prev => ({...prev, progress: 65}));
                
                // Verificar cabeceras de seguridad en varios sitios
                const httpSecurityTestUrls = [
                    'https://www.mozilla.org',
                    'https://www.google.com',
                    'https://www.github.com'
                ];
                
                for (const testUrl of httpSecurityTestUrls) {
                    if (signal.aborted) break;
                    
                    try {
                        const response = await fetch(testUrl, { 
                            signal, 
                            method: 'HEAD' // Solo solicitar cabeceras
                        });
                        
                        // Obtener y verificar cabeceras de seguridad
                        const headers = response.headers;
                        const securityHeaders = {
                            'Strict-Transport-Security': headers.get('Strict-Transport-Security'),
                            'Content-Security-Policy': headers.get('Content-Security-Policy'),
                            'X-Content-Type-Options': headers.get('X-Content-Type-Options'),
                            'X-Frame-Options': headers.get('X-Frame-Options'),
                            'Referrer-Policy': headers.get('Referrer-Policy')
                        };
                        
                        // Contar cabeceras de seguridad presentes
                        const presentHeadersCount = Object.values(securityHeaders)
                                                   .filter(header => header !== null && header !== undefined).length;
                        
                        // Calcular puntuación de seguridad para este sitio
                        const siteSecurityScore = Math.round((presentHeadersCount / 5) * 100);
                        
                        securityResults.httpSecurityTests.push({
                            url: testUrl,
                            responseStatus: response.status,
                            securityHeaders,
                            securityScore: siteSecurityScore
                        });
                        
                        setRealTimeLogs(logs => [...logs, 
                            `[${new Date().toLocaleTimeString()}] Seguridad HTTP de ${testUrl}: ${siteSecurityScore}% (${presentHeadersCount}/5 cabeceras)`
                        ]);
                    } catch (error) {
                        securityResults.httpSecurityTests.push({
                            url: testUrl,
                            error: error.message
                        });
                        
                        setRealTimeLogs(logs => [...logs, 
                            `[${new Date().toLocaleTimeString()}] Error al analizar cabeceras HTTP de ${testUrl}: ${error.message}`
                        ]);
                    }
                    
                    // Actualizar progreso
                    setSecurityTest(prev => ({...prev, progress: Math.min(90, prev.progress + 8)}));
                }
            }
            
            // Calcular puntuación global de seguridad
            if (!signal.aborted) {
                // Puntuación TLS (30% del total)
                const tlsScore = securityResults.tlsTests.length > 0 ? 
                    securityResults.tlsTests.reduce((score, test) => {
                        if (!test.success) return score;
                        
                        // Puntuación según nivel de seguridad
                        if (test.securityLevel === 'Alto') return score + 100;
                        if (test.securityLevel === 'Medio') return score + 70;
                        if (test.securityLevel === 'Bajo') return score + 30;
                        return score + 50; // Valor por defecto
                    }, 0) / securityResults.tlsTests.length : 0;
                
                // Puntuación certificados (40% del total)
                const certScore = securityResults.certificateTests.length > 0 ?
                    securityResults.certificateTests.reduce((score, test) => {
                        // Si es un certificado inválido y lo rechazamos correctamente, es bueno
                        if (test.expectedFailure && !test.validationSucceeded) return score + 100;
                        // Si es un certificado válido y lo aceptamos, es bueno
                        if (!test.expectedFailure && test.validationSucceeded) return score + 100;
                        // En otros casos, es malo
                        return score;
                    }, 0) / securityResults.certificateTests.length : 0;
                
                // Puntuación HTTP Security (30% del total)
                const httpScore = securityResults.httpSecurityTests.length > 0 ?
                    securityResults.httpSecurityTests.reduce((score, test) => {
                        return score + (test.securityScore || 0);
                    }, 0) / securityResults.httpSecurityTests.length : 0;
                
                // Puntuación final ponderada
                securityResults.securityScore = Math.round((tlsScore * 0.3) + (certScore * 0.4) + (httpScore * 0.3));
                
                // Mostrar resumen de resultados
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Prueba de seguridad completada`]);
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Puntuación TLS: ${Math.round(tlsScore)}%`]);
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Puntuación Certificados: ${Math.round(certScore)}%`]);
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Puntuación Seguridad HTTP: ${Math.round(httpScore)}%`]);
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Puntuación global de seguridad: ${securityResults.securityScore}%`]);
                
                // Actualizar estado con resultados
                setSecurityTest({
                    running: false,
                    progress: 100,
                    results: securityResults
                });
                
                toast.success('Prueba de seguridad completada');
            }
            
        } catch (error) {
            console.error('Error en prueba de seguridad:', error);
            
            // Solo mostrar error si no fue una cancelación manual
            if (!signal.aborted) {
                toast.error('Error al ejecutar la prueba de seguridad: ' + error.message);
                setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Error: ${error.message}`]);
                
                setSecurityTest({
                    running: false,
                    progress: 0,
                    results: null,
                    error: error.message
                });
            }
        }
    };
    
    // Función para cancelar la prueba de seguridad
    const cancelSecurityTest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            toast.info('Prueba de seguridad cancelada');
            setRealTimeLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Prueba de seguridad cancelada por el usuario`]);
            setSecurityTest({
                running: false,
                progress: 0,
                results: null
            });
        }
    };
    
    // Función para limpiar los logs
    const clearLogs = () => {
        setRealTimeLogs([]);
    };
    
    // Limpiar el controlador de aborto al desmontar el componente
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    
    // Función para exportar resultados como JSON
    const exportResults = () => {
        if (!testResults) return;
        
        const dataStr = JSON.stringify(testResults, null, 2);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        
        if (downloadRef.current) {
            downloadRef.current.setAttribute('href', dataUri);
            downloadRef.current.setAttribute('download', `network-diagnostics-${new Date().toISOString().substring(0,19).replace(/:/g, '-')}.json`);
            downloadRef.current.click();
        }
    };

    const getStabilityClass = (score) => {
        if (score === null) return '';
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'poor';
    };    return (
        <div className="network-diagnostics-container">            <div className="diagnostics-header">
                <button 
                    onClick={runDiagnostics}
                    disabled={isRunning || stressTest.running || securityTest.running}
                    className="diagnostics-button"
                >
                    {isRunning ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Ejecutando diagnóstico...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-network-wired"></i>
                            Diagnóstico completo de red
                        </>
                    )}
                </button>
                
                <button 
                    onClick={securityTest.running ? cancelSecurityTest : runSecurityTest}
                    disabled={isRunning || stressTest.running}
                    className={`security-test-button ${securityTest.running ? 'cancelling' : ''}`}
                >
                    {securityTest.running ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            {securityTest.progress > 0 ? `Analizando seguridad (${securityTest.progress}%)` : 'Analizando seguridad...'}
                        </>
                    ) : (
                        <>
                            <i className="fas fa-shield-alt"></i>
                            Prueba de seguridad
                        </>
                    )}
                </button>
                
                <button 
                    onClick={stressTest.running ? cancelStressTest : runNetworkStressTest}
                    disabled={isRunning || securityTest.running}
                    className={`stress-test-button ${stressTest.running ? 'cancelling' : ''}`}
                >
                    {stressTest.running ? (
                        <>
                            <i className="fas fa-times-circle"></i>
                            Cancelar prueba
                        </>
                    ) : (
                        <>
                            <i className="fas fa-server"></i>
                            Prueba de saturación
                        </>
                    )}
                </button>
                
                {(testResults || stressTest.results) && (
                    <button 
                        onClick={exportResults} 
                        className="export-button"
                    >
                        <i className="fas fa-download"></i>
                        Exportar resultados
                    </button>
                )}
                <a ref={downloadRef} style={{ display: 'none' }} />
            </div>
            
            {stressTest.running && (
                <div className="stress-test-progress">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{width: `${stressTest.progress}%`}}
                        ></div>
                    </div>
                    <div className="progress-label">
                        Ejecutando prueba de saturación: {stressTest.progress}%
                    </div>
                </div>
            )}

            {stability !== null && (
                <div className={`stability-score ${getStabilityClass(stability)}`}>
                    <div className="score-circle">
                        <span className="score-number">{stability}</span>
                    </div>
                    <div className="score-label">
                        <span>Estabilidad de la conexión</span>
                        <span className="score-description">
                            {stability >= 80 ? '¡Excelente! La conexión es muy estable.' :
                             stability >= 60 ? 'Buena conexión para la mayoría de operaciones.' :
                             stability >= 40 ? 'Conexión aceptable pero puede haber interrupciones.' :
                             'Conexión débil. Se recomienda mejorar la red.'}
                        </span>
                    </div>
                </div>
            )}

            {testResults && (
                <>
                    <div className="test-results-header">
                        <h4>Resultados del diagnóstico</h4>
                        <button 
                            className="toggle-details-button"
                            onClick={() => setDetailedReport(!detailedReport)}
                        >
                            {detailedReport ? 'Ver resumen' : 'Ver detalles'}
                        </button>
                    </div>
                    
                    <div className="diagnostics-results">
                        <div className="result-item">
                            <span className="result-label">
                                <i className="fas fa-database"></i>
                                Conexión Supabase:
                            </span>
                            <div className="result-value">
                                <span className={`status-dot ${testResults.supabase.success ? 'success' : 'error'}`}></span>
                                {testResults.supabase.latency ? `${testResults.supabase.latency}ms` : 'Error'}
                                {detailedReport && testResults.supabase.variance && (
                                    <span className="detail-text">
                                        (Varianza: {testResults.supabase.variance.toFixed(2)}ms)
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="result-item">
                            <span className="result-label">
                                <i className="fas fa-globe"></i>
                                Conexión a Internet:
                            </span>
                            <div className="result-value">
                                <span className={`status-dot ${testResults.internet.success ? 'success' : 'error'}`}></span>
                                {testResults.internet.latency ? `${testResults.internet.latency}ms` : 'Error'}
                                {detailedReport && testResults.internet.details && (
                                    <div className="detail-text">
                                        Google: <span className={`detail-status ${testResults.internet.details.google ? 'good' : 'bad'}`}>
                                            {testResults.internet.details.google ? '✓' : '✗'}
                                        </span>
                                        CloudFlare: <span className={`detail-status ${testResults.internet.details.cloudflare ? 'good' : 'bad'}`}>
                                            {testResults.internet.details.cloudflare ? '✓' : '✗'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="result-item">
                            <span className="result-label">
                                <i className="fas fa-server"></i>
                                Resolución DNS:
                            </span>
                            <div className="result-value">
                                <span className={`status-dot ${testResults.dns.success ? 'success' : 'error'}`}></span>
                                {testResults.dns.latency ? `${testResults.dns.latency}ms` : 'Error'}
                            </div>
                        </div>
                        
                        <div className="result-item">
                            <span className="result-label">
                                <i className="fas fa-signature"></i>
                                API YouSign:
                            </span>
                            <div className="result-value">
                                <span className={`status-dot ${testResults.youSign.success ? 'success' : 'error'}`}></span>
                                {testResults.youSign.latency ? `${testResults.youSign.latency}ms` : 'Error'}
                            </div>
                        </div>

                        <div className="result-item">
                            <span className="result-label">
                                <i className="fas fa-hdd"></i>
                                Acceso a Caché:
                            </span>
                            <div className="result-value">
                                <span className={`status-dot ${testResults.cache.success ? 'success' : 'error'}`}></span>
                                {testResults.cache.latency ? `${testResults.cache.latency}ms` : 'Error'}
                            </div>
                        </div>
                    </div>
                    
                    {detailedReport && (
                        <div className="diagnostics-recommendations">
                            <h4>Recomendaciones</h4>
                            <ul>
                                {!testResults.supabase.success && (
                                    <li>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        La conexión a Supabase falló. Comprueba tu conexión a Internet o el estado del servicio.
                                    </li>
                                )}
                                {testResults.supabase.success && testResults.supabase.latency > 500 && (
                                    <li>
                                        <i className="fas fa-info-circle"></i>
                                        La latencia con Supabase es elevada, esto podría afectar la velocidad de la aplicación.
                                    </li>
                                )}
                                {!testResults.internet.success && (
                                    <li>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        No hay conexión a Internet. Comprueba tu red Wi-Fi o cable Ethernet.
                                    </li>
                                )}
                                {!testResults.dns.success && testResults.internet.success && (
                                    <li>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        Hay problemas con la resolución DNS. Considera cambiar los servidores DNS.
                                    </li>
                                )}
                                {!testResults.youSign.success && testResults.internet.success && (
                                    <li>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        No se puede acceder a YouSign. Las funciones de firma pueden no estar disponibles.
                                    </li>
                                )}
                                {!testResults.cache.success && (
                                    <li>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        Hay problemas con el acceso al caché local. La aplicación podría funcionar más lenta.
                                    </li>
                                )}
                            </ul>
                        </div>                    )}
                </>
            )}

            {stressTest.results && (
                <div className="stress-test-results">
                    <div className="test-results-header">
                        <h4>Resultados de la prueba de saturación</h4>
                    </div>
                    
                    <div className="stress-metrics">
                        <div className="stress-metric-card">
                            <div className="stress-metric-title">Tasa de éxito</div>
                            <div className="stress-metric-value">
                                <span className={`${stressTest.results.completionRate > 80 ? 'success' : 
                                                  stressTest.results.completionRate > 50 ? 'warning' : 'error'}`}>
                                    {Math.round(stressTest.results.completionRate)}%
                                </span>
                            </div>
                        </div>
                        
                        <div className="stress-metric-card">
                            <div className="stress-metric-title">Latencia media</div>
                            <div className="stress-metric-value">
                                <span className={`${stressTest.results.averageLatency < 200 ? 'success' : 
                                                  stressTest.results.averageLatency < 500 ? 'warning' : 'error'}`}>
                                    {Math.round(stressTest.results.averageLatency)}ms
                                </span>
                            </div>
                        </div>
                        
                        <div className="stress-metric-card">
                            <div className="stress-metric-title">Peticiones concurrentes máximas</div>
                            <div className="stress-metric-value">
                                <span className={`${stressTest.results.maxConcurrentSuccess >= 20 ? 'success' : 
                                                  stressTest.results.maxConcurrentSuccess >= 10 ? 'warning' : 'error'}`}>
                                    {stressTest.results.maxConcurrentSuccess}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="stress-test-details">
                        <h5>Prueba de peticiones paralelas</h5>
                        <div className="stress-test-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Peticiones concurrentes</th>
                                        <th>Tasa de éxito</th>
                                        <th>Tiempo total</th>
                                        <th>Tiempo promedio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stressTest.results.parallelRequests.map((result, idx) => (
                                        <tr key={idx}>
                                            <td>{result.concurrent}</td>
                                            <td className={result.successRate > 80 ? 'success-text' : 
                                                      result.successRate > 50 ? 'warning-text' : 'error-text'}>
                                                {Math.round(result.successRate)}%
                                            </td>
                                            <td>{result.totalTime}ms</td>
                                            <td>{Math.round(result.averageTime)}ms</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <h5>Prueba de ráfagas</h5>
                        <div className="stress-test-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tamaño de ráfaga</th>
                                        <th>Tasa de éxito</th>
                                        <th>Tiempo total</th>
                                        <th>Latencia promedio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stressTest.results.burstRequests.map((result, idx) => (
                                        <tr key={idx}>
                                            <td>{result.burstSize} peticiones</td>
                                            <td className={result.successRate > 80 ? 'success-text' : 
                                                      result.successRate > 50 ? 'warning-text' : 'error-text'}>
                                                {Math.round(result.successRate)}%
                                            </td>
                                            <td>{result.totalTime}ms</td>
                                            <td>{Math.round(result.averageLatency)}ms</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <h5>Prueba de descargas grandes</h5>
                        <div className="stress-test-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tamaño</th>
                                        <th>Estado</th>
                                        <th>Tiempo de descarga</th>
                                        <th>Velocidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stressTest.results.largeDownloads.map((result, idx) => (
                                        <tr key={idx}>
                                            <td>{result.size}</td>
                                            <td className={result.success ? 'success-text' : 'error-text'}>
                                                {result.success ? 'Exitoso' : 'Fallido'}
                                            </td>
                                            <td>{result.success ? `${result.downloadTime}ms` : 'N/A'}</td>
                                            <td>{result.success ? 
                                                `${(result.speed / (1024 * 1024)).toFixed(2)} MB/s` : 
                                                result.error || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="stress-test-conclusion">
                            <h5>Conclusión</h5>
                            {stressTest.results.completionRate > 80 && stressTest.results.maxConcurrentSuccess >= 20 ? (
                                <div className="conclusion success">
                                    <i className="fas fa-check-circle"></i>
                                    La aplicación maneja correctamente condiciones de alta carga. La red es estable y capaz de soportar múltiples operaciones simultáneas.
                                </div>
                            ) : stressTest.results.completionRate > 50 && stressTest.results.maxConcurrentSuccess >= 10 ? (
                                <div className="conclusion warning">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    La aplicación muestra un rendimiento aceptable bajo carga moderada, pero podría experimentar problemas durante periodos de tráfico intenso.
                                </div>
                            ) : (                                <div className="conclusion error">
                                    <i className="fas fa-times-circle"></i>
                                    La red actual tiene dificultades para manejar múltiples conexiones simultáneas. Se recomienda realizar operaciones secuenciales para evitar errores.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}            {/* Resultados de prueba de seguridad */}
            {securityTest.results && (
                <div className="security-test-results">
                    <div className="test-results-header">
                        <h4><i className="fas fa-shield-alt"></i> Resultados de seguridad</h4>
                    </div>
                    
                    <div className="security-score-container">
                        <div className={`security-score ${
                            securityTest.results.securityScore >= 80 ? 'excellent' :
                            securityTest.results.securityScore >= 60 ? 'good' :
                            securityTest.results.securityScore >= 40 ? 'average' : 'poor'
                        }`}>
                            <span className="score-value">{securityTest.results.securityScore}</span>
                            <span className="score-label">Puntuación de seguridad</span>
                        </div>
                        
                        <div className="security-details">
                            <h5>Detalles de la evaluación</h5>
                            
                            <div className="security-category">
                                <div className="category-header">
                                    <span><i className="fas fa-lock"></i> Configuración TLS/SSL</span>
                                </div>
                                <div className="category-details">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Endpoint</th>
                                                <th>Estado</th>
                                                <th>Versión TLS</th>
                                                <th>Seguridad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {securityTest.results.tlsTests.map((test, idx) => (
                                                <tr key={idx}>
                                                    <td>{test.endpoint}</td>
                                                    <td className={test.success ? 'success-text' : 'error-text'}>
                                                        {test.success ? 'Exitoso' : 'Fallido'}
                                                    </td>
                                                    <td>{test.tlsVersion || 'N/A'}</td>
                                                    <td className={
                                                        test.securityLevel === 'Alto' ? 'success-text' :
                                                        test.securityLevel === 'Medio' ? 'warning-text' : 'error-text'
                                                    }>
                                                        {test.securityLevel || 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="security-category">
                                <div className="category-header">
                                    <span><i className="fas fa-certificate"></i> Verificación de certificados</span>
                                </div>
                                <div className="category-details">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Prueba</th>
                                                <th>Resultado</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {securityTest.results.certificateTests.map((test, idx) => (
                                                <tr key={idx}>
                                                    <td>{test.url}</td>
                                                    <td>
                                                        {test.expectedFailure ? 
                                                            (test.validationSucceeded ? 'Se aceptó certificado inseguro ⚠️' : 'Se rechazó certificado inseguro ✅') : 
                                                            (test.validationSucceeded ? 'Certificado válido aceptado ✅' : 'Error de validación ❌')
                                                        }
                                                    </td>
                                                    <td className={
                                                        (test.expectedFailure && !test.validationSucceeded) || 
                                                        (!test.expectedFailure && test.validationSucceeded) ? 
                                                            'success-text' : 'error-text'
                                                    }>
                                                        {(test.expectedFailure && !test.validationSucceeded) || 
                                                         (!test.expectedFailure && test.validationSucceeded) ? 
                                                            'Correcto' : 'Incorrecto'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="security-category">
                                <div className="category-header">
                                    <span><i className="fas fa-globe"></i> Seguridad HTTP</span>
                                </div>
                                <div className="category-details">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Sitio</th>
                                                <th>Estado</th>
                                                <th>Puntuación</th>
                                                <th>Cabeceras de seguridad</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {securityTest.results.httpSecurityTests.map((test, idx) => (
                                                <tr key={idx}>
                                                    <td>{test.url}</td>
                                                    <td className={test.error ? 'error-text' : 'success-text'}>
                                                        {test.error ? 'Error' : `${test.responseStatus || 'N/A'}`}
                                                    </td>
                                                    <td className={
                                                        test.securityScore >= 80 ? 'success-text' :
                                                        test.securityScore >= 50 ? 'warning-text' : 'error-text'
                                                    }>
                                                        {test.securityScore || 0}%
                                                    </td>
                                                    <td className="security-headers">
                                                        {test.securityHeaders ? 
                                                            Object.entries(test.securityHeaders)
                                                            .filter(([_k, v]) => v)
                                                            .map(([k, _v], i) => <span key={i}>{k.replace(/([A-Z])/g, '-$1')}</span>)
                                                            : 'N/A'
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="security-conclusion">
                                {securityTest.results.securityScore >= 80 ? (
                                    <div className="conclusion success">
                                        <i className="fas fa-check-circle"></i>
                                        Tu conexión a internet es segura. Las conexiones TLS/SSL están correctamente configuradas y los certificados se validan adecuadamente.
                                    </div>
                                ) : securityTest.results.securityScore >= 60 ? (
                                    <div className="conclusion warning">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        Tu conexión tiene un nivel de seguridad aceptable, pero hay áreas que pueden mejorarse para aumentar la protección de tu información.
                                    </div>
                                ) : (
                                    <div className="conclusion error">
                                        <i className="fas fa-times-circle"></i>
                                        Se detectaron problemas de seguridad importantes en tu conexión. Te recomendamos actualizar tu navegador y sistema operativo a la última versión.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Componente de logs en tiempo real */}
            {(isRunning || stressTest.running || securityTest.running || realTimeLogs.length > 0) && (
                <>
                    <div className="logs-header">
                        <h4>
                            <i className="fas fa-terminal"></i> Logs en tiempo real
                        </h4>
                        <button 
                            className="clear-logs-button" 
                            onClick={clearLogs}
                            disabled={isRunning || stressTest.running || securityTest.running}
                        >
                            <i className="fas fa-trash-alt"></i> Limpiar
                        </button>
                    </div>
                    
                    <div className="real-time-logs">
                        {realTimeLogs.map((log, index) => (
                            <p key={index} className={
                                log.includes('Error') || log.includes('error') ? 'log-error' :
                                log.includes('completada') || log.includes('éxito') || log.includes('exitosas') ? 'log-success' :
                                log.includes('Iniciando') ? 'log-info' : ''
                            }>
                                {log}
                            </p>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                    
                    <div className="auto-scroll-toggle">
                        <input 
                            type="checkbox" 
                            id="auto-scroll" 
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                        />
                        <label htmlFor="auto-scroll">Desplazamiento automático</label>
                    </div>
                </>
            )}
        </div>
    );
};

export default NetworkDiagnostics;
