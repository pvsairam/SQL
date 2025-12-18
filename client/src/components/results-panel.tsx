import { useState } from "react";
import { BarChart3, Download, Copy, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface ResultsPanelProps {
  results: any;
  error: string | null;
  isExecuting: boolean;
}

export default function ResultsPanel({ results, error, isExecuting }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState("json");
  const { toast } = useToast();

  const copyXML = () => {
    if (results?.rawXml) {
      navigator.clipboard.writeText(results.rawXml);
      toast({
        title: "Copied",
        description: "Raw XML copied to clipboard",
      });
    }
  };

  const exportResults = () => {
    if (results?.results) {
      const dataStr = JSON.stringify(results.results, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fusion-query-results.json';
      link.click();
      URL.revokeObjectURL(url);
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
          <pre className="mt-4 text-xs bg-fusion-gray p-4 rounded text-left overflow-auto">
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

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-fusion-gray">
              {columns.map((column) => (
                <TableHead key={column} className="text-left py-3 px-4 font-medium text-fusion-light-gray">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any, index: number) => (
              <TableRow key={index} className="border-b border-fusion-gray/50 hover:bg-fusion-gray/30">
                {columns.map((column) => (
                  <TableCell key={column} className="py-3 px-4 text-gray-300">
                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="mt-4 flex items-center justify-between text-sm text-fusion-light-gray px-4 pb-4">
          <span>Showing {data.length} results</span>
          <div className="flex items-center space-x-2">
            <span>Query executed successfully</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-fusion-dark border-fusion-gray">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <BarChart3 className="w-5 h-5 text-fusion-blue mr-2" />
              Query Results
            </h2>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                isExecuting ? 'bg-yellow-500/20 text-yellow-400' :
                error ? 'bg-red-500/20 text-red-400' :
                results ? 'bg-green-500/20 text-green-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isExecuting ? 'bg-yellow-400' :
                  error ? 'bg-red-400' :
                  results ? 'bg-green-400' :
                  'bg-gray-400'
                }`} />
                <span className="text-sm">
                  {isExecuting ? 'Executing...' :
                   error ? 'Error' :
                   results ? 'Ready' :
                   'Ready'}
                </span>
              </div>
              {results && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportResults}
                  className="p-2 text-fusion-light-gray hover:text-white"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isExecuting && (
        <Card className="bg-fusion-dark border-fusion-gray">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="loading-spinner w-8 h-8" />
              <div className="text-center">
                <p className="text-white font-medium">Executing Query...</p>
                <p className="text-fusion-light-gray text-sm">Connecting to Oracle Fusion Cloud</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-red-500/10 border border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Query Error</h3>
                <p className="text-red-300 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && !isExecuting && (
        <Card className="bg-fusion-dark border-fusion-gray">
          <CardHeader className="border-b border-fusion-gray">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-fusion-gray p-1 rounded-lg">
                <TabsTrigger
                  value="json"
                  className="px-4 py-2 rounded-md data-[state=active]:bg-fusion-blue data-[state=active]:text-white text-fusion-light-gray"
                >
                  JSON Table
                </TabsTrigger>
                <TabsTrigger
                  value="xml"
                  className="px-4 py-2 rounded-md data-[state=active]:bg-fusion-blue data-[state=active]:text-white text-fusion-light-gray"
                >
                  Raw XML
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <TabsContent value="json" className="m-0">
            {renderTable()}
          </TabsContent>

          <TabsContent value="xml" className="m-0">
            <CardContent className="p-6">
              <div className="bg-fusion-darker rounded-lg border border-gray-600">
                <div className="p-4 border-b border-gray-600 flex items-center justify-between">
                  <span className="text-sm font-medium text-fusion-light-gray">Raw SOAP Response</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyXML}
                    className="p-1 text-fusion-light-gray hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                    {results.rawXml}
                  </pre>
                </div>
              </div>
            </CardContent>
          </TabsContent>
        </Card>
      )}
    </div>
  );
}
