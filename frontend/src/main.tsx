import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from './utils/toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <App />
  </ToastProvider>,
);
