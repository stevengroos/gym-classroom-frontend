import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from './api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    // Validación básica de frontend (Principio UX: prevenir peticiones innecesarias)
    if (!email || !password) {
      setError('Por favor, rellena todos los campos.');
      return;
    }

    setLoading(true);

    try {
      // FastAPI espera un formulario (URL encoded), así que usamos URLSearchParams
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await API.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Guardar sesión en el navegador
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.role);

      // Redirigir según el rol que nos devuelve el backend
      if (response.data.role === 'trainer' || response.data.role === 'superadmin') {
        navigate('/trainer');
      } else {
        navigate('/student');
      }
    } catch (err) {
      // Capturar errores del backend de forma amigable para el usuario
      if (err.response && err.response.status === 401) {
        setError('El correo o la contraseña son incorrectos.');
      } else {
        setError('Hubo un problema al conectar con el servidor. Inténtalo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        
        {/* Encabezado con branding deportivo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-amber-500 tracking-tight">GYM CLASSROOM</h1>
          <p className="text-slate-400 mt-2 text-sm">Entra a tu zona de entrenamiento</p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors text-base"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors text-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-bold py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-amber-500/10"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}