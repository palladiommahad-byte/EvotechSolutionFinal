/**
 * API Client
 * HTTP client wrapper for communicating with the Express backend
 * Replaces the Supabase client
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Token management
const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
};

const setToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
    }
};

const removeToken = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('isAuthenticated');
    }
};

// API Error class
export class ApiError extends Error {
    status: number;
    data: any;

    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Generic request function
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 204 No Content
        if (response.status === 204) {
            return undefined as T;
        }

        // A reverse proxy can return an HTML error page (for example, while a
        // database restore is still running). Read the body first so that this
        // situation produces a useful application error instead of a JSON
        // parser exception such as "Unexpected token '<'".
        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';
        let data: any = undefined;

        if (responseText.trim()) {
            const looksLikeJson = contentType.includes('application/json')
                || /^[{\[]/.test(responseText.trim());

            if (looksLikeJson) {
                try {
                    data = JSON.parse(responseText);
                } catch {
                    if (response.ok) {
                        throw new ApiError(
                            'The server returned an invalid response. Please try again.',
                            response.status
                        );
                    }
                }
            }
        }

        if (!response.ok) {
            // Handle 401 Unauthorized - clear token and redirect
            if (response.status === 401) {
                removeToken();
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }

            const timeoutMessage = response.status === 504
                ? 'The operation is taking longer than expected. It may still be finishing; wait a moment and refresh the page.'
                : 'The server returned an unexpected response. Please try again.';

            throw new ApiError(
                data?.message || data?.error || timeoutMessage,
                response.status,
                data
            );
        }

        if (data === undefined) {
            throw new ApiError(
                'The server returned an unexpected response. Please try again.',
                response.status
            );
        }

        return data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        // Network or other errors
        throw new ApiError(
            error instanceof Error ? error.message : 'Network error',
            0
        );
    }
}

// API client object
export const apiClient = {
    // GET request
    get: <T>(endpoint: string): Promise<T> => {
        return request<T>(endpoint, { method: 'GET' });
    },

    // POST request
    post: <T>(endpoint: string, data?: any): Promise<T> => {
        return request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    // PUT request
    put: <T>(endpoint: string, data?: any): Promise<T> => {
        return request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    // PATCH request
    patch: <T>(endpoint: string, data?: any): Promise<T> => {
        return request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    // DELETE request
    delete: <T>(endpoint: string): Promise<T> => {
        return request<T>(endpoint, { method: 'DELETE' });
    },

    // Auth helpers
    auth: {
        login: async (email: string, password: string) => {
            const response = await request<{ token: string; user: any }>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (response.token) {
                setToken(response.token);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('auth_user', JSON.stringify(response.user));
                    localStorage.setItem('isAuthenticated', 'true');
                }
            }

            return response;
        },

        logout: () => {
            removeToken();
        },

        getToken,
        setToken,
        removeToken,

        getCurrentUser: async () => {
            try {
                return await request<any>('/auth/me', { method: 'GET' });
            } catch {
                return null;
            }
        },
    },
};

// Export for convenience
export default apiClient;
