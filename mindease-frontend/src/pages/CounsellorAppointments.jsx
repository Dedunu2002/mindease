import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import CounsellorSidebar from '../components/CounsellorSidebar'
import '../styles/CounsellorAppointments.css'

const STATUS_CONFIG = {

  pending: {
    label: 'Pending',
    className: 'appointment-status-pending'
  },

  confirmed: {
    label: 'Confirmed',
    className: 'appointment-status-confirmed'
  },

  rejected: {
    label: 'Rejected',
    className: 'appointment-status-rejected'
  },

  completed: {
    label: 'Completed',
    className: 'appointment-status-completed'
  }

}


export default function CounsellorAppointments() {

  const [appointments, setAppointments] = useState([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [statusFilter, setStatusFilter] =
    useState('all')

  const [updatingId, setUpdatingId] =
    useState(null)


  // ==========================================================
  // LOAD APPOINTMENTS
  // ==========================================================

  const loadAppointments = async () => {

    try {

      setLoading(true)
      setError('')

      const response = await api.get(
        '/counsellor/appointments'
      )

      setAppointments(response.data)

    } catch (err) {

      console.error(
        'Appointment loading error:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Could not load appointments.'
      )

    } finally {

      setLoading(false)

    }
  }


  useEffect(() => {
    loadAppointments()
  }, [])


  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredAppointments = useMemo(() => {

    if (statusFilter === 'all') {
      return appointments
    }

    return appointments.filter(
      appointment =>
        appointment.status === statusFilter
    )

  }, [
    appointments,
    statusFilter
  ])


  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  const updateAppointment = async (
    appointmentId,
    status
  ) => {

    const action =
      status === 'confirmed'
        ? 'confirm'
        : 'reject'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this appointment?`
    )

    if (!confirmed) {
      return
    }


    try {

      setUpdatingId(appointmentId)

      await api.post(
        '/counsellor/update_appointment',
        {
          appointment_id: appointmentId,
          status
        }
      )

      await loadAppointments()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        `Could not ${action} appointment.`
      )

    } finally {

      setUpdatingId(null)

    }
  }


  // ==========================================================
  // COMPLETE
  // ==========================================================

  const markCompleted = async appointmentId => {

    try {

      setUpdatingId(appointmentId)

      await api.post(
        '/counsellor/update_appointment',
        {
          appointment_id: appointmentId,
          status: 'completed'
        }
      )

      await loadAppointments()

    } catch (err) {

      alert(
        err.response?.data?.error ||
        'Could not complete appointment.'
      )

    } finally {

      setUpdatingId(null)

    }
  }


  // ==========================================================
  // COUNTS
  // ==========================================================

  const pendingCount =
    appointments.filter(
      a => a.status === 'pending'
    ).length

  const confirmedCount =
    appointments.filter(
      a => a.status === 'confirmed'
    ).length

  const completedCount =
    appointments.filter(
      a => a.status === 'completed'
    ).length

  const rejectedCount =
    appointments.filter(
      a => a.status === 'rejected'
    ).length


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="counsellor-layout">

      <CounsellorSidebar />


      <main className="counsellor-appointments-page">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="appointments-page-header">

          <div>

            <span className="appointments-kicker">
              COUNSELLOR PORTAL
            </span>

            <h1>
              Appointment Management
            </h1>

            <p>
              Review and manage student appointment requests.
            </p>

          </div>


          <button
            className="appointments-refresh"
            onClick={loadAppointments}
          >
            ↻ Refresh
          </button>

        </header>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (

          <div className="appointments-error">
            ⚠️ {error}
          </div>

        )}


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <section className="appointment-summary">

          <div className="appointment-stat pending-stat">

            <span>Pending</span>

            <strong>
              {pendingCount}
            </strong>

            <small>
              Awaiting your action
            </small>

          </div>


          <div className="appointment-stat confirmed-stat">

            <span>Confirmed</span>

            <strong>
              {confirmedCount}
            </strong>

            <small>
              Upcoming sessions
            </small>

          </div>


          <div className="appointment-stat completed-stat">

            <span>Completed</span>

            <strong>
              {completedCount}
            </strong>

            <small>
              Finished sessions
            </small>

          </div>


          <div className="appointment-stat rejected-stat">

            <span>Rejected</span>

            <strong>
              {rejectedCount}
            </strong>

            <small>
              Declined requests
            </small>

          </div>

        </section>


        {/* ==================================================
            MAIN PANEL
        ================================================== */}

        <section className="appointments-panel">

          <div className="appointments-panel-header">

            <div>

              <span>
                SESSION REQUESTS
              </span>

              <h2>
                Student Appointments
              </h2>

            </div>


            <select
              value={statusFilter}
              onChange={e =>
                setStatusFilter(e.target.value)
              }
              className="appointment-filter"
            >

              <option value="all">
                All appointments
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="confirmed">
                Confirmed
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="rejected">
                Rejected
              </option>

            </select>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="appointments-empty">

              <div className="appointment-spinner" />

              <strong>
                Loading appointments...
              </strong>

            </div>

          ) : filteredAppointments.length === 0 ? (

            <div className="appointments-empty">

              <div className="empty-calendar">
                📅
              </div>

              <strong>
                No appointments found
              </strong>

              <span>
                There are no appointments matching
                the selected filter.
              </span>

            </div>

          ) : (

            <div className="appointments-table-wrapper">

              <table className="appointments-table">

                <thead>

                  <tr>

                    <th>
                      STUDENT
                    </th>

                    <th>
                      DATE
                    </th>

                    <th>
                      TIME
                    </th>

                    <th>
                      NOTES
                    </th>

                    <th>
                      STATUS
                    </th>

                    <th>
                      ACTION
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredAppointments.map(
                    appointment => {

                      const status =
                        STATUS_CONFIG[
                          appointment.status
                        ] ||
                        STATUS_CONFIG.pending


                      return (

                        <tr key={appointment.id}>

                          {/* STUDENT */}

                          <td>

                            <div className="appointment-student">

                              <div className="student-avatar">
                                {appointment.student_name
                                  ?.charAt(0)
                                  ?.toUpperCase()}
                              </div>

                              <div>

                                <strong>
                                  {appointment.student_name}
                                </strong>

                                <span>
                                  Appointment #{appointment.id}
                                </span>

                              </div>

                            </div>

                          </td>


                          {/* DATE */}

                          <td>

                            <span className="appointment-date">
                              {new Date(
                                appointment.date +
                                'T00:00:00'
                              ).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                }
                              )}
                            </span>

                          </td>


                          {/* TIME */}

                          <td>

                            <span className="appointment-time">
                              {appointment.time_slot}
                            </span>

                          </td>


                          {/* NOTES */}

                          <td>

                            <span className="appointment-notes">

                              {appointment.notes
                                ? appointment.notes
                                : 'No notes provided'}

                            </span>

                          </td>


                          {/* STATUS */}

                          <td>

                            <span
                              className={`appointment-status ${status.className}`}
                            >
                              {status.label}
                            </span>

                          </td>


                          {/* ACTION */}

                          <td>

                            {appointment.status ===
                              'pending' && (

                              <div className="appointment-actions">

                                <button
                                  className="confirm-appointment"
                                  disabled={
                                    updatingId ===
                                    appointment.id
                                  }
                                  onClick={() =>
                                    updateAppointment(
                                      appointment.id,
                                      'confirmed'
                                    )
                                  }
                                >
                                  {updatingId ===
                                  appointment.id
                                    ? '...'
                                    : 'Confirm'}
                                </button>

                                <button
                                  className="reject-appointment"
                                  disabled={
                                    updatingId ===
                                    appointment.id
                                  }
                                  onClick={() =>
                                    updateAppointment(
                                      appointment.id,
                                      'rejected'
                                    )
                                  }
                                >
                                  Reject
                                </button>

                              </div>

                            )}


                            {appointment.status ===
                              'confirmed' && (

                              <button
                                className="complete-appointment"
                                disabled={
                                  updatingId ===
                                  appointment.id
                                }
                                onClick={() =>
                                  markCompleted(
                                    appointment.id
                                  )
                                }
                              >
                                {updatingId ===
                                appointment.id
                                  ? '...'
                                  : 'Mark Completed'}
                              </button>

                            )}


                            {appointment.status ===
                              'completed' && (

                              <span className="action-complete">
                                ✓ Finished
                              </span>

                            )}


                            {appointment.status ===
                              'rejected' && (

                              <span className="action-rejected">
                                Declined
                              </span>

                            )}

                          </td>

                        </tr>

                      )

                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

    </div>
  )
}