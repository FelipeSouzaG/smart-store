
import React, { useState, useRef, useEffect, useContext } from 'react';
import type { Product, SaleItem, TicketSale, Customer } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatName, formatPhone, formatRegister, formatCurrencyNumber, validateName, validateRegister, validatePhone } from '../validation';

declare const jsQR: any;

const ScannerModal: React.FC<{ onClose: () => void; onScan: (code: string) => void }> = ({ onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let animationFrameId: number;

        const openCamera = async () => {
            try {
                // Request ideal resolution to avoid massive 4k streams on mobile which slow down JS processing
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true');
                    videoRef.current.play();
                    animationFrameId = requestAnimationFrame(tick);
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Não foi possível acessar a câmera. Verifique as permissões no seu navegador e se está acessando via HTTPS.");
                onClose();
            }
        };

        const tick = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                if (canvas) {
                    // Performance optimization: Scale down detecting image
                    // Processing full resolution on mobile is too slow for jsQR
                    const MAX_WIDTH = 640;
                    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
                    const width = video.videoWidth * scale;
                    const height = video.videoHeight * scale;

                    canvas.width = width;
                    canvas.height = height;
                    
                    // 'willReadFrequently' optimizes for frequent getImageData calls
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, width, height);
                        const imageData = ctx.getImageData(0, 0, width, height);
                        
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "attemptBoth", // Try both normal and inverted codes
                        });
                        
                        if (code && code.data) {
                            // Success feedback
                            if (navigator.vibrate) navigator.vibrate(200);
                            onScan(code.data);
                            return;
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        openCamera();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [onClose, onScan]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-lg w-full">
                <p className="text-center text-gray-700 dark:text-gray-200 mb-2 font-medium">Aponte a câmera para o código de barras</p>
                <div className="relative bg-black rounded overflow-hidden">
                    <video ref={videoRef} className="w-full h-auto object-contain" />
                    {/* Visual Guide Overlay */}
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                        <div className="w-3/4 h-1/3 border-2 border-red-500/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none">
                            {/* Scanning line animation */}
                            <div className="w-full h-0.5 bg-red-500 animate-[pulse_2s_infinite] relative top-1/2 -translate-y-1/2"></div>
                        </div>
                    </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <button
                    onClick={onClose}
                    className="mt-4 w-full py-3 px-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};


interface SalesProps {
    products: Product[];
    onAddSale: (sale: Omit<TicketSale, 'id' | 'timestamp' | 'saleHour' | 'customerId'> & { customerCnpjCpf?: string }) => void;
}

const Sales: React.FC<SalesProps> = ({ products, onAddSale }) => {
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [message, setMessage] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    // Customer state
    const [customerName, setCustomerName] = useState('');
    const [customerWhatsapp, setCustomerWhatsapp] = useState('');
    const [customerCnpjCpf, setCustomerCnpjCpf] = useState('');
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [customerError, setCustomerError] = useState('');

    
    const { user, apiCall } = useContext(AuthContext);

    // State for new dynamic search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [uniqueIdentifier, setUniqueIdentifier] = useState('');
    const [identifierError, setIdentifierError] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Debounce for customer search
    useEffect(() => {
        const handler = setTimeout(async () => {
            const cleanedPhone = customerWhatsapp.replace(/\D/g, '');
            if (cleanedPhone.length >= 10) {
                setIsCustomerLoading(true);
                const customer: Customer | null = await apiCall(`customers/${cleanedPhone}`, 'GET');

                if (customer) {
                    setFoundCustomer(customer);
                    setCustomerName(customer.name);
                    setCustomerCnpjCpf(customer.cnpjCpf || '');
                } else {
                    // Don't clear fields to allow new customer entry
                    setFoundCustomer(null);
                }
                setIsCustomerLoading(false);

            } else {
                 setFoundCustomer(null);
            }
        }, 500); // 500ms debounce delay

        return () => clearTimeout(handler);
    }, [customerWhatsapp, apiCall]);


    const total = cart.reduce((sum, cartItem) => sum + cartItem.unitPrice * cartItem.quantity, 0);

    const showTemporaryMessage = (msg: string, isError: boolean = false, duration: number = 2000) => {
        if(isError) setCustomerError(msg); else setMessage(msg);
        setTimeout(() => {
            setMessage('');
            setCustomerError('');
        }, duration);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setSelectedProduct(null);
        setUniqueIdentifier('');
        setIdentifierError('');

        if (value.length < 1) {
            setSearchResults([]);
            return;
        }

        const lowerCaseValue = value.toLowerCase();
        const results = products.filter(p => 
            p.name.toLowerCase().includes(lowerCaseValue) ||
            p.barcode.toLowerCase().includes(lowerCaseValue) ||
            p.category.toLowerCase().includes(lowerCaseValue) ||
            (p.location && p.location.toLowerCase().includes(lowerCaseValue))
        );
        setSearchResults(results);
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setSearchResults([]);
        setQuantity(1);
        setUniqueIdentifier('');
        setIdentifierError('');
    };

    const handleAddItemToCart = () => {
        let productToAdd = selectedProduct;
        
        if (!productToAdd) {
            const foundByBarcode = products.find(p => p.barcode === searchTerm);
            if (foundByBarcode) {
                productToAdd = foundByBarcode;
                setSelectedProduct(foundByBarcode);
                setSearchTerm(foundByBarcode.name);
            }
        }

        if (!productToAdd) {
            showTemporaryMessage('Selecione um produto da lista ou digite um código de barras válido.', true);
            return;
        }

        if (productToAdd.stock < quantity) {
            showTemporaryMessage(`Estoque insuficiente. Disponível: ${productToAdd.stock}`, true, 3000);
            return;
        }

        if (productToAdd.requiresUniqueIdentifier) {
            if (!uniqueIdentifier.trim()) {
                setIdentifierError('Identificador é obrigatório.');
                return;
            }
             setCart(prevCart => {
                return [...prevCart, { 
                    item: productToAdd!, 
                    quantity: 1, // Always 1
                    type: 'product', 
                    unitPrice: productToAdd!.price,
                    uniqueIdentifier: uniqueIdentifier.trim()
                }];
            });
        } else {
             setCart(prevCart => {
                const existingItemIndex = prevCart.findIndex(ci => ci.item.id === productToAdd!.id && ci.type === 'product');

                if (existingItemIndex !== -1) {
                    const newCart = [...prevCart];
                    const existingItem = newCart[existingItemIndex];
                    const newQuantity = existingItem.quantity + quantity;

                    if (newQuantity > productToAdd!.stock) {
                        showTemporaryMessage(`Estoque insuficiente. Você já tem ${existingItem.quantity} no carrinho. Disponível: ${productToAdd!.stock}`, true, 3000);
                        return prevCart;
                    }
                    
                    newCart[existingItemIndex] = { ...existingItem, quantity: newQuantity };
                    return newCart;
                } else {
                    return [...prevCart, { item: productToAdd!, quantity, type: 'product', unitPrice: productToAdd!.price }];
                }
            });
        }

        showTemporaryMessage(`${productToAdd.name} adicionado.`);

        // Reset fields for next item
        setSearchTerm('');
        setSearchResults([]);
        setSelectedProduct(null);
        setQuantity(1);
        setUniqueIdentifier('');
        setIdentifierError('');
        searchInputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItemToCart();
        }
    };

    const handleScan = (code: string) => {
        setIsScannerOpen(false);
        const product = products.find(p => p.id === code);

        if (product) {
            if (product.stock <= 0) {
                showTemporaryMessage('Produto sem estoque.', true);
                return;
            }
            
            handleSelectProduct(product);

        } else {
            showTemporaryMessage('Produto não encontrado via scanner.', true);
        }
    };

    const handleCompleteSale = () => {
        if (cart.length === 0) {
            showTemporaryMessage('Carrinho vazio.', true);
            return;
        }

        if (!user) {
            showTemporaryMessage('Erro: Usuário não identificado. Faça login novamente.', true);
            return;
        }
        
        const requiresCustomer = cart.some(item => 
            item.type === 'product' && 
            'requiresUniqueIdentifier' in item.item && 
            item.item.requiresUniqueIdentifier
        );

        if (requiresCustomer) {
            const isNameValid = customerName && validateName(customerName);
            // validatePhone returns true for empty, so we must check for emptiness first.
            const isPhoneValid = customerWhatsapp && validatePhone(customerWhatsapp);

            if (!isNameValid || !isPhoneValid) {
                showTemporaryMessage('Nome e Whatsapp válidos são obrigatórios para vendas com IMEI/Serial.', true, 3500);
                return;
            }
        }


        onAddSale({
            items: cart,
            total,
            customerName,
            customerWhatsapp,
            customerCnpjCpf,
            userId: user.id,
            userName: user.name,
        });

        setCart([]);
        setCustomerName('');
        setCustomerWhatsapp('');
        setCustomerCnpjCpf('');
        setFoundCustomer(null);
        showTemporaryMessage('Venda registrada com sucesso!');
    };
    
    const handleCancelSale = () => {
        setCart([]);
        setCustomerName('');
        setCustomerWhatsapp('');
        setCustomerCnpjCpf('');
        setFoundCustomer(null);
        showTemporaryMessage('Venda cancelada.');
    };

    return (
        <div className="container mx-auto space-y-8">
            {isScannerOpen && <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />}
            
            <div>
                 <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Ponto de Venda</h1>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-semibold mb-4">Itens da Venda</h2>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {cart.length === 0 ? (
                                    <p className="text-gray-500 dark:text-gray-400">Nenhum item no carrinho.</p>
                                ) : (
                                    cart.map((cartItem, index) => (
                                        <div key={`${cartItem.item.id}-${index}`} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div>
                                                <p className="font-semibold">{cartItem.item.name}</p>
                                                 {cartItem.uniqueIdentifier && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {cartItem.uniqueIdentifier}</p>
                                                )}
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {cartItem.quantity} x R$ {formatCurrencyNumber(cartItem.unitPrice)}
                                                </p>
                                            </div>
                                            <p className="font-semibold">R$ {formatCurrencyNumber(cartItem.unitPrice * cartItem.quantity)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-6">
                            <h2 className="text-xl font-semibold">Adicionar Item</h2>
                            
                            <div className="space-y-4">
                                <div className="relative">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar Produto</label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            id="search"
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Cód., nome, local, categoria..."
                                            className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            autoComplete="off"
                                        />
                                        <button type="button" onClick={() => setIsScannerOpen(true)} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm10 0a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM3 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                     {searchResults.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border dark:border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                            {searchResults.map(product => (
                                                <li 
                                                    key={product.id} 
                                                    onClick={() => handleSelectProduct(product)} 
                                                    className="p-2 text-sm hover:bg-indigo-500 hover:text-white cursor-pointer"
                                                >
                                                    <p className="font-semibold">{product.name}</p>
                                                    <p className="text-xs text-gray-400">Cód: {product.barcode} | Estoque: {product.stock}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {selectedProduct?.requiresUniqueIdentifier && (
                                    <div>
                                        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identificador (IMEI, Serial)</label>
                                        <input 
                                            type="text" 
                                            id="identifier" 
                                            value={uniqueIdentifier} 
                                            onChange={e => {
                                                setUniqueIdentifier(e.target.value);
                                                if(e.target.value) setIdentifierError('');
                                            }} 
                                            onKeyDown={handleKeyDown}
                                            className={`mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 ${identifierError ? 'border-red-500' : ''}`}
                                        />
                                        {identifierError && <p className="text-xs text-red-500 mt-1">{identifierError}</p>}
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <div className="w-24">
                                        <label htmlFor="quantity" className="block text-sm font-medium">Qtd.</label>
                                        <input 
                                            type="number" 
                                            id="quantity" 
                                            value={selectedProduct?.requiresUniqueIdentifier ? 1 : quantity}
                                            onChange={e => setQuantity(Number(e.target.value) || 1)} 
                                            onKeyDown={handleKeyDown}
                                            min="1" 
                                            disabled={selectedProduct?.requiresUniqueIdentifier}
                                            className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2 disabled:opacity-50"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAddItemToCart} 
                                        disabled={selectedProduct?.requiresUniqueIdentifier && !uniqueIdentifier.trim()}
                                        className="flex-grow h-10 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                                        Incluir
                                    </button>
                                </div>
                            </div>
                            
                             <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                                <h3 className="font-semibold">Dados do Cliente</h3>
                                <div>
                                    <label className="block text-sm font-medium">Telefone/Whatsapp</label>
                                    <input type="text" value={customerWhatsapp} onChange={e => setCustomerWhatsapp(formatPhone(e.target.value))} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                                    {isCustomerLoading && <p className="text-xs text-blue-400 mt-1">Buscando...</p>}
                                    {foundCustomer && <p className="text-xs text-green-500 mt-1">Cliente encontrado!</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Nome</label>
                                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} onBlur={() => setCustomerName(formatName(customerName))} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">CPF/CNPJ (Opcional)</label>
                                    <input type="text" value={customerCnpjCpf} onChange={e => setCustomerCnpjCpf(formatRegister(e.target.value))} className="mt-1 w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                                </div>
                             </div>

                            {message && <p className="text-sm text-indigo-600 dark:text-indigo-400 text-center">{message}</p>}
                            {customerError && <p className="text-sm text-red-500 text-center">{customerError}</p>}
                            
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                <div className="flex justify-between text-2xl font-bold">
                                    <span>Total:</span>
                                    <span>R$ {formatCurrencyNumber(total)}</span>
                                </div>
                                <button onClick={handleCompleteSale} className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105">
                                    Finalizar Venda
                                </button>
                                <button onClick={handleCancelSale} className="w-full py-2 px-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sales;
