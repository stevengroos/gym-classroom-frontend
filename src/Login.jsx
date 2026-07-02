import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from './api';
// NUEVO: Importamos los íconos de Lucide
import { AlertTriangle, Dumbbell, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const navigate = useNavigate();

  // Efecto de Auto-Login y Limpieza de Caché
  useEffect(() => {
    // 1. Limpieza estricta: Si el usuario llegó a la pantalla de Login, limpiamos cualquier caché residual
    sessionStorage.clear();

    // 2. Auto-Login: Si ya tiene un token guardado, lo mandamos directo a su panel
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token && role) {
      if (role === 'trainer' || role === 'superadmin') {
        navigate('/trainer');
      } else {
        navigate('/student');
      }
    }
  }, [navigate]);

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(false);

    if (!email || !password) {
      showToast('Por favor, rellena todos los campos.', 'error');
      return;
    }

    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await API.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.role);

      if (response.data.role === 'trainer' || response.data.role === 'superadmin') {
        navigate('/trainer');
      } else {
        navigate('/student');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        showToast('El correo o la contraseña son incorrectos.', 'error');
      } else {
        showToast('Hubo un problema al conectar con el servidor. Inténtalo más tarde.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      {/* TOAST NOTIFICATION CON LUCIDE */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-fade-in-up transition-all bg-red-500 text-white">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm whitespace-nowrap">{toast.message}</span>
        </div>
      )}

      {/* EFECTOS DE LUZ DE FONDO */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        
        {/* Encabezado */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Dumbbell className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ATLETA<span className="text-amber-500">HUB</span></h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Entra a tu zona de entrenamiento</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Correo Electrónico</label>
            <input
              type="email"
              autoFocus 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:bg-slate-950 transition-all text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-4 pr-12 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:bg-slate-950 transition-all text-sm font-medium tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-950 font-black py-4 rounded-xl transition-all text-base shadow-lg shadow-amber-500/20 mt-4 active:scale-[0.98]"
          >
            {loading ? 'Validando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}