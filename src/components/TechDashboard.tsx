import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useServiceRequests, useScheduledJobs, useTechnicians } from '../hooks/useDispatchData';
import styles from '../styles/UI/TechDashboard.module.scss';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Time columns: 7 AM → 6 PM (12 one-hour slots, matching Admin Dashboard) */
const HOUR_COLUMNS = Array.from({ length: 12 }, (_, i) => i + 7);

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
  const startMonth = fmt(monday, { month: 'short' });
  const endDay = fmt(sunday, { day: '2-digit' });
  const endMonth = fmt(sunday, { month: 'short' });
  const endYear = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay} – ${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
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

/** Format an integer hour into "7:00 AM" / "1:00 PM" matching Admin Dashboard */
function formatHour(hour: number): string {
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

// ─── ScheduledJobCard Sub-component (Mirrors Dashboard.tsx Scheduled Job) ───────

interface ScheduledJobCardProps {
  jobId: string;
  srId: string;
  client: string;
  service: string;
  techColor?: string;
  onClick: () => void;
}

function ScheduledJobCard({ srId, client, service, techColor, onClick }: ScheduledJobCardProps) {
  return (
    <Box
      className={styles.techScheduledJob}
      sx={{
        backgroundColor: techColor || '#2196f3',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${srId} — ${client}: ${service}`}
    >
      <Typography variant="caption" className={styles.techJobId}>
        {srId}
      </Typography>
      <Typography variant="caption" className={styles.techJobClient}>
        {client || 'Unknown'}
      </Typography>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ViewMode = 'week' | 'month';

export default function TechDashboard() {
  const { serviceRequests, loading: srLoading } = useServiceRequests();
  const { scheduledJobs, loading: jobsLoading } = useScheduledJobs();
  const { technicians } = useTechnicians();

  // ── Navigation state ──────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // ── Step backward / forward ───────────────────────────────────────────────
  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'week') {
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        const targetMonth = d.getMonth() + (direction === 'next' ? 1 : -1);
        d.setDate(1);
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
    techColor: string;
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
      const tech = technicians.find((t) => t.id === job.techId);
      const cardColor = tech?.color || '#2196f3';
      const key = `${date}::${hour}`;

      if (!grid[key]) grid[key] = [];
      grid[key].push({
        jobId: job.id || '',
        srId: job.serviceRequestId || job.id || '',
        client: sr?.client || 'Unknown',
        service: sr?.service || 'Service',
        techColor: cardColor,
      });
    });

    return grid;
  }, [scheduledJobs, serviceRequests, technicians, calendarDates]);

  // ── Navigate to FieldExecution with context ───────────────────────────────
  const handleChipClick = (jobId: string, srId: string) => {
    sessionStorage.setItem('previousView', 'TECH_DASHBOARD');
    sessionStorage.setItem('selectedJobId', jobId);
    sessionStorage.setItem('selectedSrId', srId);
    window.location.href = '/technician';
  };

  const isLoading = srLoading || jobsLoading;

  return (
    <Box className={styles.techDashboardRoot}>
      <Box className={styles.techDashboardPanel}>
        {/* ════════════════════════════════════════════════════════════════════
            TOP HEADER BANNER (Synchronized with Admin Dashboard Header)
        ════════════════════════════════════════════════════════════════════ */}
        <Box className={styles.techDashboardHeader}>
          {/* Top Navigation Row */}
          <Box className={styles.techDashboardNavRow}>
            <Box className={styles.techDashboardNavGroup}>
              <Tooltip title="Back to Admin Master View" arrow>
                <Button
                  id="tech-dashboard-back-btn"
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon className={styles.techDashboardNavIcon} />}
                  onClick={() => (window.location.href = '/')}
                  className={styles.techDashboardCompactButton}
                >
                  Admin Master View
                </Button>
              </Tooltip>
            </Box>

            {/* Period Navigation Controls */}
            <Box className={styles.techDashboardControls}>
              <Tooltip title="Previous Period" arrow>
                <IconButton
                  size="small"
                  onClick={() => navigate('prev')}
                  className={styles.techDashboardArrowBtn}
                  aria-label="Previous period"
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>

              <Box className={styles.techDashboardPeriodPill}>
                {centerLabel}
              </Box>

              <Tooltip title="Next Period" arrow>
                <IconButton
                  size="small"
                  onClick={() => navigate('next')}
                  className={styles.techDashboardArrowBtn}
                  aria-label="Next period"
                >
                  <ChevronRightIcon />
                </IconButton>
              </Tooltip>

              <Button
                variant="outlined"
                size="small"
                startIcon={<TodayIcon className={styles.techDashboardNavIcon} />}
                onClick={() => setCurrentDate(new Date())}
                className={styles.techDashboardCompactButton}
              >
                Today
              </Button>

              <Select
                value={viewMode}
                size="small"
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className={styles.techDashboardViewSelect}
              >
                <MenuItem value="week" sx={{ fontSize: '0.74rem', fontWeight: 600 }}>Week View</MenuItem>
                <MenuItem value="month" sx={{ fontSize: '0.74rem', fontWeight: 600 }}>Month View</MenuItem>
              </Select>
            </Box>
          </Box>

          {/* Title Row */}
          <Box className={styles.techDashboardTitleRow}>
            <Box className={styles.techDashboardTitleLeft}>
              <Typography variant="h5" className={styles.techDashboardCenterTitle}>
                Technician Calendar
              </Typography>
              <Chip
                label={centerLabel}
                color="primary"
                variant="outlined"
                size="small"
                className={styles.techDashboardDateChip}
              />
              <Chip
                label={`${scheduledJobs.length} Jobs Scheduled`}
                size="small"
                className={styles.techDashboardJobsChip}
              />
            </Box>
          </Box>

          <Typography variant="body2" className={styles.techDashboardSubtitle}>
            Interactive multi-day chronological technician schedule & task overview
          </Typography>
        </Box>

        {/* ════════════════════════════════════════════════════════════════════
            CALENDAR GRID / HORIZONTAL TIME ROW
        ════════════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <Box className={styles.techDashboardLoadingBox}>
            <CircularProgress size={40} />
            <Typography className={styles.techDashboardLoadingText}>
              Loading schedule data…
            </Typography>
          </Box>
        ) : (
          <Box className={styles.techDashboardGridScroll}>
            <Box className={styles.techDashboardGridInner}>
              {/* ── Time Header Row (Sticky Horizontal Hourly Headers) ────────── */}
              <Box className={styles.techDashboardTimeHeaderRow}>
                <Box className={styles.techDashboardSpacer}>
                  {viewMode === 'week' ? 'Week Day' : 'Day'}
                </Box>
                {HOUR_COLUMNS.map((hour) => (
                  <Box key={hour} className={styles.techDashboardTimeHeaderCell}>
                    {formatHour(hour)}
                  </Box>
                ))}
              </Box>

              {/* ── Date Rows ──────────────────────────────────────────────── */}
              {calendarDates.map((dateStr) => {
                const isCurrentDay = dateStr === today;

                return (
                  <Box
                    key={dateStr}
                    className={`${styles.techDashboardRow} ${isCurrentDay ? styles.techDashboardRowToday : ''}`}
                  >
                    {/* Row Date Label */}
                    <Box
                      className={`${styles.techDashboardRowLabel} ${isCurrentDay ? styles.techDashboardRowLabelToday : ''}`}
                    >
                      <Typography
                        className={`${styles.techDashboardDateText} ${isCurrentDay ? styles.techDashboardDateTextToday : ''}`}
                      >
                        {formatDateLabel(dateStr)}
                      </Typography>
                      {isCurrentDay && (
                        <span className={styles.techDashboardTodayBadge}>
                          Today
                        </span>
                      )}
                    </Box>

                    {/* Time Slots */}
                    <Box className={styles.techDashboardTimeSlots}>
                      {HOUR_COLUMNS.map((hour) => {
                        const key = `${dateStr}::${hour}`;
                        const chips = jobGrid[key] || [];

                        return (
                          <Box
                            key={hour}
                            className={`${styles.techDashboardTimeSlot} ${isCurrentDay ? styles.techDashboardTimeSlotToday : ''}`}
                          >
                            {chips.map((chip) => (
                              <ScheduledJobCard
                                key={chip.jobId}
                                jobId={chip.jobId}
                                srId={chip.srId}
                                client={chip.client}
                                service={chip.service}
                                techColor={chip.techColor}
                                onClick={() => handleChipClick(chip.jobId, chip.srId)}
                              />
                            ))}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* ── Guide / Quick Info Bar ───────────────────────────────────── */}
            <Box className={styles.techDashboardGuide}>
              <Typography className={styles.techDashboardGuideTitle}>
                <InfoOutlinedIcon fontSize="small" /> Quick Guide
              </Typography>
              <Typography className={styles.techDashboardGuideCopy}>
                • Blue cards represent scheduled jobs — click any card to open the technician execution checklist.
              </Typography>
              <Typography className={styles.techDashboardGuideCopy}>
                • Highlighted row represents Today. Use the period controls to navigate dates.
              </Typography>
              <Typography className={styles.techDashboardGuideCopy}>
                • Switch between <strong>Week View</strong> and <strong>Month View</strong> using the top controls.
              </Typography>
              {scheduledJobs.length === 0 && (
                <Typography className={styles.techDashboardGuideWarn}>
                  ⚠ No jobs scheduled yet — assign requests from the Admin Dispatch Center onto the timeline.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
