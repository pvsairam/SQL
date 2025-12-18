import { apiRequest } from "./queryClient";

export interface FusionQueryRequest {
  fusionUrl: string;
  username: string;
  password: string;
  sql: string;
  rows: number;
}

export interface FusionQueryResponse {
  success: boolean;
  results?: any;
  rawXml?: string;
  executionTime?: number;
  error?: string;
  details?: string;
}

export const executeFusionQuery = async (data: FusionQueryRequest): Promise<FusionQueryResponse> => {
  const response = await apiRequest("POST", "/api/run-fusion-query", data);
  return await response.json();
};

export const testFusionConnection = async (connectionData: {
  fusionUrl: string;
  username: string;
  password: string;
}): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await apiRequest("POST", "/api/test-connection", connectionData);
  return await response.json();
};

export const getQueryHistory = async (username: string, limit?: number): Promise<any[]> => {
  const url = `/api/query-history/${username}${limit ? `?limit=${limit}` : ''}`;
  const response = await apiRequest("GET", url);
  return await response.json();
};
