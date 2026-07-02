import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from './api';

export default function RoutineEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const routineData = location.state?.routine;
  const studentId = location.state?.studentId; 

  if (!routineData) {
    navigate('/trainer');
    return null;
  }

  const [routine, setRoutine] = useState(routineData);
  const [loading, setLoading] = useState(false);

  // ================= ESTADO DE ALERTAS UI =================
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const addExercise = () => {
    setRoutine({
      ...routine,
      exercises: [
        ...routine.exercises, 
        { name: '', sets: 4, reps: '10-12', rest_time: '90 seg', youtube_url: '', notes: '' }
      ]
    });
  };

  const updateExercise = (index, field, value) => {
    const updatedExercises = [...routine.exercises];
    updatedExercises[index][field] = value;
    setRoutine({ ...routine, exercises: updatedExercises });
  };

  const removeExercise = (index) => {
    const updated = routine.exercises.filter((_, i) => i !== index);
    setRoutine({ ...routine, exercises: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (routine.exercises.length === 0) {
      showToast('Debes tener al menos un ejercicio en la rutina.', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: routine.title,
        day_of_week: routine.day_of_week,
        student_id: studentId ? parseInt(studentId) : null, 
        is_template: routine.is_template,
        exercises: routine.exercises
      };

      await API.put(`/routines/${routine.id}`, payload);
      showToast('¡Rutina actualizada con éxito!', 'success');
      
      // NUEVO: Limpiamos cachés relevantes para forzar actualización
      sessionStorage.removeItem('trainer_templates');
      if (studentId) {
         sessionStorage.removeItem(`trainer_student_${studentId}_routines`);
      }
      
      setTimeout(() => {
        if (studentId) {
          navigate(`/trainer/student/${studentId}`); 
        } else {
          navigate('/trainer');
        }
      }, 1500);

    } catch (err) {
      showToast('Error al actualizar la rutina. Revisa los datos.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12 relative">
      
      {/* 1. TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-fade-in-up transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'
        }`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => navigate(-1)} className="text-amber-500 mr-4 font-bold">← Cancelar</button>
        <h1 className="text-xl font-bold text-white">Editar: <span className="text-amber-500">{routine.title}</span></h1>
      </nav>

      <main className="max-w-3xl mx-auto p-4 md:p-6 mt-4">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-amber-500">Configuración del Día</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Título de la rutina</label>
                <input 
                  type="text" required 
                  value={routine.title} onChange={(e) => setRoutine({...routine, title: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Día de la semana</label>
                <select 
                  value={routine.day_of_week} onChange={(e) => setRoutine({...routine, day_of_week: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:border-amber-500 outline-none transition-colors"
                >
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex justify-between items-center">
              Ejercicios ({routine.exercises.length})
              <button type="button" onClick={addExercise} className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors font-medium">
                + Agregar Ejercicio
              </button>
            </h2>

            {routine.exercises.map((exercise, index) => (
              <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative group shadow-sm">
                <button 
                  type="button" onClick={() => removeExercise(index)}
                  className="absolute top-4 right-4 text-red-500/70 hover:text-red-500 text-sm font-bold transition-colors"
                >
                  X Eliminar
                </button>
                
                <div className="grid sm:grid-cols-3 gap-4 mb-4 pr-12">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del Ejercicio</label>
                    <input type="text" required value={exercise.name} onChange={(e) => updateExercise(index, 'name', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Series</label>
                    <input type="number" required min="1" value={exercise.sets} onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Repeticiones</label>
                    <input type="text" required value={exercise.reps} onChange={(e) => updateExercise(index, 'reps', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Descanso</label>
                    <input type="text" value={exercise.rest_time || ''} onChange={(e) => updateExercise(index, 'rest_time', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Link de YouTube</label>
                    <input type="url" placeholder="https://youtube.com/..." value={exercise.youtube_url || ''} onChange={(e) => updateExercise(index, 'youtube_url', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none text-amber-500 focus:border-amber-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-950 font-bold py-4 rounded-xl text-lg shadow-lg shadow-amber-500/20 transition-colors">
            {loading ? 'Guardando cambios...' : 'Guardar Cambios'}
          </button>
        </form>
      </main>
    </div>
  );
}