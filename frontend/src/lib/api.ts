/**
 * API client for backend communication
 * Handles all HTTP requests to the backend API with JWT authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/api/${API_VERSION}`;
  }

  /**
   * Get auth token from storage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Make an authenticated request with JWT token
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Handle 401 - unauthorized (token expired or invalid)
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      // Redirect to login if we're in browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Authentication required. Please login again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * Agent endpoints
   */
  agents = {
    list: () => this.request<{ agents: any[]; total: number }>('/agents'),
    
    getById: (id: string) =>
      this.request<{ agent: any; status: any; recent_activity: any[] }>(
        `/agents/${id}`
      ),
    
    start: (id: string, loopIntervalSeconds?: number) =>
      this.request<{ message: string; agent_id: string }>(
        `/agents/${id}/start`,
        {
          method: 'POST',
          body: JSON.stringify({ loopIntervalSeconds }),
        }
      ),
    
    stop: (id: string) =>
      this.request<{ message: string; agent_id: string }>(`/agents/${id}/stop`, {
        method: 'POST',
      }),
    
    getActivity: (id: string, limit?: number) =>
      this.request<{
        agent_id: string;
        status: any;
        activity: any[];
        total: number;
      }>(`/agents/${id}/activity?limit=${limit || 50}`),
    
    getStatus: (id: string) =>
      this.request<{
        agent_id: string;
        runtime_status: any;
        database_status: any;
      }>(`/agents/${id}/status`),
    
    getRunning: () =>
      this.request<{ running_agents: any[]; total: number }>('/agents/running'),
    
    stopAll: () =>
      this.request<{ message: string }>('/agents/stop-all', {
        method: 'POST',
      }),
  };

  /**
   * Intent endpoints
   */
  intents = {
    list: (params?: {
      agentId?: string;
      status?: string;
      chainId?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.agentId) query.set('agentId', params.agentId);
      if (params?.status) query.set('status', params.status);
      if (params?.chainId) query.set('chainId', params.chainId);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());

      const queryString = query.toString();
      return this.request<{
        intents: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`/intents${queryString ? `?${queryString}` : ''}`);
    },

    getById: (id: string) =>
      this.request<{ intent: any; timeline: any[] }>(`/intents/${id}`),

    create: (data: {
      agentId: string;
      srcChainId: number;
      destChainId: number;
      action: string;
      params: any;
      expiry?: number;
      signature?: string;
    }) =>
      this.request<{ intent: any; message: string }>('/intents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    submit: (id: string, relayerAddress: string) =>
      this.request<{ intent: any; message: string }>(`/intents/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ relayerAddress }),
      }),

    execute: (id: string, txHash?: string, executionData?: any) =>
      this.request<{ intent: any; message: string }>(`/intents/${id}/execute`, {
        method: 'POST',
        body: JSON.stringify({ txHash, executionData }),
      }),

    getByAgent: (agentId: string, params?: { page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());

      const queryString = query.toString();
      return this.request<{
        agent: { agent_id: string; name: string };
        intents: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`/intents/agent/${agentId}${queryString ? `?${queryString}` : ''}`);
    },

    dispute: (id: string, reason: string) =>
      this.request<{ intent: any; message: string }>(`/intents/${id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  };

  /**
   * Audit endpoints
   */
  audit = {
    getByAgentId: (agentId: string) =>
      this.request<{ entries: any[] }>(`/audit/${agentId}`),
    
    export: (agentId: string) =>
      this.request<any>(`/audit/${agentId}/export`),
  };

  /**
   * Health check
   */
  health = {
    check: () => this.request<{ status: string; timestamp: string }>('/health'),
  };
}

export const api = new ApiClient();
export default api;
