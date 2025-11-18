// This file is now used by both frontend and backend (in dev) for type consistency.

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
}

export interface User {
  id: string; // Changed to string for MongoDB _id
  name: string;
  email: string;
  role: UserRole;
}

export enum ProductCategory {
  CELLPHONE = 'Celular',
  ACCESSORY = 'Acessório de Celular',
  ELECTRONIC = 'Eletrônico',
  OTHER = 'Outro',
}

export enum ProductStatus {
  RUPTURA = 'Ruptura',
  RISCO = 'Risco',
  SEGURANCA = 'Segurança',
  EXCESSO = 'Excesso',
}

export interface Product {
  id: string; // Barcode
  barcode: string; // Explicit barcode field
  name: string; // Usually Brand + Model
  price: number;
  cost: number;
  stock: number;
  lastSold: Date | null;
  location?: string;
  category: ProductCategory;
  brand: string;
  model: string;
  requiresUniqueIdentifier: boolean;
}

export interface StockHistory {
  id: string;
  productId: string;
  timestamp: Date;
  user: string;
  change: number;
  oldStock: number;
  newStock: number;
  reason: string;
}

export enum ServiceBrand {
  APPLE = 'Apple',
  SAMSUNG = 'Samsung',
  MOTOROLA = 'Motorola',
  XIAOMI = 'Xiaomi',
  OTHER = 'Outra',
}

export interface Service {
  id: string;
  name: string; // This will be "Tipo de Serviço"
  brand: ServiceBrand;
  model: string;
  price: number;
  partCost: number;
  serviceCost: number;
  shippingCost: number;
}

export interface SaleItem {
  item: Product | Service;
  quantity: number;
  unitPrice: number; // The price at the time of sale
  type: 'product' | 'service';
  uniqueIdentifier?: string;
}

export interface Customer {
  id: string; // Phone number
  name: string;
  cnpjCpf?: string;
}

export interface TicketSale {
  id: string;
  items: SaleItem[];
  total: number;
  timestamp: Date;
  customerName: string;
  customerWhatsapp: string;
  customerId?: string; // Link to the customer record
  saleHour: number;
  userId: string;
  userName: string;
}

export enum TransactionStatus {
  PENDING = 'Pendente',
  PAID = 'Pago',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum TransactionCategory {
  RENT = 'Aluguel',
  WATER = 'Água',
  ELECTRICITY = 'Luz',
  INTERNET = 'Internet',
  TAXES = 'IPTU/Impostos',
  SALARY = 'Salário',
  PRODUCT_PURCHASE = 'Compra de Produto',
  SERVICE_REVENUE = 'Faturamento de Serviço',
  SALES_REVENUE = 'Faturamento de Venda',
  SERVICE_COST = 'Custo de Serviço',
  OTHER = 'Outros',
}

export interface CashTransaction {
  id: string;
  description: string;
  amount: number; // Always positive
  type: TransactionType;
  category: TransactionCategory;
  status: TransactionStatus;
  timestamp: Date;
  dueDate?: Date;
  serviceOrderId?: string; // Link to the service order
  purchaseId?: string;
  saleId?: string;
}

export enum ServiceOrderStatus {
  PENDING = 'Pendente',
  COMPLETED = 'Concluído',
}

export interface ServiceOrder {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  customerContact?: string;
  customerId?: string;
  customerCnpjCpf?: string;
  serviceId: string;
  serviceDescription: string;
  totalPrice: number; // Sale price from the selected Service
  totalCost: number; // Cost to pay technician, manually entered
  otherCosts: number;
  status: ServiceOrderStatus;
  createdAt: Date;
  completedAt?: Date;
}

export interface KpiGoals {
  predictedAvgMargin: number; // As a percentage, e.g., 40 for 40%
  netProfit: number;
  inventoryTurnoverGoal: number; // New goal for inventory turnover
}

export interface StockLevelSummary {
  ruptura: number;
  risco: number;
  seguranca: number;
  excesso: number;
}

export interface TopProduct {
  id: string;
  name: string;
  quantitySold: number;
  currentStock: number;
  turnoverRatio?: number;
}

export interface SalesPeak {
  date: string;
  total: number;
}

export interface KPIs {
  fixedCosts: number;
  currentRevenue: number;
  currentAvgContributionMargin: number;
  breakEvenPoint: number;
  currentNetProfit: number;
  totalRevenueGoal: number;
  progressPercentage: number;
  monthlyForecast: number;
  actualInventoryTurnover: number;
  projectedInventoryTurnover: number;
  goals: KpiGoals;
  stockLevelSummary: StockLevelSummary;
  top10SoldProducts: TopProduct[];
  lowestTurnoverProducts: TopProduct[];
  topSalesDays: SalesPeak[];
}

// Types for Purchase functionality
export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number; // Cost from the invoice
}

export enum PaymentMethod {
  PIX = 'Pix',
  CREDIT_CARD = 'Cartão de Crédito',
  BANK_TRANSFER = 'Transferência Bancária',
  CASH = 'Dinheiro',
  BANK_SLIP = 'Boleto Bancário',
}

export enum Bank {
  ITAU = 'Itaú',
  INTER = 'Inter',
  CAIXA = 'Caixa',
  OTHER = 'Outros',
}

export interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
}

export type PaymentDetails =
  | { method: PaymentMethod.PIX | PaymentMethod.CASH; paymentDate: Date }
  | {
      method: PaymentMethod.CREDIT_CARD | PaymentMethod.BANK_TRANSFER;
      bank: Bank;
      paymentDate: Date;
    }
  | { method: PaymentMethod.BANK_SLIP; installments: Installment[] };

export interface SupplierInfo {
  name: string;
  cnpjCpf: string;
  contactPerson: string;
  phone: string;
}

export interface PurchaseOrder {
  id: string;
  items: PurchaseItem[];
  freightCost: number;
  otherCost: number;
  totalCost: number;
  paymentDetails: PaymentDetails;
  createdAt: Date;
  supplierInfo: SupplierInfo;
  reference: string;
}

export interface Supplier {
  id: string; // CNPJ/CPF
  name: string;
  contactPerson?: string;
  phone: string;
}
