import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import TrainerDashboard from './TrainerDashboard';
import RoutineBuilder from './RoutineBuilder';
import StudentRoutines from './StudentRoutines';
import RoutineEditor from './RoutineEditor';
import StudentDashboard from './StudentDashboard'; // <-- Importamos el panel del alumno

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Rutas de Entrenador */}
        <Route path="/trainer" element={<TrainerDashboard />} />
        <Route path="/trainer/routine/:studentId" element={<RoutineBuilder />} />
        <Route path="/trainer/student/:studentId" element={<StudentRoutines />} />
        <Route path="/trainer/routine-edit/:routineId" element={<RoutineEditor />} />
        
        {/* Ruta de Alumno */}
        <Route path="/student" element={<StudentDashboard />} /> {/* <-- Lo conectamos aquí */}
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}