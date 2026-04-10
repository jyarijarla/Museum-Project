import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Giftshop.css'
import { useAuth } from '../../src/AuthContext.jsx'
import { useCart } from '../../src/CartContext.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'

// Product image map keyed by ProductID.
// Falls back to a category-based lookup, then a generic museum image.
const PRODUCT_IMAGES = {
  5:  'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&auto=format&fit=crop&q=80', // toy / plush
  6:  'https://www.chickychickyblingbling.com/cdn/shop/products/PlushTurtleToy_24c5a16f-1695-4ba4-ad9f-e66bba3f379c-256247.jpg?v=1677144907&width=750', // sea turtle
  8:  'https://i.etsystatic.com/19283971/r/il/02a192/3996891131/il_1140xN.3996891131_dq6i.jpg', // windmill
  9:  'https://spacecurios.com/cdn/shop/products/product-image-894795600_1024x1024@2x.jpg?v=1626725211', // solar system model
  10: 'https://res.cloudinary.com/forallpromos/image/fetch/f_auto/v1631031462/https://www.4allpromos.com/sites/default/files/imagecache/720x720/candypress/ProdImages/large/159-LSC-AS08.jpg', // model atom
  11: 'https://woodencaterpillar.com/2223-tm_large_default/handcrafted-wooden-mummy-toy-timeless-halloween-ancient-egypt-decor.jpg', // toy mummy
  12: 'https://i5.walmartimages.com/seo/HABA-Little-Friends-Baby-Elephant-3-Chunky-Plastic-Zoo-Animal-Toy-Figure_3e101908-e9c2-4fc7-9167-87a26663cded.cd864cd4ccc4e0a695c3cd11a52f33d9.jpeg?odnHeight=2000&odnWidth=2000&odnBg=FFFFFF', // elephant
  13: 'https://i.ebayimg.com/images/g/YOAAAOSw2GdjDSrQ/s-l1600.webp', // lion
  14: 'https://westontable.com/cdn/shop/products/Heirloom-Wooden-Rocket-Ship-with-Astronaut-Blue-Weston-Table-SP.jpg?v=1762444861&width=2048', // rocketship
  15: 'https://www.crystalgalleryelpaso.com/cdn/shop/files/IMG_0708.png?v=1685481102&width=823', // crystal growing kit
  16: 'https://i.ebayimg.com/images/g/ERkAAeSwB5Jodaem/s-l1600.webp', // galileo thermometer
  17: 'https://faoschwarz.com/cdn/shop/files/Lightning-Plasma-Ball-STEM-24751695495255.jpg?v=1773098042&width=700', // plasma ball
  18: 'https://cdn.store-assets.com/s/888660/i/97943888.jpeg?width=1024&format=webp', // rosetta stone
  19: 'https://shop.getty.edu/cdn/shop/files/CGA_01_obv_5000x.jpg?v=1686269469', // roman coin set
  20: 'https://bellfordtoysandhobbies.com/cdn/shop/products/B028L06.jpg?v=1674402065&width=500', // viking longship
  21: 'https://shop.amnh.org/cdn/shop/files/a_night_tote.jpg?v=1772217743&width=1080', // museum tote bag
  22: 'https://www.raygunsite.com/cdn/shop/products/ProudMuseumPersonFoldedRAYGUN_1000x.jpg?v=1762457654', // t-shirt
  23: 'https://cdn11.bigcommerce.com/s-dl22izwaan/images/stencil/1280w/products/1037/8465/apiswaavb__54096.1625592447.jpg?c=1', // dinosaur skeleton pin
  24: 'https://i.guim.co.uk/img/media/326b5496b83e92075c340306de049afa7a29650f/0_764_2578_2409/master/2578.jpg?width=620&dpr=1&s=none&crop=none', // newton's cradle
  25: 'https://i.etsystatic.com/10090233/r/il/e15405/6776436275/il_794xN.6776436275_pjzp.jpg', // egyptian papyrus art
}

// Generic fallback image if a ProductID isn't in the map above
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&auto=format&fit=crop&q=80'

export default function Giftshop(){
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayName = user?.Username || user?.username || null
  const handleLogout = ()=>{ logout(); navigate('/') }

  const [products, setProducts] = useState([])
  const { addItem } = useCart()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(()=>{
    const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '')
    const url = `${apiBase}/api/products`
    console.debug('[Giftshop] fetching products from', url)
    fetch(url).then(async r=>{
      const text = await r.text()
      try {
        const js = JSON.parse(text)
        if(js && js.products) setProducts(js.products)
        else setProducts([])
      } catch (parseErr) {
        console.error('[Giftshop] products fetch returned non-JSON', { status: r.status, url, contentType: r.headers.get('content-type'), bodyStart: text.slice(0,800) })
        setProducts([])
      }
    }).catch(e=>{
      console.error('[Giftshop] Failed to load products', e)
      setProducts([])
    })
  },[])

  const onAdd = (it)=>{
    if(!user){
      navigate('/login')
      return
    }
    const price = Number(it.RetailPrice || it.price || 0)
    addItem({ id: it.ProductID || it.id, type: 'product', title: it.Name || it.title, price, desc: it.Description || it.desc })
    const title = it.Name || it.title || 'Item'
    if (toastTimer.current) clearTimeout(toastTimer.current)
    const tObj = { id: Date.now(), text: `${title} added to cart` }
    setToast(tObj)
    toastTimer.current = setTimeout(()=>{
      setToast(null)
      toastTimer.current = null
    }, 2200)
  }

  return (
    <div className="home-root gift-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/tickets">Tickets</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          {user ? (
            <div style={{marginRight:8}}><ProfileMenu/></div>
          ) : (
            <Link className="btn-login" to="/login">Login</Link>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="gift-hero">
        <div className="gift-hero-content">
          <div className="section-eyebrow">Museum Store</div>
          <h1 className="hero-title">Gift Shop</h1>
          <p className="hero-sub">Take a piece of the museum home — curated prints, replicas, books, and more.</p>
        </div>
        <div className="gift-hero-img">
          <img
            src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=700&auto=format&fit=crop&q=80"
            alt="Museum gift shop"
            onError={(e)=>{ e.target.style.display='none' }}
          />
        </div>
      </section>

      {/* ── Products ── */}
      <main className="gift-main">
        {products.length === 0 ? (
          <div className="gift-empty">
            <span className="gift-empty-icon">🛍️</span>
            <p>No products available right now — check back soon!</p>
          </div>
        ) : (
          <div className="gift-grid">
            {products.map((it) => {
              const imgSrc = PRODUCT_IMAGES[it.ProductID] || FALLBACK_IMAGE
              return (
                <article key={it.ProductID} className="gift-card">
                  <div className="gift-image">
                    <img
                      src={imgSrc}
                      alt={it.Name}
                      className="gift-image-photo"
                      onError={(e)=>{
                        // If Unsplash fails, swap to a reliable placeholder
                        e.target.src = `https://placehold.co/400x200/e2e8f0/64748b?text=${encodeURIComponent(it.Name)}`
                        e.target.onerror = null
                      }}
                    />
                  </div>
                  <div className="gift-details">
                    <h3 className="gift-name">{it.Name}</h3>
                    {/* <p className="gift-desc">{it.Description}</p> */}
                  </div>
                  <div className="gift-footer">
                    <span className="gift-price">${Number(it.RetailPrice).toFixed(2)}</span>
                    <button className="gift-add-btn" onClick={()=> onAdd(it)}>
                      + Add to cart
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* ── Toast ── */}
      {toast ? (
        <div className="gift-toast" role="status" key={toast.id}>
          <span className="gift-toast-icon">✓</span>
          {toast.text}
          <div className="gift-toast-bar" aria-hidden="true" />
        </div>
      ) : null}

      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">City Museum</div>
          <div className="footer-copy">© {new Date().getFullYear()} City Museum — All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}