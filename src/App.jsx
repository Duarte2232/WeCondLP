import { useState } from 'react'
import {Hero, Passos, CallToAction, Features, Login, DashGestor, DashTecnico} from "./components"
import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/auth';
import DashAdmin from './components/Dashboard_Admin/dashadmin';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <div className='container'>
              <Hero/> 
              <Features />
              <Passos/>
              <CallToAction/>
            </div>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/dashgestor" element={<DashGestor />} />
          <Route path="/dashtecnico" element={<DashTecnico />} />
          <Route path="/dashadmin" element={<DashAdmin />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
