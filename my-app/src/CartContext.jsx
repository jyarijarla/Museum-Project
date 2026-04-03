import React, { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }){
  const [cart, setCart] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('cart')) || [] } catch(e){ return [] }
  })

  useEffect(()=>{ localStorage.setItem('cart', JSON.stringify(cart)) },[cart])

  const addItem = (item)=>{
    setCart(prev=>{
      const idx = prev.findIndex(i=>i.id===item.id && i.type===item.type)
      if(idx >= 0){
        const copy = [...prev]
        copy[idx] = { ...copy[idx], qty: (copy[idx].qty||1) + (item.qty||1) }
        return copy
      }
      return [...prev, { ...item, qty: item.qty || 1 }]
    })
  }

  const removeItem = (id,type)=> setCart(prev => prev.filter(i=> !(i.id===id && i.type===type)))
  const updateQty = (id,type,qty)=> setCart(prev=> prev.map(i=> i.id===id && i.type===type ? { ...i, qty } : i))
  const clearCart = ()=> setCart([])

  const total = cart.reduce((s,i)=> s + (Number(i.price||0) * (i.qty||1)), 0)

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(){ return useContext(CartContext) }

export default CartContext
