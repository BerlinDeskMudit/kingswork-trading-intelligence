import React from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { TrendingUp, LayoutDashboard, Bell, PieChart, Activity, Radio, History } from 'lucide-react'
import './Layout.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/signals', icon: Activity, label: 'Signals' },
  { to: '/portfolio', icon: PieChart, label: 'Portfolio' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
]

export default function Layout() {
  const location = useLocation()
  const isBacktesting = location.pathname.startsWith('/backtesting')

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <TrendingUp size={24} />
          <span>KingStop</span>
        </div>
        <div className="mode-switch" aria-label="Application mode">
          <Link to="/" className={`mode-option ${!isBacktesting ? 'active' : ''}`}>
            <Radio size={15} />
            <span>Live</span>
          </Link>
          <Link to="/backtesting" className={`mode-option ${isBacktesting ? 'active' : ''}`}>
            <History size={15} />
            <span>Backtesting</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
