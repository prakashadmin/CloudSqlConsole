import { useState, useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Table as TableIcon, 
  Download, 
  FileSpreadsheet, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreRows?: boolean;
}

export default function ResultsPanel({ 
  results, 
  isLoading, 
  isMaximized = false, 
  onToggleMaximize,
  onLoadMore,
  isLoadingMore = false,
  hasMoreRows = false 
}: ResultsPanelProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  
  const parentRef = useRef<HTMLDivElement>(null);

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

  // Pagination and virtualization setup
  const pageSize = isMaximized ? 100 : 50;
  const totalPages = results?.data ? Math.ceil(results.data.length / pageSize) : 0;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const sortedData = results?.data ? [...results.data].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  // Get current page data
  const currentPageData = sortedData.slice(startIndex, endIndex);

  // Virtualization for the current page
  const rowVirtualizer = useVirtualizer({
    count: currentPageData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35, // Estimated row height in pixels
    overscan: 10, // Render extra rows for smooth scrolling
  });

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Reset currentPage when results change or when toggling maximized mode
  useEffect(() => {
    setCurrentPage(1);
  }, [results, isMaximized]);

  // Reset Load More state when minimizing the view
  useEffect(() => {
    if (!isMaximized && hasMoreRows) {
      // When minimizing, we need to ensure load more state is reset
      // This is handled by the parent component
    }
  }, [isMaximized, hasMoreRows]);

  // Unified Virtualized Table Component
  const renderVirtualizedTable = () => (
    <div 
      ref={parentRef}
      className="h-full overflow-auto border border-border rounded-md"
      data-testid={`virtualized-table-container${isMaximized ? '-maximized' : ''}`}
    >
      {/* Table Header */}
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="flex">
          {results.columns.map((column: any) => (
            <div
              key={column.name}
              className={`flex-1 min-w-[200px] px-4 py-3 font-medium cursor-pointer hover:bg-secondary/70 transition-colors border-r border-border last:border-r-0 ${isMaximized ? 'text-base' : 'text-sm'}`}
              onClick={() => handleSort(column.name)}
              data-testid={`column-header${isMaximized ? '-maximized' : ''}-${column.name}`}
            >
              <div className="flex items-center gap-2">
                <span>{column.name}</span>
                <ArrowUpDown className={`text-muted-foreground ${isMaximized ? 'h-4 w-4' : 'h-3 w-3'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = currentPageData[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="flex hover:bg-secondary/30 transition-colors border-b border-border"
              data-testid={`row${isMaximized ? '-maximized' : ''}-${virtualRow.index}`}
            >
              {results.columns.map((column: any) => (
                <div
                  key={column.name}
                  className={`flex-1 min-w-[200px] px-4 py-2 border-r border-border last:border-r-0 flex items-center ${isMaximized ? 'text-sm' : 'text-sm'} overflow-hidden`}
                  data-testid={`cell${isMaximized ? '-maximized' : ''}-${virtualRow.index}-${column.name}`}
                >
                  <div className="truncate w-full" title={row[column.name] !== null && row[column.name] !== undefined ? String(row[column.name]) : 'null'}>
                    {row[column.name] !== null && row[column.name] !== undefined 
                      ? String(row[column.name]) 
                      : <span className="text-muted-foreground italic">null</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

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
          <div className="flex-1 p-4 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-32" data-testid="loading-results-maximized">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg text-muted-foreground">Executing query...</span>
              </div>
            ) : results?.data && results.data.length > 0 ? (
              renderVirtualizedTable()
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
          </div>
          
          {/* Maximized Results Footer with Load More */}
          {results?.data && results.data.length > 0 && (
            <div className="bg-secondary/30 border-t border-border px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-muted-foreground" data-testid="pagination-info-maximized">
                  Showing {startIndex + 1}-{Math.min(endIndex, results.data.length)} of {results.data.length} results
                  {results.rowCount !== results.data.length && (
                    <span className="ml-1">({results.rowCount} total from query)</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="secondary" 
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page-maximized"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="px-4 py-2 bg-primary text-primary-foreground rounded">
                    {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="secondary" 
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page-maximized"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Load More Button - Always visible when has more rows */}
              {hasMoreRows && onLoadMore && (
                <div className="flex justify-center">
                  <Button 
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
                    data-testid="button-load-more"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading more rows...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Load More Records
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* No more data message */}
              {!hasMoreRows && results?.hasMoreRows === false && (
                <div className="flex justify-center text-muted-foreground text-sm">
                  No more records to load
                </div>
              )}
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
          
          <div className="flex items-center gap-1 flex-wrap justify-end min-w-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleMaximize}
              className="px-2 py-1 flex-shrink-0 order-first"
              data-testid="button-maximize-results"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={!results?.data}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 flex-shrink-0"
              data-testid="button-export-csv"
            >
              <Download className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={!results?.data}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 flex-shrink-0"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="px-2 py-1 flex-shrink-0"
              data-testid="button-refresh-results"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Data Grid */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-32" data-testid="loading-results">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Executing query...</span>
            </div>
          ) : results?.data && results.data.length > 0 ? (
            renderVirtualizedTable()
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
        </div>
        
        {/* Results Footer with Working Pagination */}
        {results?.data && results.data.length > 0 && (
          <div className="bg-secondary/30 border-t border-border px-4 py-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="text-muted-foreground" data-testid="pagination-info">
                Showing {startIndex + 1}-{Math.min(endIndex, results.data.length)} of {results.data.length} results
                {results.rowCount !== results.data.length && (
                  <span className="ml-1">({results.rowCount} total from query)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
                  {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Load More Button - Always visible when has more rows */}
            {hasMoreRows && onLoadMore && (
              <div className="flex justify-center">
                <Button 
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 text-sm"
                  data-testid="button-load-more"
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Loading more rows...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-2" />
                      Load More Records
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* No more data message */}
            {!hasMoreRows && results?.hasMoreRows === false && (
              <div className="flex justify-center text-muted-foreground text-xs">
                No more records to load
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
