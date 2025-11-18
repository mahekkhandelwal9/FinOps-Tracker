import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };

    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case 'SET_USER':
      localStorage.setItem('user', JSON.stringify(action.payload));
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'AUTH_ERROR':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      console.log('Auth init - token exists:', !!token, 'user exists:', !!userStr);

      if (token && userStr) {
        try {
          // Parse stored user data
          let storedUser;
          try {
            storedUser = JSON.parse(userStr);
          } catch (parseError) {
            console.error('Failed to parse stored user:', parseError);
            dispatch({ type: 'AUTH_ERROR', payload: 'Invalid session data' });
            return;
          }

          // Set user from localStorage immediately for faster UI
          dispatch({
            type: 'SET_USER',
            payload: storedUser,
          });

          // Verify token is still valid by fetching user profile with retry logic
          let retryCount = 0;
          const maxRetries = 2;

          while (retryCount <= maxRetries) {
            try {
              const response = await authAPI.getProfile();
              console.log('Profile verification successful:', response.data.user);

              // Update with fresh user data
              dispatch({
                type: 'SET_USER',
                payload: response.data.user,
              });
              break; // Success, exit retry loop
            } catch (error) {
              retryCount++;
              console.error(`Token validation attempt ${retryCount} failed:`, error);

              if (retryCount > maxRetries) {
                // All retries failed, clear auth state
                dispatch({
                  type: 'AUTH_ERROR',
                  payload: 'Session expired',
                });
              } else {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          dispatch({
            type: 'AUTH_ERROR',
            payload: 'Authentication failed',
          });
        }
      } else {
        console.log('No token or user found in localStorage');
        dispatch({
          type: 'SET_LOADING',
          payload: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      console.log('Attempting login with:', credentials.email);
      const response = await authAPI.login(credentials);
      console.log('Login successful:', response.data);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data,
      });

      return response.data;
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.response?.data?.error || 'Login failed',
      });
      throw error;
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (userData) => {
    try {
      await authAPI.updateProfile(userData);
      const updatedUser = { ...state.user, ...userData };
      dispatch({
        type: 'SET_USER',
        payload: updatedUser,
      });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (userData) => {
    dispatch({
      type: 'SET_USER',
      payload: userData,
    });
  };

  const value = {
    ...state,
    login,
    logout,
    register,
    updateProfile,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };