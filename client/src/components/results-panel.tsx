import { useState } from "react";
import { 
  Table as TableIcon, 
  Download, 
  FileSpreadsheet, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportToCSV } from "@/lib/sql-executor";
import { useToast } from "@/hooks/use-toast";

interface ResultsPanelProps {
  results: any;
  isLoading: boolean;
}

export default function ResultsPanel({ results, isLoading }: ResultsPanelProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = async () => {
    if (!results?.data || !results?.columns) {
      toast({
        title: "No data to export",
        description: "Execute a query first to generate results",
        variant: "destructive",
      });
      return;
    }

    try {
      await exportToCSV(results.data, results.columns);
      toast({
        title: "Export successful",
        description: "CSV file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export CSV file",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    toast({
      title: "Excel export not implemented",
      description: "CSV export is available instead",
      variant: "destructive",
    });
  };

  const sortedData = results?.data ? [...results.data].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  return (
    <div className="border-t border-border bg-card" style={{ height: '45%' }} data-testid="results-panel">
      <div className="h-full flex flex-col">
        {/* Results Toolbar */}
        <div className="bg-secondary/30 border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TableIcon className="text-emerald-400 text-sm" />
              <span className="text-sm font-medium">Query Results</span>
              {results && (
                <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs" data-testid="text-row-count">
                  {results.rowCount} rows
                </span>
              )}
            </div>
            {results && (
              <div className="text-sm text-muted-foreground" data-testid="text-execution-time">
                Executed in {results.executionTime}ms
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              disabled={!results?.data}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              data-testid="button-export-csv"
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={!results?.data}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Export Excel
            </Button>
            <Button
              variant="secondary"
              size="icon"
              data-testid="button-refresh-results"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Data Grid */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32" data-testid="loading-results">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Executing query...</span>
            </div>
          ) : results?.data && results.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {results.columns.map((column: any) => (
                    <TableHead 
                      key={column.name}
                      className="cursor-pointer hover:bg-secondary/70 transition-colors"
                      onClick={() => handleSort(column.name)}
                      data-testid={`column-header-${column.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.name}</span>
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.slice(0, 50).map((row: any, index: number) => (
                  <TableRow key={index} className="hover:bg-secondary/30" data-testid={`row-${index}`}>
                    {results.columns.map((column: any) => (
                      <TableCell key={column.name} data-testid={`cell-${index}-${column.name}`}>
                        {row[column.name] !== null && row[column.name] !== undefined 
                          ? String(row[column.name]) 
                          : <span className="text-muted-foreground italic">null</span>
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : results === null ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground" data-testid="no-results">
              <TableIcon className="h-8 w-8 mr-2 opacity-50" />
              <span>Execute a query to see results</span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground" data-testid="empty-results">
              <TableIcon className="h-8 w-8 mr-2 opacity-50" />
              <span>No results returned</span>
            </div>
          )}
        </ScrollArea>
        
        {/* Results Footer */}
        {results?.data && results.data.length > 0 && (
          <div className="bg-secondary/30 border-t border-border px-4 py-2 flex items-center justify-between text-sm">
            <div className="text-muted-foreground" data-testid="pagination-info">
              Showing 1-{Math.min(50, results.data.length)} of {results.rowCount} results
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" data-testid="button-previous-page">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">1</span>
              <Button variant="secondary" size="sm" data-testid="button-next-page">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
