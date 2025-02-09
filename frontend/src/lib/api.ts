// Define types for our stock data
interface StockData {
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  dividends: number;
  pct_change: number;
  free_cash_flow: number;
  eps: number;
  market_cap: number;
  pe: number;
}

interface NewsData {
  symbol: string;
  data: string; // This is JSON string that needs to be parsed
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchStockData(
  symbol: string = 'AAPL',
  period: string = '1d',
  interval: string = '60m'
): Promise<StockData[]> {
  try {
    const response = await fetch(
      `${API_URL}/api/stockdata/?stockname=${symbol}&period=${period}&interval=${interval}`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
}

export async function fetchNewsData(symbol: string = 'AAPL'): Promise<NewsData> {
  try {
    const response = await fetch(
      `${API_URL}/newsdata/?symbol=${symbol}`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching news data:', error);
    throw error;
  }
} 