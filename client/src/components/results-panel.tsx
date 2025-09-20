import { useState } from "react";
import { 
  Table as TableIcon, 
  Download, 
  FileSpreadsheet, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportToCSV } from "@/lib/sql-executor";
import { useToast } from "@/hooks/use-toast";

interface ResultsPanelProps {
  results: any;
  isLoading: boolean;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export default function ResultsPanel({ results, isLoading, isMaximized = false, onToggleMaximize }: ResultsPanelProps) {
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

  // If maximized, render as full-screen overlay
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 bg-background" data-testid="results-panel-maximized">
        <div className="h-full flex flex-col">
          {/* Maximized Toolbar */}
          <div className="bg-secondary/30 border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TableIcon className="text-emerald-400 text-lg" />
                <span className="text-lg font-semibold">Query Results</span>
                {results && (
                  <span className="bg-primary/20 text-primary px-3 py-2 rounded text-sm" data-testid="text-row-count-maximized">
                    {results.rowCount} rows
                  </span>
                )}
              </div>
              {results && (
                <div className="text-sm text-muted-foreground" data-testid="text-execution-time-maximized">
                  Executed in {results.executionTime}ms
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExportCSV}
                disabled={!results?.data}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="button-export-csv-maximized"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={!results?.data}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-export-excel-maximized"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={onToggleMaximize}
                data-testid="button-restore-results"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Restore
              </Button>
            </div>
          </div>
          
          {/* Maximized Data Grid */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32" data-testid="loading-results-maximized">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg text-muted-foreground">Executing query...</span>
              </div>
            ) : results?.data && results.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {results.columns.map((column: any) => (
                      <TableHead 
                        key={column.name}
                        className="cursor-pointer hover:bg-secondary/70 transition-colors text-base"
                        onClick={() => handleSort(column.name)}
                        data-testid={`column-header-maximized-${column.name}`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{column.name}</span>
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.slice(0, 100).map((row: any, index: number) => (
                    <TableRow key={index} className="hover:bg-secondary/30" data-testid={`row-maximized-${index}`}>
                      {results.columns.map((column: any) => (
                        <TableCell key={column.name} className="text-sm" data-testid={`cell-maximized-${index}-${column.name}`}>
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
              <div className="flex items-center justify-center h-32 text-muted-foreground" data-testid="no-results-maximized">
                <TableIcon className="h-12 w-12 mr-3 opacity-50" />
                <span className="text-lg">Execute a query to see results</span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground" data-testid="empty-results-maximized">
                <TableIcon className="h-12 w-12 mr-3 opacity-50" />
                <span className="text-lg">No results returned</span>
              </div>
            )}
          </ScrollArea>
          
          {/* Maximized Results Footer with Enhanced Pagination */}
          {results?.data && results.data.length > 0 && (
            <div className="bg-secondary/30 border-t border-border px-6 py-4 flex items-center justify-between">
              <div className="text-muted-foreground" data-testid="pagination-info-maximized">
                Showing 1-{Math.min(100, results.data.length)} of {results.rowCount} results
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" data-testid="button-previous-page-maximized">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-4 py-2 bg-primary text-primary-foreground rounded">1</span>
                <Button variant="secondary" data-testid="button-next-page-maximized">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border-t border-border bg-card" data-testid="results-panel">
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
              onClick={onToggleMaximize}
              data-testid="button-maximize-results"
            >
              <Maximize2 className="h-3 w-3" />
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
