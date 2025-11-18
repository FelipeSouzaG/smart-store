import React, { useState, useMemo, useEffect } from 'react';
import { API_BASE_URL } from './config';
import Login from './components/Login';
import Layout from './components/Layout';
import { AuthContext } from './contexts/AuthContext';
import type { User } from './types';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
    };

    useEffect(() => {
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const response = await fetch(`${API_BASE_URL}/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        setToken(storedToken);
                    } else {
                        logout();
                    }
                } catch (error) {
                    console.error("Failed to verify token", error);
                    logout();
                }
            }
            setIsLoading(false);
        };
        verifyToken();
    }, []);


    const login = (userData: User, userToken: string) => {
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
    };

    const updateUser = (newUserData: User) => {
        setUser(newUserData);
    };

    const apiCall = async (endpoint: string, method: string, body?: any): Promise<any | null> => {
        if (!token) {
            console.error("API call attempted without a token.");
            logout();
            return null;
        }
        try {
            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);

            if (response.status === 401) {
                alert('Sua sessão expirou. Por favor, faça login novamente.');
                logout();
                return null;
            }

            // For successful DELETE with no content
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return { success: true };
            }

            const data = await response.json();

            if (!response.ok) {
                // Now that we have data, throw an error with the server's message
                throw new Error(data.message || 'A chamada à API falhou');
            }
            
            return data;

        } catch (error) {
            // This will catch network errors and the thrown error from !response.ok
            console.error(`Error with ${method} ${endpoint}:`, error);
            // Don't alert for 404s from lookup fields
            if (!(error instanceof Error && error.message.includes('não encontrado'))) {
                 alert(`Ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
            return null;
        }
    };

    const authContextValue = useMemo(() => ({
        user,
        token,
        login,
        logout,
        apiCall,
        updateUser,
    }), [user, token]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <p>Carregando...</p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={authContextValue}>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                {user && token ? <Layout /> : <Login />}
            </div>
        </AuthContext.Provider>
    );
};

export default App;
