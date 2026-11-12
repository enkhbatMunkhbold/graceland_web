import { createContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const UserContext = createContext(null)

export const UserProvider = ({ children }) => {
  const [ user, setUser ] = useState(null)
  const [ isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.checkSession()
    .then(setUser)
    .catch(error => {
      console.error("Error checking session:", error)
      setUser(null)
    })
    .finally(() => setIsLoading(false))
  }, [])

  const refreshUser = async() => {
    try {
      const userData = await api.checkSession()
      setUser(userData)
    } catch (error) {
      console.error("Failed to refresh user data:", error)
    }    
  }

  const value = {
    user,
    setUser,
    refreshUser,
    isLoading
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )  
}

export default UserContext
