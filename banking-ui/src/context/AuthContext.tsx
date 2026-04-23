import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthState {
  token: string | null;
  username: string | null;
  userId: number | null;
  sessionId: string | null;
}

interface AuthContextType extends AuthState {
  setAuth: (auth: AuthState) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(() => {
    const stored = localStorage.getItem('javabank_auth');
    if (stored) {
      return JSON.parse(stored);
    }
    return { token: null, username: null, userId: null, sessionId: null };
  });

  useEffect(() => {
    if (auth.token) {
      localStorage.setItem('javabank_auth', JSON.stringify(auth));
    } else {
      localStorage.removeItem('javabank_auth');
    }
  }, [auth]);

  const setAuth = (newAuth: AuthState) => {
    setAuthState(newAuth);
  };

  const logout = () => {
    setAuthState({ token: null, username: null, userId: null, sessionId: null });
    localStorage.removeItem('javabank_auth');
  };

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        setAuth,
        logout,
        isAuthenticated: !!auth.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
