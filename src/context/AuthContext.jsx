import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase, auth } from '../supabase/client'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar sesión al cargar
        checkUser()

        // Suscribirse a cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null)
                setLoading(false)
            }
        )

        return () => {
            if (subscription) subscription.unsubscribe()
        }
    }, [])

    const checkUser = async () => {
        try {
            const session = await auth.getCurrentSession()
            setUser(session?.user ?? null)
        } catch (error) {
            console.error('Error al verificar usuario:', error)
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        try {
            // Primero limpiamos la caché
            try {
                await window.electronAPI.clearCache();
                console.log('Caché limpiado exitosamente al cerrar sesión');
            } catch (cacheError) {
                console.error('Error al limpiar caché durante el cierre de sesión:', cacheError);
            }

            // Luego cerramos la sesión
            await supabase.auth.signOut();
            setUser(null);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
    };

    const value = {
        signUp: auth.signUp,
        signIn: auth.signIn,
        signOut: handleSignOut, // Usamos nuestra función personalizada
        user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth debe usarse dentro de AuthProvider')
    }
    return context
}