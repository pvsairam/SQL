import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface QueryHistoryProps {
  username: string;
  onQuerySelect: (query: string) => void;
}

export default function QueryHistory({ username, onQuerySelect }: QueryHistoryProps) {
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/query-history', username],
    enabled: !!username,
    refetchInterval: false,
  });

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (!username) {
    return (
      <Card className="bg-fusion-dark border-fusion-gray">
        <CardHeader className="border-b border-fusion-gray">
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <Clock className="w-5 h-5 text-fusion-blue mr-2" />
            Recent Queries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-fusion-light-gray text-sm">Enter username to view query history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-fusion-dark border-fusion-gray">
      <CardHeader className="border-b border-fusion-gray">
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Clock className="w-5 h-5 text-fusion-blue mr-2" />
          Recent Queries
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center space-x-2 text-fusion-light-gray">
            <div className="w-4 h-4 loading-spinner" />
            <span className="text-sm">Loading history...</span>
          </div>
        ) : history.length === 0 ? (
          <p className="text-fusion-light-gray text-sm">No query history found</p>
        ) : (
          <div className="space-y-2">
            {history.map((item: any) => (
              <div
                key={item.id}
                onClick={() => onQuerySelect(item.sql)}
                className="p-3 bg-fusion-gray rounded-lg hover:bg-gray-600 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-300 font-mono truncate flex-1">
                    {item.sql.replace(/\s+/g, ' ').trim()}
                  </code>
                  <span className="text-xs text-fusion-light-gray ml-2">
                    {formatTimeAgo(item.executedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
