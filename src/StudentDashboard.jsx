import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from './api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Play, CheckCircle, AlertTriangle, Settings, 
  LogOut, Coffee, ChevronDown, Trophy, 
  ArrowLeft, ArrowRight, X, Download,
  List, TrendingUp, Plus, FileSpreadsheet, Search
} from 'lucide-react';

// ================= COMPONENTES OPTIMIZADOS =================

const LazyYouTube = ({ rawUrl }) => {
  const [showVideo, setShowVideo] = useState(false);
  
  const getYoutubeId = (url) => {
    if (!url) return null;
    try {
      if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
      if (url.includes('youtube.com/watch?v=')) return url.split('watch?v=')[1].split('&')[0];
    } catch (e) { return null; }
    return null;
  };

  const videoId = getYoutubeId(rawUrl);
  if (!videoId) return null;

  if (showVideo) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video relative shadow-lg shadow-black/50">
        <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`} className="absolute top-0 left-0 w-full h-full" frameBorder="0" allowFullScreen></iframe>
      </div>
    );
  }

  return (
    <div onClick={() => setShowVideo(true)} className="mt-4 rounded-xl overflow-hidden border border-slate-800 aspect-video relative cursor-pointer group shadow-lg shadow-black/50">
      <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="Miniatura de ejercicio" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 group-hover:bg-transparent transition-colors">
        <div className="bg-red-600 text-white w-14 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30">
          <Play className="w-6 h-6 fill-current ml-1" />
        </div>
      </div>
    </div>
  );
};

const ExerciseTimer = ({ restTimeStr }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const totalTimeRef = useRef(0);

  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      setIsTimerRunning(false);
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]); 
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  const startTimer = () => {
    const seconds = parseInt(restTimeStr) || 60; 
    totalTimeRef.current = seconds;
    setTimeLeft(seconds);
    setIsTimerRunning(true);
  };

  const progressPercentage = isTimerRunning ? ((totalTimeRef.current - timeLeft) / totalTimeRef.current) * 100 : 0;

  return (
    <button onClick={startTimer} className="relative py-2 rounded-lg border text-center flex-1 bg-slate-900 border-slate-700 overflow-hidden active:scale-95 transition-transform">
      {isTimerRunning && (
        <div className="absolute top-0 left-0 h-full bg-amber-500/20 transition-all duration-1000 linear" style={{ width: `${progressPercentage}%` }}></div>
      )}
      <div className="relative z-10">
        <span className={`block text-[10px] uppercase font-bold mb-0.5 ${isTimerRunning ? 'text-amber-500' : 'text-slate-400'}`}>Descanso</span>
        <span className={`font-bold text-lg ${isTimerRunning ? 'text-amber-500' : 'text-white'}`}>
          {isTimerRunning ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : restTimeStr}
        </span>
      </div>
    </button>
  );
};

// ================= COMPONENTE PRINCIPAL =================

export default function StudentDashboard() {
  const [routines, setRoutines] = useState([]);
  const [userProfile, setUserProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('routines'); 

  // Estados para el Diario de Progreso Local
  const [personalLogs, setPersonalLogs] = useState([]);
  const [newLog, setNewLog] = useState({ exercise: '', weight: '', reps: '' });
  
  // NUEVO: Estados de Búsqueda y Paginación para el Diario
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 10;

  const [activeRoutineId, setActiveRoutineId] = useState(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0); 
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [profileModal, setProfileModal] = useState({ isOpen: false, newPassword: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [weights, setWeights] = useState({}); 
  const [lastWeights, setLastWeights] = useState({}); 
  const [isFinished, setIsFinished] = useState(false); 
  const [feedback, setFeedback] = useState('');
  
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const wakeLockRef = useRef(null); 

  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const [routinesRes, profileRes] = await Promise.all([
        API.get('/routines/me'),
        API.get('/users/me/profile')
      ]);
      setRoutines(routinesRes.data);
      setUserProfile(profileRes.data);

      sessionStorage.setItem('student_routines', JSON.stringify(routinesRes.data));
      sessionStorage.setItem('student_profile', JSON.stringify(profileRes.data));

    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally {
      if (showLoadingIndicator) setLoading(false);
    }
  };

  useEffect(() => {
    const cachedRoutines = sessionStorage.getItem('student_routines');
    const cachedProfile = sessionStorage.getItem('student_profile');

    if (cachedRoutines && cachedProfile) {
      setRoutines(JSON.parse(cachedRoutines));
      setUserProfile(JSON.parse(cachedProfile));
      setLoading(false);
      fetchData(false);
    } else {
      fetchData(true);
    }

    const savedLogs = localStorage.getItem('atletahub_personal_logs');
    if (savedLogs) {
      setPersonalLogs(JSON.parse(savedLogs));
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) { console.log('Wake Lock API no soportada.'); }
    };
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, []);

  // Reiniciar página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.clear(); 
    navigate('/');
  };

  const handleUpdateProfilePassword = async (e) => {
    e.preventDefault();
    if (!profileModal.newPassword || profileModal.newPassword.length < 6) return showToast("La contraseña debe tener al menos 6 caracteres.", "error");
    setIsUpdatingProfile(true);
    try {
      await API.put('/users/me/password', { new_password: profileModal.newPassword });
      showToast("Tu contraseña ha sido actualizada con éxito.", "success");
      setProfileModal({ isOpen: false, newPassword: '' });
    } catch (err) {
      showToast("Error al actualizar tu contraseña.", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // ================= LÓGICA DEL DIARIO DE PROGRESO =================

  const handleSavePersonalLog = (e) => {
    e.preventDefault();
    if (!newLog.exercise || !newLog.weight) return;

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      exercise: newLog.exercise,
      weight: newLog.weight,
      reps: newLog.reps || '-'
    };

    const updatedLogs = [newEntry, ...personalLogs];
    setPersonalLogs(updatedLogs);
    localStorage.setItem('atletahub_personal_logs', JSON.stringify(updatedLogs));
    
    setNewLog({ exercise: '', weight: '', reps: '' });
    showToast("¡Registro guardado localmente!", "success");
  };

  const handleDeletePersonalLog = (id) => {
    const updatedLogs = personalLogs.filter(log => log.id !== id);
    setPersonalLogs(updatedLogs);
    localStorage.setItem('atletahub_personal_logs', JSON.stringify(updatedLogs));
  };

  const exportToExcel = () => {
    if (personalLogs.length === 0) {
      return showToast("No hay registros para exportar.", "error");
    }
    let csvContent = "Fecha,Hora,Ejercicio,Peso Levantado (Kg/Lbs),Repeticiones\n";
    personalLogs.forEach(row => {
      const safeExercise = row.exercise.replace(/,/g, '');
      csvContent += `${row.date},${row.time},${safeExercise},${row.weight},${row.reps}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `MiProgreso_AtletaHub_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("¡Excel generado exitosamente!", "success");
  };

  // Lógica de filtrado y paginación
  const filteredLogs = personalLogs.filter(log => 
    log.exercise.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const indexOfLastLog = currentPage * LOGS_PER_PAGE;
  const indexOfFirstLog = indexOfLastLog - LOGS_PER_PAGE;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);

  // ================= LÓGICA DE RUTINAS =================

  const toggleRoutine = async (id) => {
    if (activeRoutineId === id) {
      setActiveRoutineId(null);
    } else {
      setActiveRoutineId(id);
      setActiveExerciseIndex(0); 
      setIsFinished(false);
      setWeights({});
      
      try {
        const res = await API.get(`/routines/${id}/last-log`);
        setLastWeights(res.data.weights_data || {});
      } catch (e) { setLastWeights({}); }
    }
  };

  const nextExercise = (totalExercises) => {
    if (activeExerciseIndex < totalExercises - 1) {
      setActiveExerciseIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 200]); 
    }
  };

  const prevExercise = () => {
    if (activeExerciseIndex > 0) setActiveExerciseIndex(prev => prev - 1);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = (totalExercises) => {
    const minSwipeDistance = 50;
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && !isFinished) nextExercise(totalExercises); 
    if (distance < -minSwipeDistance && !isFinished) prevExercise(); 
  };

  const submitWorkout = async () => {
    try {
      // 1. Enviamos el registro al backend para el profesor
      await API.post(`/routines/${activeRoutineId}/log`, {
        feedback: feedback,
        weights: weights
      });

      // 2. NUEVO: SINCRONIZACIÓN AUTOMÁTICA CON DIARIO LOCAL
      const activeRoutine = routines.find(r => r.id === activeRoutineId);
      if (activeRoutine && Object.keys(weights).length > 0) {
        const newEntries = [];
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        Object.keys(weights).forEach(indexStr => {
          const index = parseInt(indexStr);
          const weightVal = weights[index];
          const exercise = activeRoutine.exercises[index];

          if (weightVal && exercise) {
            newEntries.push({
              id: Date.now() + index, // IDs únicos
              date: dateStr,
              time: timeStr,
              exercise: exercise.name,
              weight: weightVal,
              reps: exercise.reps || '-'
            });
          }
        });

        if (newEntries.length > 0) {
          const updatedLogs = [...newEntries, ...personalLogs];
          setPersonalLogs(updatedLogs);
          localStorage.setItem('atletahub_personal_logs', JSON.stringify(updatedLogs));
        }
      }

      showToast("¡Entrenamiento guardado con éxito!", "success");
      setActiveRoutineId(null);
      setFeedback('');
      setWeights({});
      setLastWeights({});
    } catch (err) {
      showToast("Hubo un error al guardar tu progreso.", "error");
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(245, 158, 11); 
      doc.text('ATLETAHUB', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); 
      doc.text(`Plan de Entrenamiento - Atleta: ${userProfile?.full_name || 'Alumno'}`, 14, 30);

      let startY = 40;

      routines.forEach((routine) => {
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(`${routine.day_of_week}: ${routine.title}`, 14, startY);

        const tableColumn = ["Ejercicio", "Series", "Reps", "Descanso", "Video", "Anotaciones"];
        const tableRows = [];

        routine.exercises.forEach(ex => {
          tableRows.push([
            ex.name, 
            ex.sets, 
            ex.reps, 
            ex.rest_time || '-', 
            ex.youtube_url || '-',
            ex.notes || ''
          ]);
        });

        autoTable(doc, {
          startY: startY + 5,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [15, 23, 42] },
          styles: { fontSize: 8, overflow: 'linebreak' }, 
          columnStyles: { 
            4: { cellWidth: 40, textColor: [37, 99, 235] }, 
            5: { cellWidth: 40 } 
          } 
        });

        startY = doc.lastAutoTable.finalY + 15;

        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }
      });

      const fileName = `Plan_Entrenamiento_${userProfile?.full_name?.replace(/\s+/g, '_') || 'AtletaHub'}.pdf`;
      doc.save(fileName);
      showToast("PDF descargado. ¡Revisa tus archivos!", "success");

    } catch (error) {
      showToast("Error al generar el PDF.", "error");
    }
  };

  const renderSubscriptionStatus = () => {
    if (!userProfile) return null;
    if (!userProfile.expiration_date) return <div className="bg-slate-900 border-t border-slate-800 p-3 text-center text-xs text-slate-400 fixed bottom-0 w-full z-20">Sin información de pago registrada.</div>;
    
    const expDate = new Date(userProfile.expiration_date);
    const today = new Date();
    const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    const formattedDate = expDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

    if (daysLeft < 0) return <div className="bg-red-500/90 backdrop-blur-md text-white p-3 text-center text-xs font-bold fixed bottom-0 w-full z-20 shadow-[0_-5px_15px_rgba(239,68,68,0.2)]">⚠️ Tu mensualidad venció el {formattedDate}. Por favor, regulariza tu pago.</div>;
    if (daysLeft <= 5) return <div className="bg-yellow-500/90 backdrop-blur-md text-slate-900 p-3 text-center text-xs font-bold fixed bottom-0 w-full z-20 shadow-[0_-5px_15px_rgba(234,179,8,0.2)]">⏳ Tu mensualidad vence pronto ({formattedDate}).</div>;
    return <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-3 text-center text-xs text-slate-400 fixed bottom-0 w-full z-20">Suscripción activa hasta el {formattedDate}</div>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-16 relative">
      
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-fade-in-up transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm whitespace-nowrap">{toast.message}</span>
        </div>
      )}

      {profileModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Mi Perfil</h3>
              <button onClick={() => setProfileModal({ isOpen: false, newPassword: '' })} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {userProfile && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 shadow-inner">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Mis Datos</span>
                <p className="text-white font-bold text-sm">{userProfile.full_name}</p>
                <p className="text-slate-400 text-xs">{userProfile.email}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProfilePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cambiar mi Contraseña</label>
                <input type="password" required minLength="6" placeholder="Nueva contraseña segura" value={profileModal.newPassword} onChange={(e) => setProfileModal({...profileModal, newPassword: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <button type="submit" disabled={isUpdatingProfile} className="w-full bg-amber-500 text-slate-950 font-bold py-3.5 rounded-xl mt-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform">
                {isUpdatingProfile ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-extrabold text-amber-500 tracking-tight">ATLETAHUB</h1>
          <p className="text-xs text-slate-400">Atleta: <span className="text-white">{userProfile?.full_name}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setProfileModal({ isOpen: true, newPassword: '' })} className="text-sm text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 mt-2 mb-10">
        
        {/* PESTAÑAS DEL ALUMNO */}
        <div className="flex border-b border-slate-800 mb-6 pb-1">
          <button 
            onClick={() => setActiveTab('routines')} 
            className={`flex-1 py-2 font-bold text-sm flex justify-center items-center gap-2 border-b-2 transition-colors ${activeTab === 'routines' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400'}`}
          >
            <List className="w-4 h-4" /> Plan Guiado
          </button>
          <button 
            onClick={() => setActiveTab('progress')} 
            className={`flex-1 py-2 font-bold text-sm flex justify-center items-center gap-2 border-b-2 transition-colors ${activeTab === 'progress' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400'}`}
          >
            <TrendingUp className="w-4 h-4" /> Mi Progreso
          </button>
        </div>

        {/* PESTAÑA 1: PLAN GUIADO */}
        {activeTab === 'routines' && (
          loading ? (
            <div className="flex justify-center py-10"><p className="text-amber-500 font-medium animate-pulse">Cargando tu plan...</p></div>
          ) : routines.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center mt-4 shadow-lg flex flex-col items-center">
              <Coffee className="w-12 h-12 text-slate-600 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">¡Día Libre!</h2>
              <p className="text-slate-400 text-sm">Aún no tienes rutinas asignadas.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-slate-300 font-bold">Tus Rutinas</h2>
                <button 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" /> Guardar PDF
                </button>
              </div>
              
              {routines.map((routine) => {
                const isActive = activeRoutineId === routine.id;
                const hasExercises = routine.exercises && routine.exercises.length > 0;
                const totalExercises = hasExercises ? routine.exercises.length : 0;
                const activeExercise = hasExercises ? routine.exercises[activeExerciseIndex] : null;

                return (
                  <div key={routine.id} className={`bg-slate-900 border ${isActive ? 'border-amber-500' : 'border-slate-800'} rounded-2xl overflow-hidden shadow-lg transition-all`}>
                    
                    <button onClick={() => toggleRoutine(routine.id)} className="w-full text-left p-5 flex justify-between items-center focus:outline-none">
                      <div>
                        <span className="text-amber-500 text-xs font-black uppercase tracking-widest">{routine.day_of_week}</span>
                        <h3 className="text-lg font-bold text-white mt-1">{routine.title}</h3>
                      </div>
                      <div className={`transform transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-6 h-6 text-amber-500" />
                      </div>
                    </button>

                    {isActive && (
                      <div className="px-5 pb-5">
                        {!hasExercises ? (
                          <p className="text-slate-400 text-center py-4">No hay ejercicios para este día.</p>
                        ) : isFinished ? (
                          <div className="animate-fade-in bg-slate-950 border border-amber-500/30 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                            <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-500 animate-bounce" />
                            <h4 className="font-bold text-white text-2xl mb-2">¡Entrenamiento Completado!</h4>
                            <p className="text-slate-400 text-sm mb-6">Buen trabajo. Deja tus notas al profesor.</p>
                            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Ej: Me costó el press, pero subí peso..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm h-24 outline-none focus:border-amber-500 mb-4 resize-none"></textarea>
                            <button onClick={submitWorkout} className="w-full bg-amber-500 text-slate-950 font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-transform">Finalizar y Enviar</button>
                          </div>
                        ) : (
                          
                          <div 
                            className="animate-fade-in touch-pan-y pt-2 border-t border-slate-800/50"
                            onTouchStart={onTouchStart} 
                            onTouchMove={onTouchMove} 
                            onTouchEnd={() => onTouchEnd(totalExercises)}
                          >
                            <div className="flex gap-1.5 mb-5 mt-2">
                              {routine.exercises.map((_, i) => (
                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i === activeExerciseIndex ? 'bg-amber-500' : i < activeExerciseIndex ? 'bg-amber-500/40' : 'bg-slate-800'}`}></div>
                              ))}
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner relative">
                              <h4 className="font-black text-white text-2xl mb-5 text-center mt-1 tracking-tight leading-tight px-4">{activeExercise.name}</h4>
                              
                              <div className="flex gap-3 mb-4 text-sm">
                                <div className="bg-slate-900 py-2 rounded-lg border border-slate-700 text-center flex-1">
                                  <span className="block text-slate-400 text-[10px] uppercase font-bold mb-0.5">Series</span>
                                  <span className="font-bold text-amber-500 text-lg">{activeExercise.sets}</span>
                                </div>
                                <div className="bg-slate-900 py-2 rounded-lg border border-slate-700 text-center flex-1">
                                  <span className="block text-slate-400 text-[10px] uppercase font-bold mb-0.5">Reps</span>
                                  <span className="font-bold text-amber-500 text-lg">{activeExercise.reps}</span>
                                </div>
                                
                                <ExerciseTimer key={activeExerciseIndex} restTimeStr={activeExercise.rest_time} />
                              </div>

                              <LazyYouTube rawUrl={activeExercise.youtube_url} />

                              {activeExercise.notes && (
                                <div className="mt-4 bg-slate-900/50 border border-slate-800 p-3 rounded-xl border-l-2 border-l-amber-500">
                                  <span className="text-[10px] uppercase font-black text-amber-500/70 block mb-1">Nota del entrenador:</span>
                                  <p className="text-sm text-slate-300 italic">"{activeExercise.notes}"</p>
                                </div>
                              )}

                              <div className="mt-5 bg-slate-900 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-slate-300">Carga Utilizada:</span>
                                  <div className="flex items-center gap-2">
                                    <input type="number" placeholder="Ej: 40" value={weights[activeExerciseIndex] || ''} onChange={(e) => setWeights({...weights, [activeExerciseIndex]: e.target.value})} className="bg-slate-950 border border-slate-600 rounded-lg w-20 text-center py-2 text-amber-500 font-black text-lg focus:border-amber-500 outline-none shadow-inner" />
                                    <span className="text-slate-500 text-sm font-bold">Kg</span>
                                  </div>
                                </div>
                                
                                {lastWeights[activeExerciseIndex] && (
                                  <div className="text-right text-[11px] text-slate-400 font-medium">
                                    Última vez levantaste: <span className="text-amber-500/70 font-bold">{lastWeights[activeExerciseIndex]} Kg</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center mt-6 gap-3">
                              <button onClick={prevExercise} disabled={activeExerciseIndex === 0} className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-colors ${activeExerciseIndex === 0 ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-white active:scale-[0.98]'}`}>
                                <ArrowLeft className="w-5 h-5" /> Anterior
                              </button>
                              <button onClick={() => nextExercise(totalExercises)} className="flex-[2] py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-transform bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] text-lg">
                                {activeExerciseIndex === totalExercises - 1 ? (
                                  <>¡Terminar! <Trophy className="w-5 h-5" /></>
                                ) : (
                                  <>Siguiente <ArrowRight className="w-5 h-5" /></>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* PESTAÑA 2: DIARIO DE PROGRESO */}
        {activeTab === 'progress' && (
          <div className="animate-fade-in space-y-6">
            
            <div className="flex justify-between items-center px-1">
              <div>
                <h2 className="text-white font-bold text-lg">Diario Personal</h2>
                <p className="text-xs text-slate-400">Registra tus cargas máximas</p>
              </div>
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 text-xs font-bold bg-[#107c41] hover:bg-[#185c37] text-white px-4 py-2.5 rounded-xl shadow-lg shadow-green-900/20 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-3">Añadir Registro</h3>
              <form onSubmit={handleSavePersonalLog} className="space-y-3">
                <div>
                  <input type="text" required placeholder="Nombre del Ejercicio (Ej: Press Banca)" value={newLog.exercise} onChange={(e) => setNewLog({...newLog, exercise: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 text-white" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input type="number" required placeholder="Peso" value={newLog.weight} onChange={(e) => setNewLog({...newLog, weight: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 text-amber-500 font-bold" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">KG/LBS</span>
                  </div>
                  <div className="flex-1">
                    <input type="text" placeholder="Reps (Ej: 8)" value={newLog.reps} onChange={(e) => setNewLog({...newLog, reps: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 text-white" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 text-sm">
                  <Plus className="w-4 h-4" /> Guardar Progreso
                </button>
              </form>
            </div>

            {/* NUEVO: Buscador */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por ejercicio (ej: Sentadilla)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-amber-500 text-white transition-colors"
              />
            </div>

            {/* Lista Histórica con Paginación */}
            <div className="space-y-3">
              {currentLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 border border-slate-800 border-dashed rounded-xl bg-slate-900/50">
                  {searchTerm ? 'No hay registros con ese nombre.' : 'Aún no tienes registros guardados.'}
                </div>
              ) : (
                currentLogs.map(log => (
                  <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center relative group">
                    <button onClick={() => handleDeletePersonalLog(log.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="font-bold text-white text-sm pr-6">{log.exercise}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        {log.date} a las {log.time}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="block text-amber-500 font-black text-lg">{log.weight}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">({log.reps} Reps)</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                  disabled={currentPage === 1} 
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-xs font-bold"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-slate-400 text-xs font-medium flex items-center">
                  {currentPage} de {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                  disabled={currentPage === totalPages} 
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-xs font-bold"
                >
                  Siguiente
                </button>
              </div>
            )}

          </div>
        )}
      </main>

      {renderSubscriptionStatus()}
    </div>
  );
}