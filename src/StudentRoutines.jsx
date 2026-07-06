import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from './api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  AlertTriangle, CheckCircle, ArrowLeft, Plus, 
  ClipboardList, Activity, Pencil, Trash2, 
  Calendar, ArchiveX, Play, Clock, Repeat,
  Download, FileSpreadsheet
} from 'lucide-react';

export default function StudentRoutines() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const [routines, setRoutines] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('Alumno');
  
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
    // Obtenemos el nombre del alumno desde el listado en caché para el encabezado del PDF/Excel
    const cachedStudents = sessionStorage.getItem('trainer_students');
    if (cachedStudents) {
      const studentsList = JSON.parse(cachedStudents);
      const found = studentsList.find(s => s.id === parseInt(studentId));
      if (found) setStudentName(found.full_name);
    }

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

// ================= EXPORTACIÓN A PDF (VERSIÓN CON LINKS CLICKEABLES) =================
  const handleDownloadPDF = () => {
    // Solo en StudentRoutines necesitas verificar: if (routines.length === 0) return...
    // (Asegúrate de dejar la validación inicial si la tenías)

    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(245, 158, 11); 
      doc.text('ATLETAHUB', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); 
      // Si estás en StudentDashboard, la variable es userProfile?.full_name
      // Si estás en StudentRoutines, la variable es studentName
      const athleteName = typeof studentName !== 'undefined' ? studentName : (userProfile?.full_name || 'Alumno');
      doc.text(`Plan de Entrenamiento - Atleta: ${athleteName}`, 14, 30);

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
            ex.youtube_url ? 'Ver Video' : '-', // <-- Cambiamos la URL fea por un texto limpio
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
            // Le damos color azul y negrita a la columna de videos
            4: { cellWidth: 25, textColor: [37, 99, 235], fontStyle: 'bold', halign: 'center' }, 
            5: { cellWidth: 40 } 
          },
          // LA MAGIA: Hook que se ejecuta al dibujar cada celda
          didDrawCell: (data) => {
            // Si estamos dibujando el cuerpo de la tabla y es la columna de Video (índice 4)
            if (data.section === 'body' && data.column.index === 4) {
              const exercise = routine.exercises[data.row.index];
              if (exercise && exercise.youtube_url) {
                // Creamos un rectángulo invisible y clickeable exactamente del tamaño de la celda
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: exercise.youtube_url });
              }
            }
          }
        });

        startY = doc.lastAutoTable.finalY + 15;

        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }
      });

      const fileName = `Plan_Entrenamiento_${athleteName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      showToast("PDF descargado. ¡Revisa tus archivos!", "success");

    } catch (error) {
      showToast("Error al generar el PDF.", "error");
      console.error(error);
    }
  };

  // ================= EXPORTACIÓN A EXCEL =================
  const exportToExcel = () => {
    if (logs.length === 0) {
      return showToast("No hay registros de entrenamiento para exportar.", "error");
    }

    let csvContent = "Fecha,Rutina,Ejercicio,Peso Levantado (Kg/Lbs),Notas del Alumno\n";
    
    logs.forEach(log => {
      const safeRutina = (log.routine_title || '').replace(/,/g, ' ');
      const safeFeedback = (log.feedback || '').replace(/,/g, ' ').replace(/\n/g, ' ');

      if (log.exercises && log.exercises.length > 0) {
        log.exercises.forEach(ex => {
          const weightUsed = log.weights_data?.[ex.index] || '--';
          const safeExercise = (ex.name || '').replace(/,/g, ' ');
          csvContent += `${log.completed_at},${safeRutina},${safeExercise},${weightUsed},${safeFeedback}\n`;
        });
      } else {
        csvContent += `${log.completed_at},${safeRutina},Sin ejercicios detallados,--,${safeFeedback}\n`;
      }
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Progreso_${studentName.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("¡Progreso exportado a Excel exitosamente!", "success");
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

      {/* NAVBAR OPTIMIZADO PARA MÓVIL */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          <button onClick={() => navigate('/trainer')} className="text-amber-500 font-bold flex items-center gap-1 transition-colors hover:text-amber-400 text-sm whitespace-nowrap shrink-0">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Volver</span>
          </button>
          <h1 className="text-base sm:text-xl font-bold text-white truncate">Seguimiento: <span className="text-amber-500">{studentName}</span></h1>
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
          
          <div>
            {/* BOTÓN EXPORTAR PDF DE RUTINAS */}
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biblioteca de Entrenamiento</span>
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" /> Exportar PDF
              </button>
            </div>

            {routines.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-8 sm:p-12 text-center">
                <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-300 font-medium text-base sm:text-lg">Este alumno aún no tiene rutinas.</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Asígnele una rutina nueva con el botón de arriba.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {routines.map((routine) => (
                  <div key={routine.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden">
                    
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
                    
                    {/* VISTA MÓVIL */}
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

                    {/* VISTA ESCRITORIO */}
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
            )}
          </div>
        ) : (
          
          <div>
            {/* BOTÓN EXPORTAR EXCEL DE PROGRESO */}
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registros de Cargas</span>
              <button 
                onClick={exportToExcel}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-[#107c41] hover:bg-[#185c37] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-lg shadow-green-900/20 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
              </button>
            </div>

            {logs.length === 0 ? (
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}