import { useState } from 'react'
import {Hero, Passos, CallToAction, Features} from "./components"
import './App.css'



function App() {
  const [count, setCount] = useState(0)

  return (
  
      <div>
        <Hero/> 
        <Features/>
      <Passos/>
      <CallToAction/>
  
      </div>
     
      
  )
}

export default App
