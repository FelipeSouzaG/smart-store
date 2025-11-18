import { API_BASE_URL } from '../config';
import type { KPIs } from '../types';

const getManagementInsights = async (kpis: KPIs): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kpis }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to fetch insights from backend.'
      );
    }

    const data = await response.json();
    return data.insights;
  } catch (error) {
    console.error('Error fetching insights from backend API:', error);
    return 'Não foi possível gerar os insights de IA no momento. Verifique se o servidor backend está em execução.';
  }
};

export default getManagementInsights;
