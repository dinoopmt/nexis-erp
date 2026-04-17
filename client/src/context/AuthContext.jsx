import React, { createContext, useState, useContext, useEffect } from 'react'

const userContext = createContext();

const AuthContext = ({children}) => {

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state on mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");
        
        if (token && userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch (error) {
                console.error('Error parsing user from localStorage:', error);
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
        
        // Mark auth check as complete
        setIsLoading(false);
    }, []);

    const login = (user)=>{
        setUser(user)
    }

    const logout = ()=>{

        setUser(null)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
    }

  return (
    <userContext.Provider value={{user, login, logout, isLoading}}>
        {children}
    </userContext.Provider>
  )
}

export const useAuth = () =>useContext(userContext);

export default AuthContext


