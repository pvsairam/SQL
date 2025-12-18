import { useState, useEffect } from "react";
import { Link, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface ConnectionFormProps {
  connectionData: {
    fusionUrl: string;
    username: string;
    password: string;
  };
  onConnectionDataChange: (data: any) => void;
}

export default function ConnectionForm({ connectionData, onConnectionDataChange }: ConnectionFormProps) {
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved credentials
    const savedData = localStorage.getItem('fusionCredentials');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        onConnectionDataChange(parsed);
        setSaveCredentials(true);
      } catch (e) {
        console.error('Failed to parse saved credentials');
      }
    }
  }, [onConnectionDataChange]);

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...connectionData, [field]: value };
    onConnectionDataChange(newData);
    
    if (saveCredentials) {
      localStorage.setItem('fusionCredentials', JSON.stringify(newData));
    }
  };

  const handleSaveCredentialsChange = (checked: boolean) => {
    setSaveCredentials(checked);
    if (checked) {
      localStorage.setItem('fusionCredentials', JSON.stringify(connectionData));
    } else {
      localStorage.removeItem('fusionCredentials');
    }
  };

  const testConnection = async () => {
    if (!connectionData.fusionUrl || !connectionData.username || !connectionData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all connection fields",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    
    try {
      console.log('Testing connection to:', connectionData.fusionUrl);
      
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(connectionData),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Oracle Fusion Cloud",
        });
      } else {
        console.error('Connection failed:', data);
        toast({
          title: "Connection Failed",
          description: data.error || data.details || "Failed to connect to Fusion Cloud",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Network error occurred while testing connection",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Card className="bg-fusion-dark border-fusion-gray">
      <CardHeader className="border-b border-fusion-gray">
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Link className="w-5 h-5 text-fusion-blue mr-2" />
          Connection Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Connection Requirements:</p>
              <ul className="text-xs space-y-1 text-blue-200">
                <li>• Your Fusion instance must have the BI Publisher report: <code>/Custom/CidUtils/RunSQL.xdo</code></li>
                <li>• Your user must have access to execute BI Publisher reports</li>
                <li>• The Fusion instance must be accessible from this environment</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fusionUrl" className="text-sm text-fusion-light-gray">
            Fusion URL
          </Label>
          <Input
            id="fusionUrl"
            type="url"
            value={connectionData.fusionUrl}
            onChange={(e) => handleInputChange('fusionUrl', e.target.value)}
            placeholder="https://your-instance.oraclecloud.com"
            className="bg-fusion-gray border-gray-600 text-white placeholder-gray-400 focus:ring-fusion-blue focus:border-transparent"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm text-fusion-light-gray">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={connectionData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="your.username"
              className="bg-fusion-gray border-gray-600 text-white placeholder-gray-400 focus:ring-fusion-blue focus:border-transparent"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-fusion-light-gray">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={connectionData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="••••••••"
              className="bg-fusion-gray border-gray-600 text-white placeholder-gray-400 focus:ring-fusion-blue focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="saveCredentials"
              checked={saveCredentials}
              onCheckedChange={handleSaveCredentialsChange}
              className="border-gray-600 data-[state=checked]:bg-fusion-blue"
            />
            <Label htmlFor="saveCredentials" className="text-sm text-fusion-light-gray">
              Save credentials locally
            </Label>
          </div>
          <Button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="bg-fusion-blue hover:bg-blue-600 text-white"
          >
            {isTestingConnection ? (
              <div className="w-4 h-4 loading-spinner" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
