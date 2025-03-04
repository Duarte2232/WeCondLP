import { useState } from 'react'
import {Hero, Passos, CallToAction, Features, Login, DashGestor, DashTecnico} from "./components"
import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/auth';
import DashAdmin from './components/Dashboard_Admin/dashadmin';
import PerfilTecnico from './components/Dashboard_Técnico/components/Profile/PerfilTecnico';
import Calendar from './components/Dashboard_Técnico/components/Calendar/Calendar';
import Jobs from './components/Dashboard_Técnico/components/Jobs/Jobs';
import Messages from './components/Dashboard_Técnico/components/Messages/Messages';

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
          <Route path="/perfil-tecnico" element={<PerfilTecnico />} />
          <Route path="/calendario" element={<Calendar />} />
          <Route path="/obras" element={<Jobs />} />
          <Route path="/mensagens" element={<Messages />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
