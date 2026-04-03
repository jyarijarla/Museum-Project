import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './Admin.css'
import ProfileMenu from '../components/ProfileMenu.jsx'

export default function Admin(){
  // dashboard metrics are mock data for the UI
  const metrics = {
    visitorsToday: 1234,
    ticketsSold: 312,
    revenue: 8420.50,
    members: 9821,
    ordersPending: 7,
    exhibitsActive: 12,
  }

  const recentOrders = new Array(12).fill(0).map((_,i)=>({
    id: 9000 + i,
    name: ['Museum Tote','Dino Plush','Space Poster','Membership Card','Poster Pack','Donation'][i%6],
    buyer: ['Alice','Ben','Carmen','Diego','Eve','Felix'][i%6],
    amountNum: ((i+1)*12.5),
    amount: ((i+1)*12.5).toFixed(2),
    status: ['Shipped','Pending','Processing','Pending','Completed','Processing'][i%6],
    date: new Date(Date.now() - (i * 86400000)).toISOString().slice(0,10),
    visitorType: (i % 3 === 0) ? 'Member' : 'Non-member',
    hour: 8 + (i % 12)
  }))

  // Orders report/filter state
  const [orderFilters, setOrderFilters] = useState({ status: 'All', min: '', max: '', visitorType: 'All', timeOfDay: 'All' })

  const filteredOrders = useMemo(()=>{
    return recentOrders.filter(o=>{
      if(orderFilters.status !== 'All' && o.status !== orderFilters.status) return false
      if(orderFilters.min !== '' && Number(orderFilters.min) > o.amountNum) return false
      if(orderFilters.max !== '' && Number(orderFilters.max) < o.amountNum) return false
      if(orderFilters.visitorType !== 'All' && o.visitorType !== orderFilters.visitorType) return false
      if(orderFilters.timeOfDay !== 'All'){
        const h = o.hour
        if(orderFilters.timeOfDay === 'Morning' && !(h >= 6 && h < 12)) return false
        if(orderFilters.timeOfDay === 'Afternoon' && !(h >= 12 && h < 18)) return false
        if(orderFilters.timeOfDay === 'Evening' && !(h >= 18 && h < 24)) return false
      }
      return true
    })
  },[orderFilters])

  const exportCSV = ()=>{
    const rows = [ ['Order','Item','Buyer','Amount','Status','Date'], ...filteredOrders.map(o=>[`#${o.id}`, o.name, o.buyer, `$${o.amount}`, o.status, o.date]) ]
    const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-report-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Large exhibit activity report state ---
  const exhibits = ['Main Hall','Space Wing','Ancient Gallery','Natural History','Temporary Exhibit']
  const [largeFilters, setLargeFilters] = useState({ from: new Date(Date.now()-14*86400000).toISOString().slice(0,10), to: new Date().toISOString().slice(0,10), exhibits: [], minVisitors:'', maxVisitors:'', groupBy:'date', visitorType:'All', timeOfDay:'All' })
  const [largeResults, setLargeResults] = useState([])

  const generateLargeReport = ()=>{
    // produce mock aggregated rows for selected exhibits and date range
    const selected = largeFilters.exhibits.length ? largeFilters.exhibits : exhibits
    const days = 7
    const rows = []
    for(let i=0;i<selected.length;i++){
      for(let d=0; d<days; d++){
        const visitors = Math.floor(50 + Math.random()*450)
        const vt = (i + d) % 3 === 0 ? 'Member' : 'Non-member'
        const hour = 6 + ((i+d) % 14)
        rows.push({ exhibit: selected[i], date: new Date(Date.now() - d*86400000).toISOString().slice(0,10), visitors, avgMinutes: Math.floor(20 + Math.random()*60), visitorType: vt, hour })
      }
    }
    // apply visitor filters
    const filtered = rows.filter(r=> (largeFilters.minVisitors === '' || r.visitors >= Number(largeFilters.minVisitors)) && (largeFilters.maxVisitors === '' || r.visitors <= Number(largeFilters.maxVisitors)) && (largeFilters.visitorType === 'All' || r.visitorType === largeFilters.visitorType) && (largeFilters.timeOfDay === 'All' || (largeFilters.timeOfDay === 'Morning' && r.hour>=6 && r.hour<12) || (largeFilters.timeOfDay === 'Afternoon' && r.hour>=12 && r.hour<18) || (largeFilters.timeOfDay === 'Evening' && r.hour>=18)))
    setLargeResults(filtered)
  }

  const exportLargeCSV = ()=>{
    const rows = [ ['Exhibit','Date','Visitors','AvgMinutes'], ...largeResults.map(r=> [r.exhibit, r.date, r.visitors, r.avgMinutes]) ]
    const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exhibit-report-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="home-root admin-root">
      <header className="home-header">
        <div className="brand"><Link to="/" className="brand-link">City Museum</Link></div>
        <nav>
          <Link className="nav-link" to="/">Home</Link>
          <Link className="nav-link" to="/exhibits">Exhibits</Link>
          <Link className="nav-link" to="/membership">Membership</Link>
          <Link className="nav-link" to="/giftshop">Gift Shop</Link>
          <div style={{marginLeft:12}}><ProfileMenu/></div>
        </nav>
      </header>

      <main className="admin-main">
        <div className="admin-hero">
          <div className="hero-left">
            <h1>Admin Dashboard</h1>
            <p className="muted">Overview of site activity, shop orders, membership stats, and exhibit health.</p>
          </div>
          <div className="hero-right">
            <div className="quick-actions">
              <button className="btn primary">New Announcement</button>
              <button className="btn ghost">Manage Exhibits</button>
              <button className="btn ghost">Users</button>
            </div>
          </div>
        </div>

        <section className="metrics-grid">
          <div className="metric large">
            <div className="label">Visitors Today</div>
            <div className="value">{metrics.visitorsToday.toLocaleString()}</div>
            <div className="sub muted">Tickets: {metrics.ticketsSold} · Revenue: ${metrics.revenue.toFixed(2)}</div>
          </div>

          <div className="metric">
            <div className="label">Members</div>
            <div className="value">{metrics.members.toLocaleString()}</div>
            <div className="sub muted">Active membership plans: {metrics.exhibitsActive}</div>
          </div>

          <div className="metric">
            <div className="label">Orders Pending</div>
            <div className="value">{metrics.ordersPending}</div>
            <div className="sub muted">Unfulfilled shop orders</div>
          </div>

          <div className="metric">
            <div className="label">Exhibits Live</div>
            <div className="value">{metrics.exhibitsActive}</div>
            <div className="sub muted">Monitoring: temperature, lights</div>
          </div>
        </section>

        <section className="admin-panels">
          <div className="panel orders">
            <div className="panel-title">Recent Orders</div>

            <div className="report-panel">
              <div className="report-controls">
                <label className="control-card">Status
                  <select value={orderFilters.status} onChange={(e)=> setOrderFilters(s=>({ ...s, status: e.target.value }))}>
                    <option>All</option>
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>Shipped</option>
                    <option>Completed</option>
                  </select>
                </label>
                  <label className="control-card">Min Amount
                    <input type="number" value={orderFilters.min} onChange={(e)=> setOrderFilters(s=>({ ...s, min: e.target.value }))} placeholder="0" />
                  </label>
                  <label className="control-card">Max Amount
                    <input type="number" value={orderFilters.max} onChange={(e)=> setOrderFilters(s=>({ ...s, max: e.target.value }))} placeholder="" />
                  </label>
                  <label className="control-card">Visitor Type
                    <select value={orderFilters.visitorType} onChange={(e)=> setOrderFilters(s=>({ ...s, visitorType: e.target.value }))}>
                      <option>All</option>
                      <option>Member</option>
                      <option>Non-member</option>
                    </select>
                  </label>
                  <label className="control-card">Time of Day
                    <select value={orderFilters.timeOfDay} onChange={(e)=> setOrderFilters(s=>({ ...s, timeOfDay: e.target.value }))}>
                      <option>All</option>
                      <option>Morning</option>
                      <option>Afternoon</option>
                      <option>Evening</option>
                    </select>
                  </label>
                <div className="report-actions">
                  <button className="btn ghost" onClick={()=> setOrderFilters({ status:'All', min:'', max:'' })}>Reset</button>
                  <button className="btn primary" onClick={exportCSV}>Export CSV</button>
                </div>
              </div>
            </div>

            <table className="orders-table">
              <thead><tr><th>Order</th><th>Date</th><th>Item</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {filteredOrders.map(o=> (
                  <tr key={o.id} className={o.status==='Pending'?'row-pending':''}>
                    <td>#{o.id}</td>
                    <td>{o.date}</td>
                    <td>{o.name}</td>
                    <td>{o.buyer}</td>
                    <td>${o.amount}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel charts">
            <div className="panel-title">Traffic & Sales</div>

            <div className="report-panel">
              <div className="report-controls">
                <label>From
                  <input type="date" defaultValue={new Date(Date.now()-7*86400000).toISOString().slice(0,10)} />
                </label>
                <label>To
                  <input type="date" defaultValue={new Date().toISOString().slice(0,10)} />
                </label>
                <label>Metric
                  <select>
                    <option>Visitors</option>
                    <option>Revenue</option>
                    <option>Memberships</option>
                  </select>
                </label>
                <div className="report-actions">
                  <button className="btn ghost">Generate</button>
                  <button className="btn primary">Export CSV</button>
                </div>
              </div>
            </div>

            <div className="chart-grid">
              <div className="chart card">Visitors (24h)</div>
              <div className="chart card">Revenue (30d)</div>
              <div className="chart card">Membership Growth</div>
            </div>
          </div>
        </section>

        <section className="report-large">
          <div className="panel">
            <div className="panel-title">Exhibit Activity Report</div>
            <div className="report-large-controls">
              <label className="control-card">From
                <input type="date" value={largeFilters.from} onChange={(e)=> setLargeFilters(s=>({ ...s, from: e.target.value }))} />
              </label>
              <label className="control-card">To
                <input type="date" value={largeFilters.to} onChange={(e)=> setLargeFilters(s=>({ ...s, to: e.target.value }))} />
              </label>
              <label className="control-card">Exhibits
                <select multiple value={largeFilters.exhibits} onChange={(e)=> setLargeFilters(s=>({ ...s, exhibits: Array.from(e.target.selectedOptions).map(o=>o.value) }))}>
                  {exhibits.map(x=> (<option key={x} value={x}>{x}</option>))}
                </select>
              </label>
              <label className="control-card">Min Visitors
                <input type="number" value={largeFilters.minVisitors} onChange={(e)=> setLargeFilters(s=>({ ...s, minVisitors: e.target.value }))} placeholder="" />
              </label>
              <label className="control-card">Max Visitors
                <input type="number" value={largeFilters.maxVisitors} onChange={(e)=> setLargeFilters(s=>({ ...s, maxVisitors: e.target.value }))} placeholder="" />
              </label>
              <label className="control-card">Visitor Type
                <select value={largeFilters.visitorType} onChange={(e)=> setLargeFilters(s=>({ ...s, visitorType: e.target.value }))}>
                  <option>All</option>
                  <option>Member</option>
                  <option>Non-member</option>
                </select>
              </label>
              <label className="control-card">Time of Day
                <select value={largeFilters.timeOfDay} onChange={(e)=> setLargeFilters(s=>({ ...s, timeOfDay: e.target.value }))}>
                  <option>All</option>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                </select>
              </label>
              <label className="control-card">Group By
                <select value={largeFilters.groupBy} onChange={(e)=> setLargeFilters(s=>({ ...s, groupBy: e.target.value }))}>
                  <option value="date">Date</option>
                  <option value="exhibit">Exhibit</option>
                </select>
              </label>
              <div className="report-actions">
                <button className="btn ghost" onClick={()=> setLargeResults([])}>Clear</button>
                <button className="btn primary" onClick={generateLargeReport}>Generate</button>
                <button className="btn primary" onClick={exportLargeCSV}>Export CSV</button>
              </div>
            </div>

            <div className="report-large-results">
              {largeResults.length === 0 ? (
                <div className="muted">No results yet. Use the filters above and click Generate.</div>
              ) : (
                <table className="orders-table">
                  <thead><tr><th>Exhibit</th><th>Date</th><th>Visitors</th><th>Avg Minutes</th></tr></thead>
                  <tbody>
                    {largeResults.map((r,idx)=> (
                      <tr key={idx}><td>{r.exhibit}</td><td>{r.date}</td><td>{r.visitors}</td><td>{r.avgMinutes}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

      </main>

      <footer className="home-footer">© {new Date().getFullYear()} City Museum — Admin</footer>
    </div>
  )
}
