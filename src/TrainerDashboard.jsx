import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from './api';
import { 
  Users, FileText, Search, UserPlus, Dumbbell, Settings, 
  Wallet, MessageCircle, Pencil, AlertTriangle, CheckCircle, 
  X, LogOut, ChevronLeft, ChevronRight, Plus 
} from 'lucide-react';

export default function TrainerDashboard() {
  const [students, setStudents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [trainerProfile, setTrainerProfile] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('students'); 
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', action: null });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newStudent, setNewStudent] = useState({ email: '', full_name: '', phone: '', password: '', role: 'student' });
  
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, student: null, amount: 0 });
  const [isPaying, setIsPaying] = useState(false);

  const [manageModal, setManageModal] = useState({ isOpen: false, student: null, activeSubTab: 'edit', history: [] });
  const [editFields, setEditFields] = useState({ is_active: true, expiration_date: '', default_price: 0, phone: '' });
  const [isSavingManagement, setIsSavingManagement] = useState(false);

  const [studentPassword, setStudentPassword] = useState('');
  const [isUpdatingStudentPass, setIsUpdatingStudentPass] = useState(false);
  
  const [profileModal, setProfileModal] = useState({ isOpen: false, newPassword: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const STUDENTS_PER_PAGE = 8;
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const PAYMENTS_PER_PAGE = 5;

  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PY', { style: 'decimal' }).format(amount || 0);
  };

  const fetchData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const [studentsRes, templatesRes, profileRes] = await Promise.all([
        API.get('/users/my-students'),
        API.get('/routines/trainer/templates'),
        API.get('/users/me/profile') 
      ]);
      
      setStudents(studentsRes.data);
      setTemplates(templatesRes.data);
      setTrainerProfile(profileRes.data);

      sessionStorage.setItem('trainer_students', JSON.stringify(studentsRes.data));
      sessionStorage.setItem('trainer_templates', JSON.stringify(templatesRes.data));
      sessionStorage.setItem('trainer_profile', JSON.stringify(profileRes.data));

    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally {
      if (showLoadingIndicator) setLoading(false);
    }
  };

  useEffect(() => {
    const cachedStudents = sessionStorage.getItem('trainer_students');
    const cachedTemplates = sessionStorage.getItem('trainer_templates');
    const cachedProfile = sessionStorage.getItem('trainer_profile');

    if (cachedStudents && cachedTemplates && cachedProfile) {
      setStudents(JSON.parse(cachedStudents));
      setTemplates(JSON.parse(cachedTemplates));
      setTrainerProfile(JSON.parse(cachedProfile));
      setLoading(false); 
      fetchData(false); 
    } else {
      fetchData(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.clear(); 
    navigate('/');
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    // SANITIZACIÓN: Limpiamos espacios y convertimos el correo estrictamente a minúsculas
    const sanitizedStudent = {
      ...newStudent,
      email: newStudent.email.trim().toLowerCase()
    };

    try {
      await API.post('/users/students', sanitizedStudent);
      setNewStudent({ email: '', full_name: '', phone: '', password: '', role: 'student' }); 
      setIsCreateModalOpen(false);
      showToast("Atleta creado con éxito", "success");
      fetchData(false); 
    } catch (err) {
      showToast(err.response?.data?.detail || "Error al crear alumno", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const openManagementModal = async (student) => {
    const formattedDate = student.expiration_date ? student.expiration_date.split('T')[0] : '';
    setManageModal({ isOpen: true, student, activeSubTab: 'edit', history: [] });
    setStudentPassword(''); 
    setPaymentCurrentPage(1); 
    setEditFields({
      is_active: student.is_active,
      expiration_date: formattedDate,
      default_price: student.default_price || 0,
      phone: student.phone || '' 
    });

    try {
      const response = await API.get(`/users/students/${student.id}/payments`);
      setManageModal(prev => ({ ...prev, history: response.data }));
    } catch (err) {
      console.error("No se pudo cargar el historial de pagos");
    }
  };

  const handleSaveManagement = async (e) => {
    e.preventDefault();
    setIsSavingManagement(true);
    try {
      await API.put(`/users/students/${manageModal.student.id}/manage`, {
        is_active: editFields.is_active,
        expiration_date: editFields.expiration_date ? `${editFields.expiration_date}T23:59:59Z` : null,
        default_price: parseFloat(editFields.default_price),
        phone: editFields.phone 
      });
      setManageModal({ isOpen: false, student: null, activeSubTab: 'edit', history: [] });
      showToast("Datos actualizados con éxito", "success");
      fetchData(false);
    } catch (err) {
      showToast("Error al guardar cambios", "error");
    } finally {
      setIsSavingManagement(false);
    }
  };

  const handleUpdateStudentPassword = async (e) => {
    e.preventDefault();
    if (!studentPassword || studentPassword.length < 6) return showToast("La contraseña debe tener al menos 6 caracteres.", "error");
    setIsUpdatingStudentPass(true);
    try {
      await API.put(`/users/students/${manageModal.student.id}/password`, { new_password: studentPassword });
      showToast("Contraseña del alumno actualizada con éxito.", "success");
      setStudentPassword('');
    } catch (err) {
      showToast("Error al actualizar la contraseña.", "error");
    } finally {
      setIsUpdatingStudentPass(false);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    setIsPaying(true);
    try {
      const amountToSend = typeof paymentModal.amount === 'string' ? parseFloat(paymentModal.amount.replace(/\./g, '')) : paymentModal.amount;
      await API.post(`/users/students/${paymentModal.student.id}/pay`, {
        amount: amountToSend,
        add_months: 1,
        notes: "Mensualidad Regularizada"
      });
      setPaymentModal({ isOpen: false, student: null, amount: 0 });
      showToast("Pago registrado con éxito", "success");
      fetchData(false);
    } catch (err) {
      showToast("Error al registrar el pago", "error");
    } finally {
      setIsPaying(false);
    }
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

  const handleDeleteTemplateClick = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Plantilla',
      message: '¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer y desaparecerá de tu listado.',
      action: async () => {
        try {
          await API.delete(`/routines/${id}`);
          showToast("Plantilla eliminada correctamente", "success");
          fetchData(false);
        } catch (err) {
          showToast("Error al eliminar la plantilla", "error");
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', action: null });
        }
      }
    });
  };

  const getPaymentStatus = (expirationDate, isActive) => {
    if (!isActive) return { label: 'Inactivo', color: 'bg-slate-800 text-slate-400 border-slate-700', isExpired: false, isExpiringSoon: false, dateStr: 'Deshabilitado' };
    if (!expirationDate) return { label: 'Sin plan', color: 'bg-slate-700 text-slate-300 border-slate-600', isExpired: false, isExpiringSoon: false, dateStr: 'No registrado' };
    
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    const formattedDate = expDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (daysLeft < 0) return { label: 'Vencido', color: 'bg-red-500/10 text-red-500 border-red-500/20', isExpired: true, isExpiringSoon: false, dateStr: formattedDate };
    if (daysLeft <= 5) return { label: `Vence en ${daysLeft} d`, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', isExpired: false, isExpiringSoon: true, dateStr: formattedDate };
    return { label: 'Al día', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', isExpired: false, isExpiringSoon: false, dateStr: formattedDate };
  };

  const generateWhatsAppLink = (student, status) => {
    const baseLink = student.phone ? `https://wa.me/${student.phone.replace(/\D/g, '')}` : `https://wa.me/`;
    
    let text = '';
    if (status.isExpired) {
      text = encodeURIComponent(`¡Hola ${student.full_name}! 🏋️ Espero que estés súper. Te escribo para recordarte que tu mensualidad de entrenamiento ha vencido. ¡Avisame cuando puedas regularizarlo para que no se pause tu plan! 💪`);
    } else if (status.isExpiringSoon) {
      text = encodeURIComponent(`¡Hola ${student.full_name}! 🏋️ Paso a recordarte que tu mes de entrenamiento vence pronto (${status.dateStr}). ¡Para que lo tengas en cuenta y sigamos entrenando a tope! 💪`);
    }
    return `${baseLink}?text=${text}`;
  };

  const filteredStudents = useMemo(() => {
    setStudentCurrentPage(1); 
    return students.filter(s => {
      const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const today = new Date();
      const isExpired = s.expiration_date && new Date(s.expiration_date) < today;

      if (statusFilter === 'active') return s.is_active && !isExpired;
      if (statusFilter === 'expired') return s.is_active && isExpired;
      if (statusFilter === 'inactive') return !s.is_active;
      return true; 
    });
  }, [students, searchQuery, statusFilter]);

  const indexOfLastStudent = studentCurrentPage * STUDENTS_PER_PAGE;
  const indexOfFirstStudent = indexOfLastStudent - STUDENTS_PER_PAGE;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalStudentPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);

  const paginateStudents = (pageNumber) => setStudentCurrentPage(pageNumber);

  const indexOfLastPayment = paymentCurrentPage * PAYMENTS_PER_PAGE;
  const indexOfFirstPayment = indexOfLastPayment - PAYMENTS_PER_PAGE;
  const currentPayments = manageModal.history.slice(indexOfFirstPayment, indexOfLastPayment);
  const totalPaymentPages = Math.ceil(manageModal.history.length / PAYMENTS_PER_PAGE);

  const paginatePayments = (pageNumber) => setPaymentCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative pb-10">
      
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

      {profileModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Mi Perfil</h3>
              <button onClick={() => setProfileModal({ isOpen: false, newPassword: '' })} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {trainerProfile && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 shadow-inner">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Credenciales de Acceso</span>
                <p className="text-white font-bold text-sm">{trainerProfile.full_name}</p>
                <p className="text-slate-400 text-xs">{trainerProfile.email}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProfilePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cambiar mi Contraseña</label>
                <input 
                  type="password" required minLength="6" placeholder="Nueva contraseña (mín 6 carácteres)"
                  value={profileModal.newPassword} onChange={(e) => setProfileModal({...profileModal, newPassword: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" 
                />
              </div>
              <button type="submit" disabled={isUpdatingProfile} className="w-full bg-amber-500 text-slate-950 font-bold py-3.5 rounded-xl mt-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform">
                {isUpdatingProfile ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 pb-0 sm:pb-4">
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-amber-500" /> Nuevo Atleta
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                <input type="text" required value={newStudent.full_name} onChange={(e) => setNewStudent({...newStudent, full_name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input type="email" required value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp (Con código de país, ej: 595981...)</label>
                <input type="text" placeholder="Opcional" value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contraseña Temporal</label>
                <input type="password" required value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-colors" />
              </div>
              <button type="submit" disabled={isCreating} className="w-full bg-amber-500 text-slate-950 font-bold py-3.5 rounded-xl mt-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform">
                {isCreating ? 'Creando perfil...' : 'Crear Cuenta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {manageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" /> Ficha de Control
                </h3>
                <p className="text-sm text-amber-500 font-semibold mt-1">{manageModal.student.full_name}</p>
              </div>
              <button onClick={() => setManageModal({ isOpen: false, student: null, activeSubTab: 'edit', history: [] })} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex border-b border-slate-800 my-4 gap-4 text-xs font-bold uppercase tracking-wider overflow-x-auto hide-scrollbar">
              <button onClick={() => setManageModal({...manageModal, activeSubTab: 'edit'})} className={`pb-2 whitespace-nowrap ${manageModal.activeSubTab === 'edit' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400'}`}>Datos Generales</button>
              <button onClick={() => setManageModal({...manageModal, activeSubTab: 'history'})} className={`pb-2 whitespace-nowrap ${manageModal.activeSubTab === 'history' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400'}`}>Pagos ({manageModal.history.length})</button>
              <button onClick={() => setManageModal({...manageModal, activeSubTab: 'password'})} className={`pb-2 whitespace-nowrap flex items-center gap-1 ${manageModal.activeSubTab === 'password' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400'}`}>
                Seguridad
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {manageModal.activeSubTab === 'edit' && (
                <form onSubmit={handleSaveManagement} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs text-slate-400 uppercase font-black mb-1">Estado del Alumno</label>
                    <select value={editFields.is_active ? 'true' : 'false'} onChange={(e) => setEditFields({...editFields, is_active: e.target.value === 'true'})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none">
                      <option value="true">Activo / Permitir acceso</option>
                      <option value="false">Inactivo / Bloquear cuenta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 uppercase font-black mb-1">Teléfono de WhatsApp</label>
                    <input type="text" placeholder="Con código de país (ej: 595981...)" value={editFields.phone} onChange={(e) => setEditFields({...editFields, phone: e.target.value.replace(/\D/g,'')})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col justify-end">
                      <label className="block text-xs text-slate-400 uppercase font-black mb-1">Vencimiento Manual</label>
                      <input type="date" value={editFields.expiration_date} onChange={(e) => setEditFields({...editFields, expiration_date: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none text-center" />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="block text-xs text-slate-400 uppercase font-black mb-1">Cuota (Gs.)</label>
                      <input type="text" value={editFields.default_price} onChange={(e) => setEditFields({...editFields, default_price: e.target.value.replace(/\D/g,'')})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none" />
                    </div>
                  </div>
                  
                  <button type="submit" disabled={isSavingManagement} className="w-full bg-amber-500 text-slate-950 font-bold py-3.5 rounded-xl mt-4 active:scale-[0.98] transition-transform">
                    {isSavingManagement ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </form>
              )}

              {manageModal.activeSubTab === 'history' && (
                <div className="space-y-2 pt-1">
                  {manageModal.history.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">Este alumno no registra pagos.</p>
                  ) : (
                    <>
                      {currentPayments.map((pay) => (
                        <div key={pay.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                          <div>
                            <p className="text-white font-bold">Gs. {formatCurrency(pay.amount)}</p>
                            <p className="text-xs text-slate-500">{pay.notes || 'Mensualidad'}</p>
                          </div>
                          <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400 border border-slate-800">
                            {new Date(pay.payment_date).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      ))}
                      {totalPaymentPages > 1 && (
                        <div className="flex justify-center mt-4 gap-2">
                          <button onClick={() => paginatePayments(Math.max(1, paymentCurrentPage - 1))} disabled={paymentCurrentPage === 1} className="p-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                          <span className="text-slate-400 text-xs px-2 py-1 flex items-center">Pág {paymentCurrentPage} de {totalPaymentPages}</span>
                          <button onClick={() => paginatePayments(Math.min(totalPaymentPages, paymentCurrentPage + 1))} disabled={paymentCurrentPage === totalPaymentPages} className="p-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {manageModal.activeSubTab === 'password' && (
                <form onSubmit={handleUpdateStudentPassword} className="space-y-4 pt-1">
                  
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-2 shadow-inner">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Cuenta del Alumno</span>
                    <p className="text-white font-bold text-sm">{manageModal.student.full_name}</p>
                    <p className="text-slate-400 text-xs">{manageModal.student.email}</p>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 text-xs text-amber-500">
                    Cambia la contraseña de este alumno si la ha olvidado. Él usará la nueva contraseña para iniciar sesión.
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 uppercase font-black mb-1">Nueva Contraseña</label>
                    <input 
                      type="text" required minLength="6" placeholder="Mínimo 6 carácteres"
                      value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none" 
                    />
                  </div>
                  <button type="submit" disabled={isUpdatingStudentPass} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl mt-2 transition-colors">
                    {isUpdatingStudentPass ? 'Actualizando...' : 'Restablecer Contraseña'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <Wallet className="w-6 h-6 text-amber-500" /> Cobrar Mensualidad
            </h3>
            <p className="text-sm text-slate-400 mb-6">Suma 1 mes a: <span className="text-amber-500 font-semibold">{paymentModal.student.full_name}</span></p>
            <form onSubmit={handleRegisterPayment}>
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg overflow-hidden mb-6">
                <span className="px-4 text-slate-400 font-bold">Gs.</span>
                <input 
                  type="text" 
                  required 
                  value={paymentModal.amount ? formatCurrency(paymentModal.amount) : ''} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\./g, '');
                    if (!isNaN(val)) setPaymentModal({...paymentModal, amount: val})
                  }} 
                  className="w-full bg-transparent py-3 text-white outline-none" 
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPaymentModal({ isOpen: false, student: null, amount: 0 })} className="flex-1 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800">Cancelar</button>
                <button type="submit" disabled={isPaying} className="flex-1 py-3 rounded-xl font-bold text-slate-950 bg-amber-500">{isPaying ? '...' : 'Registrar Pago'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
        <div>
          <h1 className="text-lg md:text-xl font-extrabold text-amber-500 tracking-tight leading-none">ATLETAHUB</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Centro de Mando</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setProfileModal({ isOpen: true, newPassword: '' })} className="text-sm text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" /> Mi Perfil
          </button>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-2">
        
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab('students')} className={`py-3 px-6 font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'students' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400'}`}>
            <Users className="w-5 h-5" /> Directorio de Alumnos ({students.length})
          </button>
          <button onClick={() => setActiveTab('templates')} className={`py-3 px-6 font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === 'templates' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400'}`}>
            <FileText className="w-5 h-5" /> Plantillas Maestras ({templates.length})
          </button>
        </div>

        {activeTab === 'students' ? (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar atleta por nombre..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition-colors flex justify-center items-center gap-2 whitespace-nowrap"
              >
                <UserPlus className="w-5 h-5" /> Nuevo Alumno
              </button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar text-xs font-bold uppercase tracking-wider">
              <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${statusFilter === 'all' ? 'bg-amber-500 border-amber-500 text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Todos</button>
              <button onClick={() => setStatusFilter('active')} className={`px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${statusFilter === 'active' ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Activos/Al Día</button>
              <button onClick={() => setStatusFilter('expired')} className={`px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${statusFilter === 'expired' ? 'bg-red-500 border-red-500 text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Vencidos</button>
              <button onClick={() => setStatusFilter('inactive')} className={`px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${statusFilter === 'inactive' ? 'bg-slate-700 border-slate-700 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Inactivos</button>
            </div>

            {loading ? <p className="text-slate-500 py-10 text-center animate-pulse">Cargando base de datos...</p> : 
              filteredStudents.length === 0 ? <div className="bg-slate-900 p-10 rounded-2xl text-center text-slate-500 border border-slate-800 border-dashed flex flex-col items-center gap-3"><Users className="w-10 h-10 opacity-50"/>Ningún alumno coincide con este filtro.</div> : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentStudents.map((student) => {
                    const status = getPaymentStatus(student.expiration_date, student.is_active);
                    return (
                      <div key={student.id} className={`bg-slate-900 border ${student.is_active ? 'border-slate-800 shadow-lg shadow-black/20' : 'border-slate-800/40 bg-slate-900/40'} rounded-2xl p-5 flex flex-col justify-between transition-all`}>
                        <div>
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h3 className="font-bold text-base text-white truncate w-full">{student.full_name}</h3>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border whitespace-nowrap ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium mb-4 flex items-center gap-1">
                            <span className="text-slate-500">Vence:</span> 
                            <span className={status.isExpired ? "text-red-400 font-bold" : "text-slate-200"}>{status.dateStr}</span>
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 mt-auto border-t border-slate-800/60 pt-4">
                          <button disabled={!student.is_active} onClick={() => navigate(`/trainer/student/${student.id}`)} className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex justify-center items-center gap-2">
                            <Dumbbell className="w-4 h-4" /> Ver Rutinas
                          </button>
                          <div className="flex gap-2">
                            <button onClick={() => openManagementModal(student)} className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 text-xs font-bold py-2.5 rounded-xl transition-colors flex justify-center items-center gap-1.5">
                              <Settings className="w-4 h-4" /> Ficha
                            </button>
                            <button disabled={!student.is_active} onClick={() => setPaymentModal({ isOpen: true, student: student, amount: student.default_price || 0 })} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-30 text-amber-500 border border-amber-500/20 text-xs font-black py-2.5 rounded-xl transition-colors flex justify-center items-center gap-1.5">
                              <Wallet className="w-4 h-4" /> Cobrar
                            </button>
                            {(status.isExpired || status.isExpiringSoon) && (
                              <a href={generateWhatsAppLink(student, status)} target="_blank" rel="noreferrer" className={`p-2.5 rounded-xl transition-colors flex items-center justify-center text-sm border ${status.isExpired ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20' : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/20'}`} title="Enviar recordatorio por WhatsApp">
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalStudentPages > 1 && (
                  <div className="flex justify-center mt-8 gap-2">
                    <button onClick={() => paginateStudents(Math.max(1, studentCurrentPage - 1))} disabled={studentCurrentPage === 1} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50">Anterior</button>
                    {Array.from({ length: totalStudentPages }, (_, i) => (
                      <button key={i + 1} onClick={() => paginateStudents(i + 1)} className={`px-4 py-2 rounded-lg ${studentCurrentPage === i + 1 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => paginateStudents(Math.min(totalStudentPages, studentCurrentPage + 1))} disabled={studentCurrentPage === totalStudentPages} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50">Siguiente</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <p className="text-slate-400 text-sm">Crea entrenamientos base para asignarlos rápidamente a cualquier alumno.</p>
              <button 
                onClick={() => navigate('/trainer/routine/template')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition-colors flex justify-center items-center gap-2 whitespace-nowrap w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" /> Nueva Plantilla
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.length === 0 && !loading ? (
                <div className="col-span-1 sm:col-span-2 bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-10 text-center flex flex-col items-center">
                  <FileText className="w-12 h-12 text-slate-700 mb-4" />
                  <p className="text-slate-400">Aún no tienes plantillas maestras creadas.</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/30 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md uppercase tracking-wider">{template.day_of_week}</span>
                          <h3 className="font-bold text-xl text-white mt-2">{template.title}</h3>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm mb-6 border-b border-slate-800 pb-4">Contiene <strong className="text-slate-200">{template.exercises.length}</strong> ejercicios preconfigurados.</p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => navigate(`/trainer/routine-edit/${template.id}`, { state: { routine: template, studentId: null } })} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-xl flex justify-center items-center gap-2">
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                      <button onClick={() => handleDeleteTemplateClick(template.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 text-sm font-semibold py-2.5 px-4 rounded-xl">Eliminar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}