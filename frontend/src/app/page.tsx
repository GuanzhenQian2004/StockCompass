'use client';

import { useEffect, useState } from 'react';
import { fetchStockData } from '@/lib/api';
import Image from 'next/image';

interface StockData {
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  pct_change: number;
}

export default function Home() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('AAPL');

  useEffect(() => {
    const loadStockData = async () => {
      try {
        setLoading(true);
        const data = await fetchStockData(symbol);
        setStockData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadStockData();
  }, [symbol]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Stock Compass
          </h1>
          <div className="flex gap-4 items-center">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter stock symbol..."
            />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        {!loading && !error && stockData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {symbol} Stock Data
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="px-4 py-2">Timestamp</th>
                    <th className="px-4 py-2">Open</th>
                    <th className="px-4 py-2">High</th>
                    <th className="px-4 py-2">Low</th>
                    <th className="px-4 py-2">Close</th>
                    <th className="px-4 py-2">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((data, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="px-4 py-2">{new Date(data.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2">${data.open_price.toFixed(2)}</td>
                      <td className="px-4 py-2">${data.high_price.toFixed(2)}</td>
                      <td className="px-4 py-2">${data.low_price.toFixed(2)}</td>
                      <td className="px-4 py-2">${data.close_price.toFixed(2)}</td>
                      <td className={`px-4 py-2 ${data.pct_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {data.pct_change.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
