import { useState, useEffect, useCallback } from "react";
import { BarChart3, Download, Copy, AlertCircle, CheckCircle, Clock, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';

interface ResultsPanelBottomProps {
  results: any;
  error: string | null;
  isExecuting: boolean;
  queryExecutionTime?: number;
}

export default function ResultsPanelBottom({ results, error, isExecuting, queryExecutionTime }: ResultsPanelBottomProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [exportType, setExportType] = useState<"csv" | "excel" | "json" | "xml">("csv");
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);

  // Calculate pagination variables for the results
  const resultsArray = results?.results ? (Array.isArray(results.results) ? results.results : [results.results]) : [];
  const totalRows = resultsArray.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const { toast } = useToast();

  // Process table data when results change
  useEffect(() => {
    if (results?.results) {
      let data = results.results;
      if (data.results && Array.isArray(data.results)) {
        data = data.results;
      } else if (!Array.isArray(data)) {
        data = [data];
      }
      
      if (Array.isArray(data) && data.length > 0) {
        setTableData(data);
        setTableColumns(Object.keys(data[0]));
        setSelectedCell(null); // Reset selection when new data loads
      }
    }
  }, [results]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || tableData.length === 0 || tableColumns.length === 0) return;

    const { row, col } = selectedCell;
    let newRow = row;
    let newCol = col;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newRow = Math.max(0, row - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newRow = Math.min(tableData.length - 1, row + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newCol = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newCol = Math.min(tableColumns.length - 1, col + 1);
        break;
      case 'Home':
        e.preventDefault();
        if (e.ctrlKey) {
          newRow = 0;
          newCol = 0;
        } else {
          newCol = 0;
        }
        break;
      case 'End':
        e.preventDefault();
        if (e.ctrlKey) {
          newRow = tableData.length - 1;
          newCol = tableColumns.length - 1;
        } else {
          newCol = tableColumns.length - 1;
        }
        break;
      default:
        return;
    }

    setSelectedCell({ row: newRow, col: newCol });
    
    // Scroll to cell if needed
    const cellElement = document.getElementById(`cell-${newRow}-${newCol}`);
    if (cellElement) {
      cellElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [selectedCell, tableData, tableColumns]);

  // Add/remove keyboard event listener
  useEffect(() => {
    if (selectedCell) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedCell, handleKeyDown]);

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  const openExportDialog = (type: "csv" | "excel" | "json" | "xml") => {
    setExportType(type);
    setFilename(`fusion-query-results.${type === "excel" ? "xlsx" : type}`);
    setExportDialogOpen(true);
  };

  const executeExport = () => {
    if (!filename.trim()) {
      toast({
        title: "Error",
        description: "Please enter a filename",
        variant: "destructive"
      });
      return;
    }

    switch (exportType) {
      case "csv":
        exportToCSV(filename);
        break;
      case "excel":
        exportToExcel(filename);
        break;
      case "json":
        exportToJSON(filename);
        break;
      case "xml":
        exportToXML(filename);
        break;
    }
    
    setExportDialogOpen(false);
  };

  const exportToCSV = (customFilename?: string) => {
    if (!results?.results) return;
    
    let data = results.results;
    if (data.results && Array.isArray(data.results)) {
      data = data.results;
    } else if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    const csvContent = [
      columns.join(','), // header
      ...data.map((row: any) => columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) {
          return '""'; // Empty string for null/undefined
        }
        if (typeof value === 'object') {
          return '""'; // Empty string for complex objects
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = customFilename || 'fusion-query-results.csv';
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Data exported to CSV file",
    });
  };

  const exportToExcel = (customFilename?: string) => {
    if (!results?.results) return;
    
    let data = results.results;
    if (data.results && Array.isArray(data.results)) {
      data = data.results;
    } else if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) return;
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Query Results");
    
    // Save file
    XLSX.writeFile(wb, customFilename || 'fusion-query-results.xlsx');
    
    toast({
      title: "Export Complete",
      description: "Data exported to Excel file",
    });
  };

  const exportToJSON = (customFilename?: string) => {
    if (results?.results) {
      let data = results.results;
      if (data.results && Array.isArray(data.results)) {
        data = data.results;
      } else if (!Array.isArray(data)) {
        data = [data];
      }
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = customFilename || 'fusion-query-results.json';
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Data exported to JSON file",
      });
    }
  };

  const exportToXML = (customFilename?: string) => {
    if (results?.rawXml) {
      const dataBlob = new Blob([results.rawXml], { type: 'application/xml' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = customFilename || 'fusion-query-results.xml';
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Data exported to XML file",
      });
    }
  };

  const renderTable = () => {
    if (!results?.results) return null;

    let data = results.results;
    
    // Handle different response formats
    if (data.results && Array.isArray(data.results)) {
      data = data.results;
    } else if (Array.isArray(data)) {
      // data is already an array
    } else if (typeof data === 'object' && data !== null) {
      // Convert single object to array
      data = [data];
    } else {
      return (
        <div className="p-6 text-center text-fusion-light-gray">
          <p>No tabular data found in results</p>
          <pre className="mt-4 text-xs bg-fusion-gray p-4 rounded text-left overflow-auto max-h-64">
            {JSON.stringify(results.results, null, 2)}
          </pre>
        </div>
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="p-6 text-center text-fusion-light-gray">
          <p>No data returned from query</p>
        </div>
      );
    }

    const columns = Object.keys(data[0] || {});
    
    // Use paginated data for rendering
    const paginatedData = data.slice(startIndex, endIndex);
    
    // Calculate optimal column widths based on content
    const columnWidths: { [key: string]: number } = {};
    columns.forEach(column => {
      // Get max content length for this column
      const headerLength = column.length;
      const maxContentLength = Math.max(...data.map(row => {
        const value = row[column];
        if (value === null || value === undefined) return 0;
        return String(value).length;
      }));
      
      // Set width based on content with better scaling
      const contentBasedWidth = Math.max(headerLength, maxContentLength) * 9 + 32;
      const calculatedWidth = Math.max(80, Math.min(400, contentBasedWidth));
      columnWidths[column] = calculatedWidth;
    });

    return (
      <div className="h-full flex flex-col">
        <div 
          className="flex-1 fixed-table-wrapper results-table-container"
          style={{ 
            position: 'relative',
            height: '600px', // Increased height to show more rows
            maxHeight: '100%',
            overflowX: 'scroll',
            overflowY: 'scroll'
          }}
        >
          <div style={{ 
            // Always force content to be taller than container for vertical scrolling
            height: `${Math.max(650, (paginatedData.length + 1) * 35 + 50)}px`,
            width: `${48 + Object.values(columnWidths).reduce((sum, w) => sum + w, 0)}px`,
            minWidth: '100%'
          }}>
            <Table className="fixed-data-table"
              style={{
                tableLayout: 'fixed',
                width: '100%'
              }}>
            <TableHeader className="table-header-container">
              <TableRow className="border-b-2 border-border dark:border-fusion-gray hover:bg-transparent">
                <TableHead className="text-left py-2 px-2 font-medium text-foreground dark:text-fusion-light-gray bg-gray-100 dark:bg-gray-700 sticky left-0 top-0 z-30 w-12 max-w-12 border-r-2 border-gray-400 dark:border-gray-500 shadow-md">
                  #
                </TableHead>
                {columns.map((column) => (
                  <TableHead 
                    key={column} 
                    className="frozen-column-header text-left py-2 px-3 font-medium text-foreground dark:text-fusion-light-gray whitespace-nowrap border-r border-border dark:border-fusion-gray overflow-hidden text-ellipsis bg-gray-50 dark:bg-slate-800/95"
                    style={{ 
                      width: `${columnWidths[column]}px`,
                      position: 'sticky',
                      top: '0px',
                      zIndex: 35,
                      background: 'rgba(248, 249, 250, 0.98)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row: any, rowIndex: number) => (
                <TableRow key={rowIndex} className="border-b border-border/20 dark:border-fusion-gray/20 hover:bg-muted/50 dark:hover:bg-fusion-gray/20">
                  <TableCell className="py-2 px-2 text-muted-foreground dark:text-fusion-light-gray text-sm sticky left-0 bg-gray-50 dark:bg-gray-800 border-r-2 border-gray-400 dark:border-gray-500 z-20 w-12 max-w-12 text-center shadow-md font-medium">
                    {startIndex + rowIndex + 1}
                  </TableCell>
                  {columns.map((column, colIndex) => {
                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                    return (
                      <TableCell 
                        key={column}
                        id={`cell-${rowIndex}-${colIndex}`}
                        className={`
                          py-2 px-3 text-sm whitespace-nowrap border-r border-border/20 dark:border-fusion-gray/20 cursor-pointer transition-colors overflow-hidden text-ellipsis
                          ${isSelected 
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-inset' 
                            : 'bg-background dark:bg-fusion-dark text-foreground dark:text-gray-200 hover:bg-muted/50 dark:hover:bg-fusion-gray/40'
                          }
                        `}
                        style={{ width: `${columnWidths[column]}px` }}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                          {(() => {
                            const value = row[column];
                            if (value === null || value === undefined) return '';
                            
                            // Handle Oracle BI Publisher nil values
                            if (typeof value === 'object' && value !== null) {
                              // Check if it's an Oracle nil object like {"@_xsi:nil":"true"}
                              if (value['@_xsi:nil'] === 'true' || value['@_xsi:nil'] === true) {
                                return '';
                              }
                              // Handle other object values
                              try {
                                return JSON.stringify(value);
                              } catch {
                                return '[Complex Object]';
                              }
                            }
                            
                            // Handle string values
                            const stringValue = String(value).trim();
                            return stringValue === '' ? '' : stringValue;
                          })()}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Navigation Instructions */}
        {selectedCell && (
          <div className="px-4 py-2 bg-muted dark:bg-slate-800 border-t border-border dark:border-fusion-gray text-xs text-muted-foreground dark:text-gray-300">
            <span className="font-medium text-primary dark:text-blue-400">Cell Selected:</span> Row {selectedCell.row + 1}, Column {columns[selectedCell.col]} | 
            <span className="ml-2 text-muted-foreground dark:text-gray-400">Use arrow keys to navigate • Home/End to jump • Ctrl+Home/End for corners</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-background dark:bg-fusion-dark border-t border-border dark:border-fusion-gray flex flex-col">
      {/* Status Bar */}
      <div className="bg-muted dark:bg-fusion-darker border-b border-border dark:border-fusion-gray px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isExecuting ? (
              <>
                <div className="w-4 h-4 loading-spinner" />
                <span className="text-sm text-yellow-400">Executing query...</span>
              </>
            ) : error ? (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Query failed</span>
              </>
            ) : results ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Query successful</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Ready</span>
              </>
            )}
          </div>
          
          {results && (
            <div className="flex items-center space-x-4 text-sm text-fusion-light-gray">
              <span>
                {Array.isArray(results.results) 
                  ? `${results.results.length} rows` 
                  : results.results?.results?.length 
                    ? `${results.results.results.length} rows`
                    : 'Data returned'}
              </span>
              {queryExecutionTime && (
                <span>Execution time: {queryExecutionTime}ms</span>
              )}
            </div>
          )}
        </div>
        

      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {isExecuting ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="loading-spinner w-8 h-8 mx-auto mb-4" />
              <p className="text-white font-medium">Executing Query</p>
              <p className="text-fusion-light-gray text-sm">Connecting to Oracle Fusion Cloud...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-400 font-medium mb-2">
                    {error.includes('Oracle Cloud Service Maintenance') ? 'Service Maintenance' : 'SQL Error'}
                  </h4>
                  <div className="space-y-2">
                    {error.split('\n').map((line, index) => {
                      // Check if this line contains Oracle error code
                      const isOracleError = line.match(/^ORA-\d+:/);
                      // Check if this line contains line number info
                      const isLineInfo = line.match(/^At line:/);
                      
                      return (
                        <div key={index} className={`text-sm ${
                          isOracleError 
                            ? 'text-red-300 font-mono bg-red-500/20 p-2 rounded border-l-4 border-red-400'
                            : isLineInfo
                              ? 'text-orange-300 font-medium'
                              : 'text-red-300'
                        }`}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Error help section */}
                  {error.includes('Oracle Cloud Service Maintenance') ? (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                      <div className="flex items-start space-x-2">
                        <div className="w-4 h-4 mt-0.5 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-xs text-white font-bold">i</span>
                        </div>
                        <div className="text-xs text-blue-300">
                          <p className="font-medium mb-1">Service Maintenance Information:</p>
                          <ul className="space-y-1 text-blue-200/80">
                            <li>• Oracle Cloud is performing scheduled maintenance</li>
                            <li>• Your SQL query is correct - the service is temporarily unavailable</li>
                            <li>• Try again in a few minutes once maintenance is complete</li>
                            <li>• No action needed on your side</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                      <div className="flex items-start space-x-2">
                        <div className="w-4 h-4 mt-0.5 rounded-full bg-yellow-500 flex items-center justify-center">
                          <span className="text-xs text-black font-bold">!</span>
                        </div>
                        <div className="text-xs text-yellow-300">
                          <p className="font-medium mb-1">Tips to fix SQL errors:</p>
                          <ul className="space-y-1 text-yellow-200/80">
                            <li>• Check for missing semicolons and correct table/column names</li>
                            <li>• Verify your SQL syntax matches Oracle SQL standards</li>
                            <li>• Ensure you have proper permissions for the tables accessed</li>
                            {error.includes('ORA-00942') && <li>• <strong>ORA-00942:</strong> Table or view does not exist - check spelling and permissions</li>}
                            {error.includes('ORA-00933') && <li>• <strong>ORA-00933:</strong> SQL command not properly ended - check syntax</li>}
                            {error.includes('ORA-00904') && <li>• <strong>ORA-00904:</strong> Invalid identifier - check column names</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : results ? (
          <div className="h-full flex flex-col">
            <div className="border-b border-fusion-gray px-4">
              <div className="bg-transparent h-auto p-0 flex items-center">
                <div className="px-4 py-2 bg-fusion-blue text-white border-b-2 border-fusion-blue">
                  Data Output
                </div>
                <div className="ml-3 py-2 flex items-center space-x-4">
                  {/* Pagination Controls */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-fusion-light-gray">Rows per page:</span>
                    <select 
                      value={rowsPerPage} 
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs border border-fusion-gray rounded bg-fusion-dark text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-7 px-2 text-xs bg-fusion-dark border-fusion-gray text-gray-200 hover:bg-fusion-gray disabled:opacity-50"
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-fusion-light-gray">
                        {startIndex + 1}-{Math.min(endIndex, totalRows)} of {totalRows}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-7 px-2 text-xs bg-fusion-dark border-fusion-gray text-gray-200 hover:bg-fusion-gray disabled:opacity-50"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-fusion-light-gray hover:text-white border border-fusion-gray/50 hover:border-fusion-gray"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export as
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-fusion-dark border-fusion-gray z-50" align="start" style={{ zIndex: 60 }}>
                      <DropdownMenuItem 
                        onClick={() => openExportDialog("csv")}
                        className="text-fusion-light-gray hover:text-white hover:bg-fusion-gray/30 cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openExportDialog("excel")}
                        className="text-fusion-light-gray hover:text-white hover:bg-fusion-gray/30 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openExportDialog("json")}
                        className="text-fusion-light-gray hover:text-white hover:bg-fusion-gray/30 cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openExportDialog("xml")}
                        className="text-fusion-light-gray hover:text-white hover:bg-fusion-gray/30 cursor-pointer"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        XML
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            
            <div className="flex-1 m-0">
              {renderTable()}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-fusion-light-gray">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-fusion-gray" />
              <p className="text-lg font-medium mb-2">Ready to Execute</p>
              <p className="text-sm">Select a connection and run a SQL query to see results here</p>
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="bg-fusion-darker border-fusion-gray text-white" aria-describedby="export-description">
          <DialogHeader>
            <DialogTitle className="text-white">
              Export as {exportType.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <p id="export-description" className="text-fusion-light-gray text-sm mb-4">
            Choose a filename for your {exportType} export. The file will be downloaded to your computer.
          </p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename" className="text-fusion-light-gray">
                File name
              </Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="bg-fusion-dark border-fusion-gray text-white"
                placeholder="Enter filename..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    executeExport();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => setExportDialogOpen(false)}
              className="text-fusion-light-gray hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={executeExport}
              className="bg-fusion-blue hover:bg-fusion-blue/80 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}