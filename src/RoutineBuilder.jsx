import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from './api';
import { AlertTriangle, CheckCircle, ArrowLeft, Zap, Plus, Trash2, Save } from 'lucide-react';

export default function RoutineBuilder() {
  const { studentId } = useParams(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // NUEVO: Detectamos si estamos en modo "Crear Plantilla Maestra" (cuando no hay un ID de alumno real)
  const isTemplateMode = studentId === 'template' || !studentId;

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [templates, setTemplates] = useState([]);

  // Inicializamos el estado base dependiendo de si es plantilla o rutina de alumno
  const [routine, setRoutine] = useState({
    title: '',
    day_of_week: 'Lunes',
    student_id: isTemplateMode ? null : parseInt(studentId),
    is_template: isTemplateMode ? true : false, 
    exercises: [] 
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await API.get('/routines/trainer/templates');
        setTemplates(response.data);
        sessionStorage.setItem('trainer_templates', JSON.stringify(response.data));
      } catch (err) {
        console.error('No se pudieron cargar las plantillas', err);
      }
    };

    const cachedTemplates = sessionStorage.getItem('trainer_templates');
    if (cachedTemplates) {
      setTemplates(JSON.parse(cachedTemplates));
      fetchTemplates(); 
    } else {
      fetchTemplates(); 
    }
  }, []);

  const handleLoadTemplate = (e) => {
    const templateId = parseInt(e.target.value);
    if (!templateId) return;

    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
      const copiedExercises = selectedTemplate.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_time: ex.rest_time,
        youtube_url: ex.youtube_url,
        notes: ex.notes || ''
      }));

      setRoutine({
        ...routine,
        title: selectedTemplate.title, 
        exercises: copiedExercises
      });
      showToast("¡Plantilla cargada con éxito!", "success");
    }
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
      showToast('Debes agregar al menos un ejercicio.', 'error');
      return;
    }

    setLoading(true);

    try {
      await API.post('/routines/', routine);
      
      // Mensaje dinámico
      if (isTemplateMode) {
        showToast('¡Plantilla maestra guardada con éxito!', 'success');
      } else {
        showToast('¡Rutina asignada con éxito!', 'success');
      }
      
      sessionStorage.removeItem('trainer_students'); 
      sessionStorage.removeItem('trainer_templates'); // Forzamos recarga de plantillas
      
      setTimeout(() => {
        if (isTemplateMode) {
          navigate('/trainer'); // Volvemos al dashboard central
        } else {
          navigate(`/trainer/student/${studentId}`); // Volvemos al perfil del alumno
        }
      }, 1500);
      
    } catch (err) {
      showToast('Error al guardar. Revisa los datos.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12 relative">
      
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-fade-in-up transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => navigate(-1)} className="text-amber-500 mr-4 font-bold flex items-center gap-1 transition-colors hover:text-amber-400">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="text-xl font-bold text-white">
          {isTemplateMode ? 'Crear Plantilla Maestra' : 'Asignar Nueva Rutina'}
        </h1>
      </nav>

      <main className="max-w-3xl mx-auto p-4 md:p-6 mt-4">
        
        {/* Solo mostramos la Carga Rápida si le estamos asignando una rutina a un alumno */}
        {templates.length > 0 && !isTemplateMode && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Carga Rápida
            </h2>
            <select 
              onChange={handleLoadTemplate}
              defaultValue=""
              className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-4 py-3 text-white focus:border-amber-500 outline-none"
            >
              <option value="" disabled>Selecciona una plantilla guardada para autocompletar...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.exercises.length} ejercicios)</option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Configuración del Día</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Título de la rutina</label>
                <input 
                  type="text" required placeholder="Ej: Pecho y Tríceps"
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
              <button type="button" onClick={addExercise} className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Agregar Ejercicio
              </button>
            </h2>

            {routine.exercises.map((exercise, index) => (
              <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative group shadow-sm">
                <button 
                  type="button" onClick={() => removeExercise(index)}
                  className="absolute top-4 right-4 text-red-500/70 hover:text-red-500 text-sm font-bold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
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
                    <input type="text" value={exercise.rest_time} onChange={(e) => updateExercise(index, 'rest_time', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Link de YouTube</label>
                    <input type="url" placeholder="https://youtube.com/..." value={exercise.youtube_url} onChange={(e) => updateExercise(index, 'youtube_url', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none text-amber-500 focus:border-amber-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ocultamos el checkbox de guardar como plantilla si YA estamos creando una plantilla */}
          {!isTemplateMode && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-3">
              <input 
                type="checkbox" 
                id="saveTemplate"
                checked={routine.is_template}
                onChange={(e) => setRoutine({...routine, is_template: e.target.checked})}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
              <label htmlFor="saveTemplate" className="text-slate-300 font-medium cursor-pointer">
                Guardar también como <span className="text-amber-500 font-bold">Plantilla</span> para usarla con otros alumnos
              </label>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-950 font-bold py-4 rounded-xl text-lg shadow-lg shadow-amber-500/20 transition-colors flex justify-center items-center gap-2">
            {loading ? 'Guardando...' : <><Save className="w-5 h-5" /> {isTemplateMode ? 'Guardar Plantilla' : 'Asignar Rutina al Alumno'}</>}
          </button>
        </form>
      </main>
    </div>
  );
}