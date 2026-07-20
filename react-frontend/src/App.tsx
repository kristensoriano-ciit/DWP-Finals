import { RouterProvider } from 'react-router-dom'
import './App.css'
import { SessionProvider } from './auth/SessionProvider'
import { router } from './router'

export default function App() {
  return <SessionProvider><RouterProvider router={router} /></SessionProvider>
}
