import { useState, useMemo } from 'react';
import { useServiceRequests, useScheduledJobs } from '../hooks/useDispatchData';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Time columns: 7 AM → 6 PM (11 one-hour slots) */
const HOUR_COLUMNS = Array.from({ length: 11 }, (_, i) => i + 7);

// ─── Date Utility Helpers ─────────────────────────────────────────────────────

/** Return a local YYYY-MM-DD string for a given Date object */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD */
function todayStr(): string {
  return toDateStr(new Date());
}

/**
 * Given a cursor Date and viewMode, return the ordered array of YYYY-MM-DD
 * strings that should appear as row headers in the calendar.
 *
 * Week View  → 7 days starting from the Monday of the week containing cursor
 * Month View → all days in the calendar month of the cursor
 */
function buildCalendarDates(cursor: Date, viewMode: 'week' | 'month'): string[] {
  if (viewMode === 'week') {
    // Snap to the Monday of the cursor's week
    const monday = new Date(cursor);
    const dow = monday.getDay(); // 0=Sun … 6=Sat
    const diff = dow === 0 ? -6 : 1 - dow; // shift so Monday=0
    monday.setDate(monday.getDate() + diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return toDateStr(d);
    });
  } else {
    // All days in the cursor's calendar month
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return toDateStr(d);
    });
  }
}

/**
 * Build the human-readable center label string.
 *
 * Week View  → "26 July – 01 August, 2026"
 * Month View → "July 2026"
 */
function buildLabel(cursor: Date, viewMode: 'week' | 'month'): string {
  if (viewMode === 'month') {
    return cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  // Week view: compute Mon→Sun span
  const monday = new Date(cursor);
  const dow = monday.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diff);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString(undefined, opts);

  const startDay = fmt(monday, { day: '2-digit' });
  const startMonth = fmt(monday, { month: 'long' });
  const endDay = fmt(sunday, { day: '2-digit' });
  const endMonth = fmt(sunday, { month: 'long' });
  const endYear = sunday.getFullYear();

  // Same-month? → "26 – 01 July, 2026"  Cross-month? → "26 July – 01 August, 2026"
  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay} – ${endDay} ${endMonth}, ${endYear}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}, ${endYear}`;
}

/** Format a YYYY-MM-DD string into "Mon, Jul 9" */
function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Format an integer hour into "7:00 AM" / "1:00 PM" */
function formatHour(hour: number): string {
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

// ─── TaskChip Sub-component ───────────────────────────────────────────────────

interface TaskChipProps {
  jobId: string;
  srId: string;
  client: string;
  service: string;
  onClick: () => void;
}

function TaskChip({ srId, client, service, onClick }: TaskChipProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${srId} — ${client}: ${service}`}
      style={{
        backgroundColor: hovered ? '#1565c0' : '#1976d2',
        color: '#ffffff',
        borderRadius: '6px',
        padding: '4px 7px',
        fontSize: '0.68rem',
        fontWeight: 700,
        cursor: 'pointer',
        marginBottom: '3px',
        boxShadow: hovered
          ? '0 3px 10px rgba(25,118,210,0.55)'
          : '0 1px 4px rgba(25,118,210,0.3)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
        borderLeft: '3px solid #90caf9',
        userSelect: 'none',
      }}
    >
      <span style={{ opacity: 0.8, marginRight: '3px' }}>{srId}</span>
      <span style={{ opacity: 0.65, fontWeight: 400, fontSize: '0.62rem' }}>
        {client.length > 14 ? client.slice(0, 14) + '…' : client}
      </span>
    </div>
  );
}

// ─── Nav Arrow Button Sub-component ──────────────────────────────────────────

interface NavArrowProps {
  direction: 'left' | 'right';
  onClick: () => void;
  label: string;
}

function NavArrow({ direction, onClick, label }: NavArrowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.35)',
        backgroundColor: hovered ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
        color: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
        boxShadow: hovered ? '0 0 0 3px rgba(255,255,255,0.12)' : 'none',
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === 'left' ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ViewMode = 'week' | 'month';

export default function TechDashboard() {
  const { serviceRequests, loading: srLoading } = useServiceRequests();
  const { scheduledJobs, loading: jobsLoading } = useScheduledJobs();

  // ── Navigation state ──────────────────────────────────────────────────────
  // `currentDate` acts as the cursor. All date computation derives from it.
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // ── Step backward / forward ───────────────────────────────────────────────
  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'week') {
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        // Month view: shift by exactly 1 calendar month, preserving clamped day
        const targetMonth = d.getMonth() + (direction === 'next' ? 1 : -1);
        d.setDate(1);              // prevent day-overflow when changing months
        d.setMonth(targetMonth);
      }
      return d;
    });
  };

  // ── Derived calendar dates (rows) ─────────────────────────────────────────
  const calendarDates = useMemo(
    () => buildCalendarDates(currentDate, viewMode),
    [currentDate, viewMode]
  );

  // ── Center label ─────────────────────────────────────────────────────────
  const centerLabel = useMemo(
    () => buildLabel(currentDate, viewMode),
    [currentDate, viewMode]
  );

  // ── Today string (for row highlighting) ──────────────────────────────────
  const today = todayStr();

  // ── Job grid lookup: "YYYY-MM-DD::HH" → array of chip data ──────────────
  type ChipData = {
    jobId: string;
    srId: string;
    client: string;
    service: string;
  };

  const jobGrid = useMemo(() => {
    const grid: Record<string, ChipData[]> = {};

    scheduledJobs.forEach((job) => {
      const date = job.scheduledDate;
      const hour = job.startHour;
      if (!date || hour == null) return;

      // Only render chips that fall within the currently visible date window
      if (!calendarDates.includes(date)) return;

      const sr = serviceRequests.find((r) => r.id === job.serviceRequestId);
      const key = `${date}::${hour}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push({
        jobId: job.id || '',
        srId: job.serviceRequestId || job.id || '',
        client: sr?.client || 'Unknown',
        service: sr?.service || 'Service',
      });
    });

    return grid;
  }, [scheduledJobs, serviceRequests, calendarDates]);

  // ── Navigate to FieldExecution with context ───────────────────────────────
  const handleChipClick = (jobId: string, srId: string) => {
    sessionStorage.setItem('previousView', 'TECH_DASHBOARD');
    sessionStorage.setItem('selectedJobId', jobId);
    sessionStorage.setItem('selectedSrId', srId);
    window.location.href = '/technician';
  };

  const isLoading = srLoading || jobsLoading;

  // ── Layout constants ──────────────────────────────────────────────────────
  const rowLabelWidth = 130;
  const colMinWidth = 100;

  // Compact row height for month view so all days stay visible without excessive scroll
  const rowMinHeight = viewMode === 'month' ? 44 : 60;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          UNIFIED CONTROL HEADER
          Left  │  [Back btn]  [Title]
          Center │  [←]  [Date Range Label]  [→]
          Right  │  [View Mode ▾]
      ════════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          backgroundColor: '#1565c0',
          color: '#ffffff',
          padding: '0 20px',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
          position: 'sticky',
          top: 0,
          zIndex: 200,
          flexShrink: 0,
          gap: '12px',
        }}
      >
        {/* ── LEFT: Back button + Title ──────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <button
            id="tech-dashboard-back-btn"
            onClick={() => (window.location.href = '/')}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'rgba(255,255,255,0.25)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'rgba(255,255,255,0.12)')
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.78rem',
              padding: '7px 14px',
              cursor: 'pointer',
              letterSpacing: '0.25px',
              transition: 'background-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Admin Master View
          </button>

          {/* Title block */}
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, letterSpacing: '0.15px' }}>
              Technician Calendar
            </div>
            <div style={{ fontSize: '0.67rem', opacity: 0.7, marginTop: '1px' }}>
              {scheduledJobs.length} jobs loaded
            </div>
          </div>
        </div>

        {/* ── CENTER: Navigation ribbon ──────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 1,
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <NavArrow direction="left" onClick={() => navigate('prev')} label="Previous period" />

          {/* Date range label pill */}
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.14)',
              border: '1.5px solid rgba(255,255,255,0.28)',
              borderRadius: '999px',         // full pill shape
              padding: '6px 20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.2px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '360px',
              minWidth: '180px',
              color: '#ffffff',
              userSelect: 'none',
            }}
          >
            {centerLabel}
          </div>

          <NavArrow direction="right" onClick={() => navigate('next')} label="Next period" />

          {/* Today shortcut */}
          <button
            onClick={() => setCurrentDate(new Date())}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'rgba(255,255,255,0.22)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'rgba(255,255,255,0.1)')
            }
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1.5px solid rgba(255,255,255,0.28)',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '5px 12px',
              cursor: 'pointer',
              letterSpacing: '0.3px',
              transition: 'background-color 0.15s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Today
          </button>
        </div>

        {/* ── RIGHT: View Mode dropdown ──────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <label
            htmlFor="view-mode-select"
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              opacity: 0.65,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            View Mode
          </label>
          <div style={{ position: 'relative' }}>
            {/* Custom-styled wrapper so the caret sits nicely */}
            <select
              id="view-mode-select"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundColor: 'rgba(255,255,255,0.14)',
                border: '1.5px solid rgba(255,255,255,0.32)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '7px 36px 7px 14px',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '130px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLSelectElement).style.backgroundColor =
                  'rgba(255,255,255,0.22)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLSelectElement).style.backgroundColor =
                  'rgba(255,255,255,0.14)')
              }
            >
              <option value="week" style={{ backgroundColor: '#1565c0', color: '#fff' }}>
                Week View
              </option>
              <option value="month" style={{ backgroundColor: '#1565c0', color: '#fff' }}>
                Month View
              </option>
            </select>
            {/* Custom dropdown caret */}
            <span
              style={{
                position: 'absolute',
                right: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.7rem',
              }}
            >
              ▾
            </span>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          LOADING SPINNER
      ════════════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: '#666',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e0e0e0',
              borderTop: '4px solid #1976d2',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading schedule data…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════════
            CALENDAR GRID
        ════════════════════════════════════════════════════════════════ */
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              overflow: 'hidden',
              minWidth: `${rowLabelWidth + HOUR_COLUMNS.length * colMinWidth}px`,
            }}
          >
            {/* ── Column Header Row (Time Labels) ────────────────────────── */}
            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid #e0e0e0',
                backgroundColor: '#fafafa',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              {/* Corner cell */}
              <div
                style={{
                  width: `${rowLabelWidth}px`,
                  minWidth: `${rowLabelWidth}px`,
                  flexShrink: 0,
                  padding: '10px 12px',
                  borderRight: '2px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#1565c0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {viewMode === 'week' ? 'Week Day' : 'Day'}
                </span>
              </div>

              {/* Time column headers */}
              {HOUR_COLUMNS.map((hour) => (
                <div
                  key={hour}
                  style={{
                    flex: 1,
                    minWidth: `${colMinWidth}px`,
                    padding: '10px 4px',
                    textAlign: 'center',
                    borderRight: '1px solid #e8e8e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1565c0' }}>
                    {formatHour(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Date Rows ──────────────────────────────────────────────── */}
            {calendarDates.map((dateStr, rowIdx) => {
              const isCurrentDay = dateStr === today;
              const isEvenRow = rowIdx % 2 === 0;

              return (
                <div
                  key={dateStr}
                  style={{
                    display: 'flex',
                    borderBottom:
                      rowIdx < calendarDates.length - 1 ? '1px solid #eee' : 'none',
                    backgroundColor: isCurrentDay
                      ? '#f0f7ff'
                      : isEvenRow
                      ? '#ffffff'
                      : '#fafafa',
                    minHeight: `${rowMinHeight}px`,
                    transition: 'background-color 0.12s',
                  }}
                >
                  {/* ── Row Label ──────────────────────────────────────── */}
                  <div
                    style={{
                      width: `${rowLabelWidth}px`,
                      minWidth: `${rowLabelWidth}px`,
                      flexShrink: 0,
                      borderRight: '2px solid #e0e0e0',
                      padding: '6px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: isCurrentDay ? '#dbeafe' : 'inherit',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: isCurrentDay ? 800 : 600,
                        color: isCurrentDay ? '#1565c0' : '#374151',
                        lineHeight: 1.3,
                      }}
                    >
                      {formatDateLabel(dateStr)}
                    </span>
                    {isCurrentDay && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.55rem',
                          fontWeight: 800,
                          color: '#1d4ed8',
                          backgroundColor: '#bfdbfe',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          marginTop: '3px',
                          alignSelf: 'flex-start',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Today
                      </span>
                    )}
                  </div>

                  {/* ── Hour Cells ─────────────────────────────────────── */}
                  {HOUR_COLUMNS.map((hour) => {
                    const key = `${dateStr}::${hour}`;
                    const chips = jobGrid[key] || [];

                    return (
                      <div
                        key={hour}
                        style={{
                          flex: 1,
                          minWidth: `${colMinWidth}px`,
                          borderRight: '1px solid #eee',
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          position: 'relative',
                          transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          if (chips.length === 0)
                            (e.currentTarget as HTMLDivElement).style.backgroundColor =
                              '#eff6ff';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor =
                            'transparent';
                        }}
                      >
                        {chips.map((chip) => (
                          <TaskChip
                            key={chip.jobId}
                            jobId={chip.jobId}
                            srId={chip.srId}
                            client={chip.client}
                            service={chip.service}
                            onClick={() => handleChipClick(chip.jobId, chip.srId)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ── Legend bar ─────────────────────────────────────────────────── */}
          <div
            style={{
              marginTop: '14px',
              padding: '10px 16px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              borderLeft: '4px solid #1976d2',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>
              💡 Quick Guide
            </span>
            <span style={{ fontSize: '0.7rem', color: '#1d4ed8' }}>
              • Blue chips = scheduled jobs — click to open the execution checklist.
            </span>
            <span style={{ fontSize: '0.7rem', color: '#1d4ed8' }}>
              • Highlighted row = Today. Use ← → arrows to navigate between periods.
            </span>
            <span style={{ fontSize: '0.7rem', color: '#1d4ed8' }}>
              • Switch between <strong>Week View</strong> (7 rows) and{' '}
              <strong>Month View</strong> (28–31 rows) using the top-right dropdown.
            </span>
            {scheduledJobs.length === 0 && (
              <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600 }}>
                ⚠ No jobs scheduled yet — drag requests from the Admin Dispatch panel onto the
                timeline grid first.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
