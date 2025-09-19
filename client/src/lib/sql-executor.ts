import { apiRequest } from "./queryClient";

export interface QueryExecutionResult {
  data: any[];
  columns: Array<{ name: string; type: string }>;
  executionTime: number;
  rowCount: number;
}

export async function executeQuery(connectionId: string, query: string): Promise<QueryExecutionResult> {
  const response = await apiRequest('POST', '/api/query/execute', {
    connectionId,
    query,
  });
  
  return response.json();
}

export async function exportToCSV(data: any[], columns: Array<{ name: string; type: string }>): Promise<void> {
  const response = await apiRequest('POST', '/api/export/csv', {
    data,
    columns,
  });
  
  const blob = new Blob([await response.text()], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'query_results.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
