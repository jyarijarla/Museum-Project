import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [user, setUser] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('user')) } catch(e){ return null }
  })

  useEffect(()=>{
    if(user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  },[user])

  const login = (u)=> setUser(u)
  const logout = ()=> setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}

export default AuthContext
