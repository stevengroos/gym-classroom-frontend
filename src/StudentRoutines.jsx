import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from './api';
import { 
  AlertTriangle, CheckCircle, ArrowLeft, Plus, 
  ClipboardList, Activity, Pencil, Trash2, 
  Calendar, ArchiveX, Play, Clock, Repeat
} from 'lucide-react';

export default function StudentRoutines() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const [routines, setRoutines] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('routines'); 

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', action: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const [routinesRes, logsRes] = await Promise.all([
        API.get(`/routines/student/${studentId}`),
        API.get(`/routines/student/${studentId}/logs`)
      ]);
      
      setRoutines(routinesRes.data);
      setLogs(logsRes.data);

      sessionStorage.setItem(`trainer_student_${studentId}_routines`, JSON.stringify(routinesRes.data));
      sessionStorage.setItem(`trainer_student_${studentId}_logs`, JSON.stringify(logsRes.data));

    } catch (err) {
      showToast('Error al cargar la información del alumno.', 'error');
    } finally {
      if (showLoadingIndicator) setLoading(false);
    }
  };

  useEffect(() => {
    const cachedRoutines = sessionStorage.getItem(`trainer_student_${studentId}_routines`);
    const cachedLogs = sessionStorage.getItem(`trainer_student_${studentId}_logs`);

    if (cachedRoutines && cachedLogs) {
      setRoutines(JSON.parse(cachedRoutines));
      setLogs(JSON.parse(cachedLogs));
      setLoading(false);
      fetchData(false);
    } else {
      fetchData(true);
    }
  }, [studentId]);

  const handleDeleteRoutineClick = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Rutina',
      message: '¿Estás seguro de que deseas eliminar esta rutina? El alumno ya no podrá verla ni entrenarla.',
      action: async () => {
        try {
          await API.delete(`/routines/${id}`);
          showToast("Rutina eliminada correctamente", "success");
          sessionStorage.removeItem(`trainer_student_${studentId}_routines`);
          fetchData(false); 
        } catch (err) {
          showToast("Error al eliminar la rutina", "error");
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', action: null });
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12 relative overflow-x-hidden">
      
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-fade-in-up transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-fade-in-up text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-black text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-400 mb-8">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', action: null })} className="flex-1 py-3.5 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDialog.action} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 transition-colors">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR OPTIMIZADO PARA MÓVIL: Evita desbordamientos horizontales */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          <button onClick={() => navigate('/trainer')} className="text-amber-500 font-bold flex items-center gap-1 transition-colors hover:text-amber-400 text-sm whitespace-nowrap shrink-0">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Volver</span>
          </button>
          <h1 className="text-base sm:text-xl font-bold text-white truncate">Seguimiento</h1>
        </div>
        <button 
          onClick={() => navigate(`/trainer/routine/${studentId}`)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="sm:inline">Nueva Rutina</span>
        </button>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-2 sm:mt-4">

        {/* PESTAÑAS */}
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('routines')}
            className={`py-3 px-4 sm:px-6 font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 text-sm sm:text-base ${
              activeTab === 'routines' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" /> Rutinas ({routines.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 sm:px-6 font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 text-sm sm:text-base ${
              activeTab === 'history' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" /> Historial ({logs.length})
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10 animate-pulse">Cargando datos del alumno...</p>
        ) : activeTab === 'routines' ? (
          
          routines.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-8 sm:p-12 text-center">
              <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-300 font-medium text-base sm:text-lg">Este alumno aún no tiene rutinas.</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Asígnele una rutina nueva con el botón de arriba.</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {routines.map((routine) => (
                <div key={routine.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden">
                  
                  {/* Cabecera de la Tarjeta */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 mb-4 gap-3 sm:gap-4">
                    <div className="w-full sm:w-auto">
                      <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">
                        {routine.day_of_week}
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5 leading-tight truncate">{routine.title}</h2>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => navigate(`/trainer/routine-edit/${routine.id}`, { state: { routine, studentId } })}
                        className="flex-1 sm:flex-none text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-colors font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteRoutineClick(routine.id)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-colors font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                  
                  {/* VISTA MÓVIL: Lista compacta en tarjetas apiladas */}
                  <div className="space-y-2.5 sm:hidden">
                    {routine.exercises.map((ex, idx) => (
                      <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-sm text-white leading-tight">{ex.name}</span>
                          {ex.youtube_url && (
                            <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400 shrink-0 p-1 bg-amber-500/10 rounded-lg">
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800/50 pt-2 mt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-slate-300">
                            <Repeat className="w-3.5 h-3.5 text-amber-500" /> {ex.sets}x{ex.reps}
                          </span>
                          {ex.rest_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" /> {ex.rest_time}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* VISTA ESCRITORIO: Tabla clásica */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                          <th className="pb-3 font-black">Ejercicio</th>
                          <th className="pb-3 font-black text-center">Series</th>
                          <th className="pb-3 font-black text-center">Reps</th>
                          <th className="pb-3 font-black text-center">Descanso</th>
                          <th className="pb-3 font-black">Video</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
                        {routine.exercises.map((ex, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-3.5 font-bold text-white">{ex.name}</td>
                            <td className="py-3.5 text-center font-semibold text-amber-500">{ex.sets}</td>
                            <td className="py-3.5 text-center">{ex.reps}</td>
                            <td className="py-3.5 text-center text-slate-400">{ex.rest_time || '-'}</td>
                            <td className="py-3.5">
                              {ex.youtube_url ? (
                                <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline font-medium inline-flex items-center gap-1">
                                  Ver <Play className="w-3 h-3 fill-current" />
                                </a>
                              ) : <span className="text-slate-600">N/A</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))}
            </div>
          )
        ) : (
          
          logs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-8 sm:p-12 text-center">
              <ArchiveX className="w-12 h-12 sm:w-16 sm:h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-300 font-medium text-base sm:text-lg">Historial vacío.</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Cuando el alumno finalice un entrenamiento en su app, aparecerá aquí.</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 mb-4 gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Entrenamiento Completado</span>
                      <h3 className="text-base sm:text-lg font-bold text-white mt-1">{log.routine_title}</h3>
                    </div>
                    <span className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto">
                      <Calendar className="w-3 h-3 text-amber-500" /> {log.completed_at}
                    </span>
                  </div>

                  {log.feedback && (
                    <div className="mb-5 bg-amber-500/10 border-l-2 border-l-amber-500 rounded-r-xl p-3.5 sm:p-4">
                      <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider block mb-1">Notas del Alumno:</span>
                      <p className="text-slate-200 italic text-xs sm:text-sm">"{log.feedback}"</p>
                    </div>
                  )}

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 sm:p-5">
                    <span className="text-xs text-slate-500 font-black uppercase tracking-wider block mb-3 sm:mb-4">Pesos Registrados:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                      {log.exercises.map((exercise) => {
                        const weightUsed = log.weights_data?.[exercise.index];
                        return (
                          <div key={exercise.index} className="flex justify-between items-center border-b border-slate-800/60 pb-2 text-xs sm:text-sm">
                            <span className="text-slate-300 font-medium truncate pr-4">{exercise.name}</span>
                            <span className="font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md whitespace-nowrap">
                              {weightUsed ? `${weightUsed} kg` : '--'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}