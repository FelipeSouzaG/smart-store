import React, { useState, useEffect, useContext } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Sales from './Sales';
import SalesHistory from './SalesHistory';
import Products from './Products';
import Services from './Services';
import Cash from './Cash';
import ServiceOrders from './ServiceOrders';
import Purchases from './Purchases';
import Costs from './Costs';
import Users from './Users';
import Customers from './Customers';
import Suppliers from './Suppliers';
import Profile from './Profile';
import { AuthContext } from '../contexts/AuthContext';
import { 
    CashTransaction, 
    Service, 
    Product, 
    PurchaseOrder, 
    ServiceOrder, 
    TransactionStatus, 
    TicketSale,
    User,
    Customer,
    Supplier,
} from '../types';

const Layout: React.FC = () => {
    const { user, token, apiCall, updateUser: updateUserInContext } = useContext(AuthContext);
    const [activePage, setActivePage] = useState(user?.role === 'technician' ? 'sales' : 'dashboard');
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
    const [ticketSales, setTicketSales] = useState<TicketSale[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const fetchData = async (endpoint: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        const data = await apiCall(endpoint, 'GET');
        if (data) {
            setter(data);
        }
    };
    
    useEffect(() => {
        if (token) {
            // Data needed by all roles, including technician
            fetchData('products', setProducts);
            fetchData('services', setServices);
            fetchData('service-orders', setServiceOrders);
            fetchData('customers', setCustomers); // Technicians can see all customers

            // Data for owner/manager only
            if(user?.role === 'owner' || user?.role === 'manager') {
               fetchData('transactions', setTransactions);
               fetchData('purchases', setPurchaseOrders);
               fetchData('sales', setTicketSales);
               fetchData('users', setUsers);
               fetchData('suppliers', setSuppliers);
            }
        }
    }, [token, user]); // Re-fetch if user changes (e.g., re-login)
    
    // Generic Handlers
    const addTransaction = async (transaction: Omit<CashTransaction, 'id' | 'timestamp'>) => {
        const result = await apiCall('transactions', 'POST', transaction);
        if (result) await fetchData('transactions', setTransactions);
    };

    const updateTransaction = async (updatedTransaction: CashTransaction) => {
        const result = await apiCall(`transactions/${updatedTransaction.id}`, 'PUT', updatedTransaction);
        if (result) await fetchData('transactions', setTransactions);
    };

    const deleteTransaction = async (transactionId: string) => {
        const result = await apiCall(`transactions/${transactionId}`, 'DELETE');
        if (result) await fetchData('transactions', setTransactions);
    };
    
    const updateTransactionStatus = async (transactionId: string, status: TransactionStatus) => {
        const transactionToUpdate = transactions.find(t => t.id === transactionId);
        if (transactionToUpdate) {
            await updateTransaction({ ...transactionToUpdate, status });
        }
    };

    // Purchase Handlers
    const handleAddPurchase = async (purchaseOrderData: Omit<PurchaseOrder, 'id' | 'createdAt'>) => {
        const result = await apiCall('purchases', 'POST', purchaseOrderData);
        if (result) {
            await fetchData('purchases', setPurchaseOrders);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
            await fetchData('suppliers', setSuppliers);
        }
    };
    
    const updatePurchaseOrder = async (updatedPO: PurchaseOrder) => {
        const result = await apiCall(`purchases/${updatedPO.id}`, 'PUT', updatedPO);
        if (result) {
            await fetchData('purchases', setPurchaseOrders);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
            await fetchData('suppliers', setSuppliers);
        }
    };

    const deletePurchaseOrder = async (purchaseOrderId: string) => {
        const result = await apiCall(`purchases/${purchaseOrderId}`, 'DELETE');
        if (result) {
            await fetchData('purchases', setPurchaseOrders);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
        }
    };

    // Service Order Handlers
    const addServiceOrder = async (orderData: Omit<ServiceOrder, 'id' | 'createdAt' | 'status'>) => {
        const result = await apiCall('service-orders', 'POST', orderData);
        if (result) {
            await fetchData('service-orders', setServiceOrders);
            await fetchData('customers', setCustomers); // Also update customers in case of a new one
        }
    };

    const updateServiceOrder = async (updatedOrder: ServiceOrder) => {
        const result = await apiCall(`service-orders/${updatedOrder.id}`, 'PUT', updatedOrder);
        if (result) {
            await fetchData('service-orders', setServiceOrders);
            await fetchData('customers', setCustomers); // Also update customers in case of an upsert
        }
    };

    const deleteServiceOrder = async (orderId: string) => {
        const result = await apiCall(`service-orders/${orderId}`, 'DELETE');
        if (result) {
            await fetchData('service-orders', setServiceOrders);
            // Technicians don't have access to transactions, so only refetch if not a technician.
            if (user?.role !== 'technician') {
                await fetchData('transactions', setTransactions);
            }
        }
    };

    const toggleServiceOrderStatus = async (orderId: string) => {
        const result = await apiCall(`service-orders/${orderId}/toggle-status`, 'POST');
         if (result) {
            await fetchData('service-orders', setServiceOrders);
            // Technicians don't have access to transactions, so only refetch if not a technician.
            if (user?.role !== 'technician') {
                await fetchData('transactions', setTransactions);
            }
        }
    };

    // Product Handlers
    const addProduct = async (productData: Omit<Product, 'cost' | 'stock' | 'lastSold'>) => {
        const result = await apiCall('products', 'POST', productData);
        if (result) await fetchData('products', setProducts);
    };

    const updateProduct = async (updatedProduct: Product) => {
        const result = await apiCall(`products/${updatedProduct.id}`, 'PUT', updatedProduct);
        if (result) await fetchData('products', setProducts);
    };

    const deleteProduct = async (productId: string) => {
        const result = await apiCall(`products/${productId}`, 'DELETE');
        if (result) await fetchData('products', setProducts);
    };

    // Service Handlers
    const addService = async (serviceData: Omit<Service, 'id'>) => {
        const result = await apiCall('services', 'POST', serviceData);
        if (result) await fetchData('services', setServices);
    };

    const updateService = async (updatedService: Service) => {
        const result = await apiCall(`services/${updatedService.id}`, 'PUT', updatedService);
        if (result) await fetchData('services', setServices);
    };

    const deleteService = async (serviceId: string) => {
        const result = await apiCall(`services/${serviceId}`, 'DELETE');
        if (result) await fetchData('services', setServices);
    };

    // Sales Handler
    const handleAddSale = async (saleData: Omit<TicketSale, 'id' | 'timestamp' | 'saleHour' | 'customerId'> & { customerCnpjCpf?: string }) => {
        const result = await apiCall('sales', 'POST', saleData);
        if (result) {
            // Technicians can create sales but cannot view sales history or full transaction lists.
            // Only refetch that data if the user is an owner or manager to avoid permission errors.
            if (user?.role === 'owner' || user?.role === 'manager') {
                await fetchData('sales', setTicketSales);
                await fetchData('transactions', setTransactions);
            }
            // All roles need updated product stock and customer data.
            await fetchData('products', setProducts);
            await fetchData('customers', setCustomers);
        }
    };

    const handleDeleteSale = async (saleId: string) => {
        const result = await apiCall(`sales/${saleId}`, 'DELETE');
        if (result) {
            await fetchData('sales', setTicketSales);
            await fetchData('products', setProducts);
            await fetchData('transactions', setTransactions);
        }
    };

    // User Handlers
    const handleAddUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
        const result = await apiCall('users', 'POST', userData);
        if (result) await fetchData('users', setUsers);
    };

    const handleUpdateUser = async (userData: User & { password?: string }) => {
        const result = await apiCall(`users/${userData.id}`, 'PUT', userData);
        if (result) await fetchData('users', setUsers);
    };

    const handleDeleteUser = async (userId: string) => {
        const result = await apiCall(`users/${userId}`, 'DELETE');
        if (result) await fetchData('users', setUsers);
    };

    const handleUpdateProfile = async (userData: Partial<User> & { password?: string }) => {
        const result = await apiCall('users/profile', 'PUT', userData);
        if (result) {
            updateUserInContext(result); // Update context immediately
            alert('Perfil atualizado com sucesso!');
            setActivePage(user?.role === 'technician' ? 'sales' : 'dashboard');
        }
    };


    // Customer Handlers
    const handleAddCustomer = async (customerData: Omit<Customer, 'id'> & { phone: string }) => {
        const result = await apiCall('customers', 'POST', customerData);
        if (result) await fetchData('customers', setCustomers);
    };

    const handleUpdateCustomer = async (customerData: Customer) => {
        const result = await apiCall(`customers/${customerData.id}`, 'PUT', customerData);
        if (result) await fetchData('customers', setCustomers);
    };

    const handleDeleteCustomer = async (customerId: string) => {
        const result = await apiCall(`customers/${customerId}`, 'DELETE');
        if (result) await fetchData('customers', setCustomers);
    };
    
    // Supplier Handlers
    const handleAddSupplier = async (supplierData: Omit<Supplier, 'id'> & { cnpjCpf: string }) => {
        const result = await apiCall('suppliers', 'POST', supplierData);
        if (result) await fetchData('suppliers', setSuppliers);
    };

    const handleUpdateSupplier = async (supplierData: Supplier) => {
        const result = await apiCall(`suppliers/${supplierData.id}`, 'PUT', supplierData);
        if (result) await fetchData('suppliers', setSuppliers);
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        const result = await apiCall(`suppliers/${supplierId}`, 'DELETE');
        if (result) await fetchData('suppliers', setSuppliers);
    };


    const renderContent = () => {
        switch (activePage) {
            case 'dashboard':
                return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} />;
            case 'sales':
                return <Sales products={products} onAddSale={handleAddSale} />;
            case 'sales-history':
                return <SalesHistory ticketSales={ticketSales} onDeleteSale={handleDeleteSale} setActivePage={setActivePage} />;
            case 'cash':
                return <Cash transactions={transactions} updateTransactionStatus={updateTransactionStatus} />;
            case 'purchases':
                return <Purchases 
                            products={products} 
                            purchaseOrders={purchaseOrders} 
                            onAddPurchase={handleAddPurchase}
                            onUpdatePurchase={updatePurchaseOrder}
                            onDeletePurchase={deletePurchaseOrder}
                        />;
            case 'costs':
                return <Costs 
                            transactions={transactions} 
                            addTransaction={addTransaction}
                            updateTransaction={updateTransaction}
                            deleteTransaction={deleteTransaction} 
                        />;
            case 'service-orders':
                return <ServiceOrders 
                            services={services} 
                            serviceOrders={serviceOrders}
                            onAddServiceOrder={addServiceOrder}
                            onUpdateServiceOrder={updateServiceOrder}
                            onDeleteServiceOrder={deleteServiceOrder}
                            onToggleStatus={toggleServiceOrderStatus}
                            setActivePage={setActivePage}
                        />;
            case 'products':
                return <Products 
                            products={products}
                            ticketSales={ticketSales}
                            onAddProduct={addProduct}
                            onUpdateProduct={(p) => updateProduct(p)} // Match signature
                            onDeleteProduct={deleteProduct} 
                        />;
            case 'services':
                return <Services 
                            services={services} 
                            onAddService={addService}
                            onUpdateService={updateService}
                            onDeleteService={deleteService}
                        />;
            case 'customers':
                return <Customers
                            customers={customers}
                            ticketSales={ticketSales}
                            serviceOrders={serviceOrders}
                            onAddCustomer={handleAddCustomer}
                            onUpdateCustomer={handleUpdateCustomer}
                            onDeleteCustomer={handleDeleteCustomer}
                        />;
            case 'suppliers':
                return <Suppliers
                            suppliers={suppliers}
                            onAddSupplier={handleAddSupplier}
                            onUpdateSupplier={handleUpdateSupplier}
                            onDeleteSupplier={handleDeleteSupplier}
                        />;
            case 'users':
                return <Users
                            users={users}
                            onAddUser={handleAddUser}
                            onUpdateUser={handleUpdateUser}
                            onDeleteUser={handleDeleteUser}
                        />;
            case 'profile':
                return <Profile onUpdateProfile={handleUpdateProfile} />;
            default:
                return <Dashboard transactions={transactions} ticketSales={ticketSales} products={products} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            <Sidebar activePage={activePage} setActivePage={setActivePage} />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default Layout;
