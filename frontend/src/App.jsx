import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import StockDetail from './components/StockChart/StockDetail'
import PortfolioView from './components/Portfolio/PortfolioView'
import AlertsPanel from './components/Alerts/AlertsPanel'
import SignalsPanel from './components/SignalsPanel/SignalsPanel'
import BacktestingView from './components/Backtesting/BacktestingView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
          <Route path="/portfolio" element={<PortfolioView />} />
          <Route path="/alerts" element={<AlertsPanel />} />
          <Route path="/signals" element={<SignalsPanel />} />
          <Route path="/backtesting" element={<BacktestingView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
