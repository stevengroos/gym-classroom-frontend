import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from './api';
import { 
  Shield, Users, Dumbbell, Plus, X, 
  LogOut, AlertTriangle, CheckCircle, Activity, Mail
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ email: '', full_name: '', password: '', role: 'trainer' });
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchTrainers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await API.get('/users/trainers');
      setTrainers(response.data);
      sessionStorage.setItem('superadmin_trainers', JSON.stringify(response.data));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      } else {
        showToast('Error al cargar entrenadores', 'error');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const cachedTrainers = sessionStorage.getItem('superadmin_trainers');
    if (cachedTrainers) {
      setTrainers(JSON.parse(cachedTrainers));
      setLoading(false);
      fetchTrainers(false);
    } else {
      fetchTrainers(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.clear();
    navigate('/');
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await API.post('/users/trainers', newTrainer);
      setNewTrainer({ email: '', full_name: '', password: '', role: 'trainer' });
      setIsCreateModalOpen(false);
      showToast("Entrenador creado con éxito", "success");
      fetchTrainers(false); 
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al crear entrenador", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Métricas Globales
  const totalStudents = trainers.reduce((acc, trainer) => acc + trainer.student_count, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative pb-10">
      
      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-fade-in-up transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* MODAL CREAR ENTRENADOR */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-amber-500" /> Nuevo Entrenador
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">Al crear esta cuenta, el entrenador podrá acceder a su propio panel y gestionar a sus propios alumnos.</p>
            <form onSubmit={handleCreateTrainer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                <input type="text" required value={newTrainer.full_name} onChange={(e) => setNewTrainer({...newTrainer, full_name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input type="email" required value={newTrainer.email} onChange={(e) => setNewTrainer({...newTrainer, email: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contraseña de Acceso</label>
                <input type="text" required minLength="6" value={newTrainer.password} onChange={(e) => setNewTrainer({...newTrainer, password: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <button type="submit" disabled={isCreating} className="w-full bg-amber-500 text-slate-950 font-bold py-3.5 rounded-xl mt-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform">
                {isCreating ? 'Creando licencia...' : 'Crear Licencia de Entrenador'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight leading-none">ATLETAHUB</h1>
            <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-0.5">Control Maestro (CEO)</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg font-medium flex items-center gap-2">
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4">
        
        {/* PANEL DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-blue-500/10 p-4 rounded-xl text-blue-500">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Entrenadores Activos</p>
              <h2 className="text-4xl font-black text-white">{trainers.length}</h2>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-emerald-500/10 p-4 rounded-xl text-emerald-500">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Volumen Global de Alumnos</p>
              <h2 className="text-4xl font-black text-white">{totalStudents}</h2>
            </div>
          </div>
        </div>

        {/* CABECERA DE LA LISTA */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> Gestión de Clientes (Entrenadores)
          </h2>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition-colors flex justify-center items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" /> Nuevo Entrenador
          </button>
        </div>

        {/* LISTADO DE ENTRENADORES */}
        {loading ? (
          <p className="text-slate-500 py-10 text-center animate-pulse">Analizando base de datos central...</p>
        ) : trainers.length === 0 ? (
          <div className="bg-slate-900 p-10 rounded-2xl text-center text-slate-500 border border-slate-800 border-dashed flex flex-col items-center gap-3">
            <Shield className="w-10 h-10 opacity-50"/>
            Aún no tienes clientes. ¡Crea tu primer entrenador!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">{trainer.full_name}</h3>
                      <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
                        <Mail className="w-3.5 h-3.5" /> {trainer.email}
                      </p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">
                      Activo
                    </span>
                  </div>
                  
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between mt-6">
                    <span className="text-sm font-bold text-slate-400">Alumnos Gestionados:</span>
                    <span className="text-xl font-black text-amber-500 flex items-center gap-1.5">
                      {trainer.student_count} <Dumbbell className="w-4 h-4" />
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500 font-medium text-center">
                  Registrado el {new Date(trainer.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}