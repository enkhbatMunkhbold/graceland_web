import { createContext, useState, useEffect } from 'react'

const UserContext = createContext(null)

export const UserProvider = ({ children }) => {
  const [ user, setUser ] = useState(null)
  const [ isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/check_session", {
      credentials: 'include'
    })
    .then((r) => {
      if(r.ok) {
        return r.json().then(user => {
          setUser(user)
          setIsLoading(false)
        })
      } else if (r.status === 204 || r.status === 401) {
        setUser(null)
        setIsLoading(false)
      } else {
        throw new Error(`HTTP error! Status: ${r.status}`)
      }
    })
    .catch(error => {
      console.error("Error checking session:", error)
      setUser(null)
      setIsLoading(false)
    })
  }, [])

  const refreshUser = async() => {
    try {
      const response = await fetch("/check_session", {
        credentials: "include"
      })
      if(response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else if(response.status === 204 || response.status === 401) {
        setUser(null)
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }      
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