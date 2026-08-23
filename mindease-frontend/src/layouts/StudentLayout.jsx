import StudentSidebar from '../components/StudentSidebar'
import '../styles/StudentLayout.css'

export default function StudentLayout({ children }) {
  return (
    <div className="student-layout">
      <StudentSidebar />

      <main className="student-layout-content">
        {children}
      </main>
    </div>
  )
}