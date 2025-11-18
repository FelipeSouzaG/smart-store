import React, { useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { validateEmail } from '../validation';


const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean | null>(null);
    const [showPassword, setShowPassword] = useState(false);


    useEffect(() => {
        const checkSystemStatus = async () => {
            try {
                // Check if any users exist to determine if it's the first setup
                const response = await fetch(`${API_BASE_URL}/auth/system-status`);
                if (response.ok) {
                    const { userCount } = await response.json();
                    setIsFirstTimeSetup(userCount === 0);
                } else {
                     setIsFirstTimeSetup(null);
                     setError('Não foi possível verificar o status do sistema.');
                }
            } catch (err) {
                setError('Não foi possível conectar ao servidor.');
                setIsFirstTimeSetup(null);
            }
        };
        checkSystemStatus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) {
            setError('Formato de email inválido.');
            return;
        }

        setIsLoading(true);

        try {
            const url = isFirstTimeSetup 
                ? `${API_BASE_URL}/users/setup-owner` 
                : `${API_BASE_URL}/auth/login`;

            const payload = isFirstTimeSetup
                ? { name: email.split('@')[0], email, password }
                : { email, password };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const data = await response.json();

            if (response.ok) {
                login(data.user, data.token);
            } else {
                throw new Error(data.message || 'Ocorreu um erro.');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <svg className="mr-3" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2 0a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m7.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m1.5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m-7-1a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zm5.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                        <path d="M11.5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5m0-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                        <path d="M7 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m-1 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"/>
                        <path d="M14 0a.5.5 0 0 1 .5.5V2h.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12.5V.5A.5.5 0 0 1 14 0M1 3v3h14V3zm14 4H1v7h14z"/>
                      </svg>
                      SmartStore
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Bem-vindo ao seu painel de gestão inteligente.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password-input" className="sr-only">Senha</label>
                            <input
                                id="password-input"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                                placeholder="Senha"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 z-10 pr-3 flex items-center text-gray-500 dark:text-gray-400"
                                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM9 4.803A7.968 7.968 0 0110 5c3.453 0 6.545 2.057 7.938 5.127a9.406 9.406 0 01-1.394 2.531l-1.493-1.493A3.013 3.013 0 0012.015 9.5l-1.07-1.071A5.004 5.004 0 009 4.803zM4.83 5.06A9.95 9.95 0 00.458 10c1.274 4.057 5.064 7 9.542 7a9.95 9.95 0 004.18-1.031l-1.424-1.424A5.013 5.013 0 0110.01 13a5 5 0 01-4.242-4.242l-1.939-1.94z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>
                <div className="text-xs text-center text-gray-500 dark:text-gray-400 p-2 bg-indigo-50 dark:bg-gray-700/50 rounded-lg">
                   {isFirstTimeSetup === true && (
                        <p>✨ **Primeiro Acesso!** ✨<br/>Insira o email e senha desejados para criar a conta de Administrador (Owner).</p>
                    )}
                    {isFirstTimeSetup === false && (
                        <p>Faça login para acessar seu painel.</p>
                    )}
                    {isFirstTimeSetup === null && !error && (
                         <p>Verificando o sistema...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
