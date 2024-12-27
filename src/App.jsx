import { useState } from 'react'
import {Hero} from "./components"
import './App.css'
import { Passos } from './components'

function App() {
  const [count, setCount] = useState(0)

  return (
  
      <div><Hero/> 
      <Passos/></div>
     
      
  )
}

export default App
