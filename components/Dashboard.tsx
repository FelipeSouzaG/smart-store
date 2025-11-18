import React, { useState, useMemo } from 'react';
import getManagementInsights from '../services/geminiService';
import type { KPIs, KpiGoals, CashTransaction, TicketSale, Product, StockLevelSummary, TopProduct, SalesPeak } from '../types';
import { TransactionCategory, TransactionType, TransactionStatus } from '../types';
import { formatCurrencyNumber } from '../validation';

const KpiCard: React.FC<{ title: string; value: string; note?: string; }> = ({ title, value, note }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between">
         <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
        {note && <p className="mt-2 text-xs text-gray-400">{note}</p>}
    </div>
);

const ProgressKpiCard: React.FC<{ title: string; mainValue: string; progress: number; note: string }> = ({ title, mainValue, progress, note }) => {
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between">
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{mainValue}</p>
                <p className="mt-1 text-xs text-gray-400">{note}</p>
            </div>
            <div className="mt-6 mb-2">
                 <div className="relative">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${clampedProgress < 50 ? 'bg-red-500' : clampedProgress < 90 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${clampedProgress}%` }}
                        />
                    </div>
                    {/* Scale Ticks */}
                    {Array.from({ length: 11 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-full h-1.5 w-px bg-gray-300 dark:bg-gray-500"
                            style={{ left: `${i * 10}%` }}
                        />
                    ))}
                    {/* Scale Labels (every 20%) */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <span
                            key={i}
                            className="absolute top-full mt-2 text-[10px] text-gray-400 -translate-x-1/2"
                            style={{ left: `${i * 20}%` }}
                        >
                            {i * 20}%
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};


const StockLevelCard: React.FC<{ title: string; summary: StockLevelSummary }> = ({ title, summary }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{title}</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
            <div>
                <p className="text-2xl font-bold text-red-500">{summary.ruptura}</p>
                <p className="text-xs text-gray-400">Ruptura</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-orange-500">{summary.risco}</p>
                <p className="text-xs text-gray-400">Risco</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-green-500">{summary.seguranca}</p>
                <p className="text-xs text-gray-400">Segurança</p>
            </div>
             <div>
                <p className="text-2xl font-bold text-yellow-500">{summary.excesso}</p>
                <p className="text-xs text-gray-400">Excesso</p>
            </div>
        </div>
        <p className="mt-4 text-xs text-center text-gray-400">Produtos por status de estoque</p>
    </div>
);


const GoalsModal: React.FC<{ currentGoals: KpiGoals, onSave: (newGoals: KpiGoals) => void, onClose: () => void }> = ({ currentGoals, onSave, onClose }) => {
    const [goals, setGoals] = useState(currentGoals);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setGoals(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(goals);
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Editar Metas Estratégicas</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Margem de Contribuição Prevista (%)</label>
                        <input type="number" name="predictedAvgMargin" value={goals.predictedAvgMargin} onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Objetivo de Lucro Líquido (R$)</label>
                        <input type="number" name="netProfit" value={goals.netProfit} onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Giro de Estoque Ideal (Meta)</label>
                        <input type="number" name="inventoryTurnoverGoal" value={goals.inventoryTurnoverGoal} onChange={handleChange} className="mt-1 block w-full rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm p-2"/>
                        <p className="text-xs text-gray-400 mt-1">Quantas vezes você espera vender seu estoque médio no mês.</p>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300">Cancelar</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Salvar Metas</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

interface DashboardProps {
    transactions: CashTransaction[];
    ticketSales: TicketSale[];
    products: Product[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, ticketSales, products }) => {
    const getCurrentCompetency = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    };

    const [competency, setCompetency] = useState<string>(getCurrentCompetency());
    const [goals, setGoals] = useState<KpiGoals>({ predictedAvgMargin: 40, netProfit: 5000, inventoryTurnoverGoal: 1.5 });
    const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
    const [insights, setInsights] = useState<string>('');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);

    const handleCompetencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompetency(e.target.value);
    };

    const { kpis, top10SoldProducts, top10LowestTurnoverProducts, top5SalesPeaks } = useMemo(() => {
        const [year, month] = competency.split('-').map(Number);
        
        // Create date range covering the entire month
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        const salesThisMonth = ticketSales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= startOfMonth && saleDate <= endOfMonth;
        });

        const transactionsThisMonth = transactions.filter(t => {
            const tDate = new Date(t.timestamp);
            return tDate >= startOfMonth && tDate <= endOfMonth;
        });
        
        // Determine if we are viewing the current month to adjust forecasts
        const now = new Date();
        const isCurrentMonth = now.getFullYear() === year && now.getMonth() === (month - 1);
        const daysInMonth = endOfMonth.getDate();
        const daysPassed = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;


        // Financial KPI Calculations
        const currentRevenue = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
        const fixedCostCategories = [TransactionCategory.RENT, TransactionCategory.SALARY, TransactionCategory.TAXES, TransactionCategory.INTERNET, TransactionCategory.WATER, TransactionCategory.ELECTRICITY, TransactionCategory.OTHER];
        const fixedCosts = transactionsThisMonth
            .filter(t => t.type === TransactionType.EXPENSE && fixedCostCategories.includes(t.category) && t.status === TransactionStatus.PAID)
            .reduce((sum, t) => sum + t.amount, 0);
        const variableCostOfProductsSold = salesThisMonth.reduce((cogs, sale) => cogs + sale.items.reduce((itemCost, saleItem) => saleItem.type === 'product' && 'cost' in saleItem.item ? itemCost + (saleItem.item.cost * saleItem.quantity) : itemCost, 0), 0);
        const variableCostOfServices = transactionsThisMonth.filter(t => t.category === TransactionCategory.SERVICE_COST && t.status === TransactionStatus.PAID).reduce((sum, t) => sum + t.amount, 0);
        const totalVariableCosts = variableCostOfProductsSold + variableCostOfServices;
        const currentAvgContributionMargin = currentRevenue > 0 ? ((currentRevenue - totalVariableCosts) / currentRevenue) * 100 : 0;
        const currentNetProfit = currentRevenue - totalVariableCosts - fixedCosts;
        const predictedMarginRatio = goals.predictedAvgMargin / 100;
        const breakEvenPoint = predictedMarginRatio > 0 ? fixedCosts / predictedMarginRatio : 0;
        const totalRevenueGoal = breakEvenPoint + goals.netProfit;
        const progressPercentage = totalRevenueGoal > 0 ? (currentRevenue / totalRevenueGoal) * 100 : 0;
        
        // Forecast logic: If current month, project linearly. If past, use actual.
        const monthlyForecast = daysPassed > 0 ? (currentRevenue / daysPassed) * daysInMonth : 0;

        // Inventory KPI Calculations
        const monthlyCOGS = variableCostOfProductsSold;
        const averageInventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
        const actualInventoryTurnover = averageInventoryValue > 0 ? monthlyCOGS / averageInventoryValue : 0;
        const projectedInventoryTurnover = averageInventoryValue > 0 && daysPassed > 0 ? (monthlyCOGS / averageInventoryValue) * (daysInMonth / daysPassed) : 0;

        // Top & Low performing products
        const productSalesMap = new Map<string, number>();
        salesThisMonth.forEach(sale => sale.items.forEach(item => {
            if (item.type === 'product') {
                productSalesMap.set(item.item.id, (productSalesMap.get(item.item.id) || 0) + item.quantity);
            }
        }));

        const top10SoldProducts: TopProduct[] = Array.from(productSalesMap.entries())
            .map(([productId, quantitySold]) => ({
                id: productId,
                name: products.find(p => p.id === productId)?.name || 'N/A',
                quantitySold,
                currentStock: products.find(p => p.id === productId)?.stock || 0,
            }))
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 10);
            
        const top10LowestTurnoverProducts: TopProduct[] = products
            .filter(p => p.stock > 0)
            .map(p => ({
                id: p.id,
                name: p.name,
                quantitySold: productSalesMap.get(p.id) || 0,
                currentStock: p.stock,
                turnoverRatio: (productSalesMap.get(p.id) || 0) / p.stock
            }))
            .sort((a,b) => a.turnoverRatio! - b.turnoverRatio!)
            .slice(0, 10);
            
        // Stock Level Summary
        const stockLevelSummary: StockLevelSummary = { ruptura: 0, risco: 0, seguranca: 0, excesso: 0 };
        products.forEach(p => {
            if (p.stock === 0) {
                stockLevelSummary.ruptura++;
                return;
            }
            const soldQty = productSalesMap.get(p.id) || 0;
            if (soldQty > 0) {
                const projectedMonthlySales = (soldQty / daysPassed) * daysInMonth;
                const dailySales = projectedMonthlySales / daysInMonth;
                const daysOfStock = p.stock / dailySales;
                if (daysOfStock <= 7) stockLevelSummary.risco++;
                else if (daysOfStock <= 30) stockLevelSummary.seguranca++;
                else stockLevelSummary.excesso++;
            } else {
                 stockLevelSummary.excesso++; // Products with stock but no sales are excess
            }
        });

        // Top Sales Peaks
        const salesByDay = new Map<string, number>();
        salesThisMonth.forEach(sale => {
            const day = new Date(sale.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            salesByDay.set(day, (salesByDay.get(day) || 0) + sale.total);
        });
        const top5SalesPeaks: SalesPeak[] = Array.from(salesByDay.entries())
            .map(([date, total]) => ({date, total}))
            .sort((a,b) => b.total - a.total)
            .slice(0, 5);


        const calculatedKpis: KPIs = { 
            fixedCosts, 
            currentRevenue, 
            currentAvgContributionMargin, 
            breakEvenPoint, 
            currentNetProfit, 
            totalRevenueGoal, 
            progressPercentage, 
            monthlyForecast, 
            goals,
            actualInventoryTurnover,
            projectedInventoryTurnover,
            stockLevelSummary,
            top10SoldProducts,
            lowestTurnoverProducts: top10LowestTurnoverProducts,
            topSalesDays: top5SalesPeaks,
        };
        
        return { kpis: calculatedKpis, top10SoldProducts, top10LowestTurnoverProducts, top5SalesPeaks };

    }, [transactions, ticketSales, goals, products, competency]);


    const handleGetInsights = async () => {
        if (!kpis) return;
        setIsLoadingInsights(true);
        setInsights('');
        try {
            const result = await getManagementInsights(kpis);
            setInsights(result);
        } catch (error) {
            setInsights('Ocorreu um erro ao buscar os insights.');
        } finally {
            setIsLoadingInsights(false);
        }
    };

    if (!kpis) {
        return <div>Carregando...</div>;
    }

    return (
        <div className="space-y-8">
            {isGoalsModalOpen && <GoalsModal currentGoals={goals} onSave={(newGoals) => { setGoals(newGoals); }} onClose={() => setIsGoalsModalOpen(false)}/>}
            
            <div className="flex justify-between items-center flex-wrap gap-4">
                 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                 <div className="flex items-center gap-2">
                    <label htmlFor="competency-picker" className="text-sm font-medium text-gray-700 dark:text-gray-300">Competência:</label>
                    <input 
                        type="month" 
                        id="competency-picker"
                        value={competency}
                        onChange={handleCompetencyChange}
                        className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                     <button onClick={() => setIsGoalsModalOpen(true)} className="ml-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                        Editar Metas
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <KpiCard title="Custos Fixos do Mês" value={`R$ ${formatCurrencyNumber(kpis.fixedCosts)}`} note="Soma das despesas fixas pagas" />
                 <KpiCard title="Margem de Contribuição" value={`${kpis.currentAvgContributionMargin.toFixed(2)}%`} note={`Previsto: ${kpis.goals.predictedAvgMargin}%`} />
                 <KpiCard title="Ponto de Equilíbrio" value={`R$ ${formatCurrencyNumber(kpis.breakEvenPoint)}`} note="Receita para cobrir custos fixos" />
                 <KpiCard title="Lucro Líquido" value={`R$ ${formatCurrencyNumber(kpis.currentNetProfit)}`} note={`Objetivo: R$ ${formatCurrencyNumber(kpis.goals.netProfit)}`} />
                 <KpiCard title="Projeção de Faturamento" value={`R$ ${formatCurrencyNumber(kpis.monthlyForecast)}`} note="Baseado no ritmo de vendas" />
                 <ProgressKpiCard 
                    title="Progresso da Meta de Faturamento" 
                    mainValue={`R$ ${formatCurrencyNumber(kpis.currentRevenue)}`}
                    progress={kpis.progressPercentage}
                    note={`Meta: R$ ${formatCurrencyNumber(kpis.totalRevenueGoal)} (${kpis.progressPercentage.toFixed(1)}%)`}
                />
                <ProgressKpiCard 
                    title="Progresso da Meta de Giro" 
                    mainValue={kpis.projectedInventoryTurnover.toFixed(2)}
                    progress={(kpis.projectedInventoryTurnover / kpis.goals.inventoryTurnoverGoal) * 100} 
                    note={`Giro Projetado | Meta: ${kpis.goals.inventoryTurnoverGoal.toFixed(2)}`} 
                />
                <StockLevelCard title="Nível de Estoque" summary={kpis.stockLevelSummary} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">Top 10 Produtos Mais Vendidos</h2>
                     <div className="space-y-3 max-h-96 overflow-y-auto">
                        {top10SoldProducts.length === 0 ? <p className="text-gray-500">Nenhuma venda de produto no período.</p> : top10SoldProducts.map((p, i) => (
                            <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center"><span className="text-sm font-bold w-8">{i + 1}.</span><div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-gray-400">Estoque: {p.currentStock}</p></div></div>
                                <p className="font-bold text-indigo-500">{p.quantitySold} <span className="font-normal text-xs">unid.</span></p>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">Top 10 Produtos Menor Giro</h2>
                     <div className="space-y-3 max-h-96 overflow-y-auto">
                        {top10LowestTurnoverProducts.length === 0 ? <p className="text-gray-500">Nenhum produto com estoque.</p> : top10LowestTurnoverProducts.map((p, i) => (
                             <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center"><span className="text-sm font-bold w-8">{i + 1}.</span><div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-gray-400">Vendidos: {p.quantitySold} | Estoque: {p.currentStock}</p></div></div>
                                <p className={`font-bold text-xs ${p.turnoverRatio! === 0 ? 'text-red-500' : 'text-yellow-500'}`}>Giro: {p.turnoverRatio!.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">Top 5 Picos de Venda</h2>
                     <div className="space-y-3 max-h-96 overflow-y-auto">
                        {top5SalesPeaks.length === 0 ? <p className="text-gray-500">Nenhuma venda no período.</p> : top5SalesPeaks.map((p, i) => (
                             <div key={p.date} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center"><span className="text-sm font-bold w-8">{i + 1}.</span><p className="font-medium text-sm">{p.date}</p></div>
                                <p className="font-bold text-green-500">R$ {formatCurrencyNumber(p.total)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Insights de Gestão com IA</h2>
                <button
                    onClick={handleGetInsights}
                    disabled={isLoadingInsights}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
                >
                    {isLoadingInsights ? 'Analisando...' : 'Gerar Análise Estratégica'}
                </button>
                {isLoadingInsights && <div className="mt-4 text-center">Analisando dados e gerando recomendações... 🧠</div>}
                {insights && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-gray-700 rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-200">
                           {insights}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
