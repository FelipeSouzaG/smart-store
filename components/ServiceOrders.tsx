import React, { useState, useEffect, useMemo, useContext } from 'react';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceBrand, Customer } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatName, validateName, formatPhone, validatePhone, formatCurrencyNumber, formatRegister, formatMoney } from '../validation';

interface ServiceOrdersProps {
    services: Service[];
    serviceOrders: ServiceOrder[];
    onAddServiceOrder: (order: Omit<ServiceOrder, 'id' | 'createdAt' | 'status'>) => void;
    onUpdateServiceOrder: (order: ServiceOrder) => void;
    onDeleteServiceOrder: (orderId: string) => void;
    onToggleStatus: (orderId: string) => void;
    setActivePage: (page: string) => void;
}

const OSStatusBadge: React.FC<{ status: ServiceOrderStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    const statusClasses = {
        [ServiceOrderStatus.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        [ServiceOrderStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

const OSModal: React.FC<{ 
    services: Service[], 
    orderToEdit?: ServiceOrder | null,
    onClose: () => void; 
    onSave: (order: Omit<ServiceOrder, 'id' | 'createdAt' | 'status'> | ServiceOrder) => void 
}> = ({ services, orderToEdit, onClose, onSave }) => {
    const { apiCall } = useContext(AuthContext);
    const [customerName, setCustomerName] = useState('');
    const [customerWhatsapp, setCustomerWhatsapp] = useState('');
    const [customerCnpjCpf, setCustomerCnpjCpf] = useState('');
    const [customerContact, setCustomerContact] = useState('');
    const [otherCosts, setOtherCosts] = useState('');
    const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);


    // State for cascading selects
    const [selectedBrand, setSelectedBrand] = useState<ServiceBrand | ''>('');
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    
    const selectedService = services.find(s => s.id === selectedServiceId);
    
    const availableBrands = useMemo(() => [...new Set(services.map(s => s.brand))], [services]);
    
    const availableModels = useMemo(() => {
        if (!selectedBrand) return [];
        return [...new Set(services.filter(s => s.brand === selectedBrand).map(s => s.model))];
    }, [services, selectedBrand]);

    const availableServices = useMemo(() => {
        if (!selectedBrand || !selectedModel) return [];
        return services.filter(s => s.brand === selectedBrand && s.model === selectedModel);
    }, [services, selectedBrand, selectedModel]);

    const handleCurrencyChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(formatMoney(value));
    };
    const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericString = value.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };
    
    const serviceBaseCost = useMemo(() => {
        if (!selectedService) return 0;
        return selectedService.partCost + selectedService.serviceCost + selectedService.shippingCost;
    }, [selectedService]);

    const serviceSalePrice = useMemo(() => {
        if (!selectedService) return 0;
        return selectedService.price;
    }, [selectedService]);

    const numericOtherCosts = useMemo(() => parseCurrency(otherCosts), [otherCosts]);

    const totalServicePrice = useMemo(() => { // This is what the customer pays (Total Serviço)
        return serviceSalePrice + numericOtherCosts;
    }, [serviceSalePrice, numericOtherCosts]);

    const totalServiceCost = useMemo(() => { // This is the final business cost
        return serviceBaseCost + numericOtherCosts;
    }, [serviceBaseCost, numericOtherCosts]);


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
                    setFoundCustomer(null);
                }
                setIsCustomerLoading(false);
            } else {
                 setFoundCustomer(null);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [customerWhatsapp, apiCall]);


    useEffect(() => {
        if (orderToEdit) {
            setCustomerName(orderToEdit.customerName);
            setCustomerWhatsapp(orderToEdit.customerWhatsapp);
            setCustomerCnpjCpf(orderToEdit.customerCnpjCpf || '');
            setCustomerContact(orderToEdit.customerContact || '');
            setOtherCosts(formatMoney((orderToEdit.otherCosts * 100).toFixed(0)));
            
            const serviceForEdit = services.find(s => s.id === orderToEdit.serviceId);
            if (serviceForEdit) {
                setSelectedBrand(serviceForEdit.brand);
                setTimeout(() => {
                    setSelectedModel(serviceForEdit.model);
                    setTimeout(() => {
                        setSelectedServiceId(serviceForEdit.id);
                    }, 0);
                }, 0);
            }

        } else {
            setCustomerName('');
            setCustomerWhatsapp('');
            setCustomerCnpjCpf('');
            setCustomerContact('');
            setSelectedBrand('');
            setSelectedModel('');
            setSelectedServiceId('');
            setOtherCosts('');
        }
         setErrors({});
    }, [orderToEdit, services]);

    const validateForm = () => {
        const newErrors: { name?: string; whatsapp?: string } = {};
        if (!validateName(customerName)) {
            newErrors.name = 'Nome inválido (mín. 3 caracteres).';
        }
        if (!customerWhatsapp || !validatePhone(customerWhatsapp)) {
            newErrors.whatsapp = 'Número de Whatsapp inválido ou vazio.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBrand(e.target.value as ServiceBrand);
        setSelectedModel('');
        setSelectedServiceId('');
    };
    
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(e.target.value);
        setSelectedServiceId('');
    };
    
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomerName(val);
        if (validateName(val)) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.name;
                return newErrors;
            });
        }
    };

    const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = formatPhone(e.target.value);
        setCustomerWhatsapp(val);
        if (validatePhone(val) && val) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.whatsapp;
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        if (!selectedService) {
            alert("Por favor, selecione um serviço válido.");
            return;
        }

        const payload = {
            customerName: formatName(customerName),
            customerWhatsapp: formatPhone(customerWhatsapp),
            customerCnpjCpf: formatRegister(customerCnpjCpf),
            customerId: foundCustomer?.id,
            customerContact: formatPhone(customerContact),
            serviceId: selectedService.id,
            serviceDescription: `${selectedService.name} - ${selectedService.brand} ${selectedService.model}`,
            totalPrice: totalServicePrice,
            totalCost: totalServiceCost,
            otherCosts: numericOtherCosts
        };

        if (orderToEdit) {
            onSave({ ...orderToEdit, ...payload });
        } else {
            onSave(payload);
        }
    };
    
    const isSaveDisabled = Object.keys(errors).length > 0 || !customerName || !customerWhatsapp || !selectedServiceId;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{orderToEdit ? 'Editar' : 'Nova'} Ordem de Serviço</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Whatsapp</label>
                            <input type="text" value={customerWhatsapp} onChange={handleWhatsappChange} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 ${errors.whatsapp ? 'border-red-500' : ''}`}/>
                             {isCustomerLoading && <p className="text-xs text-blue-400 mt-1">Buscando...</p>}
                            {foundCustomer && <p className="text-xs text-green-500 mt-1">Cliente encontrado!</p>}
                            {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Nome do Cliente</label>
                            <input type="text" value={customerName} onChange={handleNameChange} onBlur={() => setCustomerName(formatName(customerName))} required className={`mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 ${errors.name ? 'border-red-500' : ''}`}/>
                             {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">CPF/CNPJ (Opcional)</label>
                            <input type="text" value={customerCnpjCpf} onChange={e => setCustomerCnpjCpf(formatRegister(e.target.value))} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Contato Alternativo</label>
                            <input type="text" value={customerContact} onChange={e => setCustomerContact(formatPhone(e.target.value))} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                    </div>

                     <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h3 className="text-md font-semibold">Seleção de Serviço</h3>
                        <div>
                            <label className="block text-sm font-medium">1. Marca</label>
                             <select value={selectedBrand} onChange={handleBrandChange} required className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2">
                                 <option value="" disabled>Selecione a marca...</option>
                                 {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                             </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">2. Modelo</label>
                             <select value={selectedModel} onChange={handleModelChange} required disabled={!selectedBrand || availableModels.length === 0} className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 disabled:opacity-50">
                                 <option value="" disabled>Selecione o modelo...</option>
                                 {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">3. Tipo de Serviço</label>
                             <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} required disabled={!selectedModel || availableServices.length === 0} className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 disabled:opacity-50">
                                 <option value="" disabled>Selecione o serviço...</option>
                                 {availableServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Outros Custos (R$)</label>
                            <input type="text" value={otherCosts} onChange={e => handleCurrencyChange(e.target.value, setOtherCosts)} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400">Total da OS (a cobrar)</label>
                            <div className="mt-1 block w-full rounded-md bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-sm px-3 py-2 text-lg font-bold text-green-500">
                                R$ {formatCurrencyNumber(totalServicePrice)}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" disabled={isSaveDisabled} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Salvar OS</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const ConfirmationModal: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Confirmar Ação</h3>
            <p className="mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400">Cancelar</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Confirmar</button>
            </div>
        </div>
    </div>
);


const ServiceOrders: React.FC<ServiceOrdersProps> = ({ services, serviceOrders, onAddServiceOrder, onUpdateServiceOrder, onDeleteServiceOrder, onToggleStatus, setActivePage }) => {
    const { user } = useContext(AuthContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    
    const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | 'All'>(ServiceOrderStatus.PENDING);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;


    const handleSaveOrder = (orderData: Omit<ServiceOrder, 'id' | 'createdAt' | 'status'> | ServiceOrder) => {
        if ('id' in orderData) {
            onUpdateServiceOrder(orderData);
        } else {
            onAddServiceOrder(orderData);
        }
        setIsModalOpen(false);
        setEditingOrder(null);
    };

    const handleOpenEditModal = (order: ServiceOrder) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleOpenCreateModal = () => {
        setEditingOrder(null);
        setIsModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingOrderId) {
            onDeleteServiceOrder(deletingOrderId);
        }
        setDeletingOrderId(null);
    };

    const filteredAndSortedOrders = useMemo(() => {
        return serviceOrders
            .filter(order => {
                if (statusFilter !== 'All' && order.status !== statusFilter) {
                    return false;
                }
                const lowerCaseSearch = searchTerm.toLowerCase();
                if (lowerCaseSearch) {
                    return (
                        order.id.toLowerCase().includes(lowerCaseSearch) ||
                        order.customerName.toLowerCase().includes(lowerCaseSearch) ||
                        order.customerWhatsapp.includes(lowerCaseSearch) ||
                        (order.customerContact && order.customerContact.includes(lowerCaseSearch))
                    );
                }
                return true;
            })
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [serviceOrders, statusFilter, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm]);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredAndSortedOrders.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredAndSortedOrders.length / recordsPerPage);

    const nextPage = () => {
        if (currentPage < nPages) setCurrentPage(currentPage + 1);
    };
    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    return (
         <div className="container mx-auto">
            {isModalOpen && <OSModal services={services} orderToEdit={editingOrder} onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} onSave={handleSaveOrder} />}
            {deletingOrderId && (
                <ConfirmationModal
                    message="Tem certeza que deseja excluir esta Ordem de Serviço? As transações financeiras associadas também serão removidas."
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingOrderId(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ordens de Serviço</h1>
                <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Criar Nova OS</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg mb-6 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por OS, Nome ou Telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                    />
                     <div className="flex items-center justify-center md:justify-end space-x-2">
                        <span className="text-sm font-medium">Status:</span>
                        {(['All', ...Object.values(ServiceOrderStatus)]).map(status => (
                            <button key={status} onClick={() => setStatusFilter(status as ServiceOrderStatus | 'All')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                {status === 'All' ? 'Todas' : status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">OS #</th>
                                <th scope="col" className="px-6 py-3">Cliente</th>
                                <th scope="col" className="px-6 py-3">Serviço</th>
                                <th scope="col" className="px-6 py-3">Preço Venda</th>
                                <th scope="col" className="px-6 py-3">Data</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">Nenhuma Ordem de Serviço encontrada.</td>
                                </tr>
                             ) : (
                                currentRecords.map(order => {
                                    const isTechnician = user?.role === 'technician';
                                    const isPending = order.status === ServiceOrderStatus.PENDING;
                                    const canEdit = !isTechnician || isPending;
                                    const canDelete = !isTechnician || isPending;
                                    const canReopen = !isTechnician;

                                    return (
                                        <tr key={order.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.id}</td>
                                            <td className="px-6 py-4">
                                                <div>{order.customerName}</div>
                                                <div className="text-xs text-gray-500">{order.customerWhatsapp}</div>
                                            </td>
                                            <td className="px-6 py-4">{order.serviceDescription}</td>
                                            <td className="px-6 py-4 font-semibold text-green-500">R$ {formatCurrencyNumber(order.totalPrice)}</td>
                                            <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
                                            <td className="px-6 py-4"><OSStatusBadge status={order.status} /></td>
                                            <td className="px-6 py-4 space-x-4 whitespace-nowrap">
                                                {isPending ? (
                                                    <button 
                                                        onClick={() => onToggleStatus(order.id)}
                                                        className="font-medium text-green-600 dark:text-green-500 hover:underline"
                                                    >
                                                        Concluir
                                                    </button>
                                                ) : (
                                                    canReopen && (
                                                        <button 
                                                            onClick={() => onToggleStatus(order.id)}
                                                            className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline"
                                                        >
                                                            Pendente
                                                        </button>
                                                    )
                                                )}
                                                <button 
                                                    onClick={() => handleOpenEditModal(order)} 
                                                    disabled={!canEdit}
                                                    className="font-medium text-indigo-600 dark:text-indigo-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline"
                                                >
                                                    Editar
                                                </button>
                                                <button 
                                                    onClick={() => setDeletingOrderId(order.id)} 
                                                    disabled={!canDelete}
                                                    className="font-medium text-red-600 dark:text-red-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline"
                                                >
                                                    Excluir
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                }))}
                        </tbody>
                    </table>
                </div>
                 {nPages > 1 && (
                    <div className="p-4 flex justify-between items-center flex-wrap gap-2">
                         <span className="text-sm text-gray-700 dark:text-gray-400">
                            Página {currentPage} de {nPages} ({filteredAndSortedOrders.length} registros)
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={prevPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={nextPage}
                                disabled={currentPage === nPages || nPages === 0}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ServiceOrders;
