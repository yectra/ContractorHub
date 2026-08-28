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

// ─── ScheduledJobCard Sub-component (Desktop Matrix Tile) ───────────────────────

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

// ─── Types & Main Component ───────────────────────────────────────────────────

type ViewMode = 'week' | 'month';

type JobItemData = {
  jobId: string;
  srId: string;
  client: string;
  service: string;
  techColor: string;
  startHour: number;
};

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

  // ── Derived calendar dates (rows / list items) ────────────────────────────
  const calendarDates = useMemo(
    () => buildCalendarDates(currentDate, viewMode),
    [currentDate, viewMode]
  );

  // ── Center label ─────────────────────────────────────────────────────────
  const centerLabel = useMemo(
    () => buildLabel(currentDate, viewMode),
    [currentDate, viewMode]
  );

  // ── Today string (for row/card highlighting) ─────────────────────────────
  const today = todayStr();

  // ── Chronologically Grouped Jobs by Date (for mobile feed & matrix lookup) ─
  const jobsByDate = useMemo(() => {
    const map: Record<string, JobItemData[]> = {};
    calendarDates.forEach((date) => {
      map[date] = [];
    });

    scheduledJobs.forEach((job) => {
      const date = job.scheduledDate;
      const hour = job.startHour;
      if (!date || hour == null) return;
      if (!calendarDates.includes(date)) return;

      const sr = serviceRequests.find((r) => r.id === job.serviceRequestId);
      const tech = technicians.find((t) => t.id === job.techId);
      const cardColor = tech?.color || '#2196f3';

      if (!map[date]) {
        map[date] = [];
      }

      map[date].push({
        jobId: job.id || '',
        srId: job.serviceRequestId || job.id || '',
        client: sr?.client || 'Unknown',
        service: sr?.service || 'Service',
        techColor: cardColor,
        startHour: hour,
      });
    });

    // Sort each day's jobs chronologically by startHour
    Object.keys(map).forEach((date) => {
      map[date].sort((a, b) => a.startHour - b.startHour);
    });

    return map;
  }, [scheduledJobs, serviceRequests, technicians, calendarDates]);

  // ── Desktop matrix lookup: "YYYY-MM-DD::HH" → array of chip data ─────────
  const jobGrid = useMemo(() => {
    const grid: Record<string, JobItemData[]> = {};

    Object.entries(jobsByDate).forEach(([date, jobs]) => {
      jobs.forEach((job) => {
        const key = `${date}::${job.startHour}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(job);
      });
    });

    return grid;
  }, [jobsByDate]);

  // ── Navigate to FieldExecution with context ───────────────────────────────
  const handleChipClick = (jobId: string, srId: string) => {
    sessionStorage.setItem('previousView', 'TECH_DASHBOARD');
    sessionStorage.setItem('selectedJobId', jobId);
    sessionStorage.setItem('selectedSrId', srId);
    window.location.href = '/technician';
  };

  const isLoading = srLoading || jobsLoading;

  return (
    <Box className={styles.techDashboardRoot} sx={{ width: '100%', maxWidth: '100vw' }}>
      <Box className={styles.techDashboardPanel} sx={{ width: '100%' }}>
        {/* ════════════════════════════════════════════════════════════════════
            TOP HEADER BANNER (Responsive Mobile Stacking & Controls)
        ════════════════════════════════════════════════════════════════════ */}
        <Box className={styles.techDashboardHeader} sx={{ width: '100%' }}>
          {/* Top Navigation Row: Stacks vertically (flex-col gap-3) on mobile <= 640px */}
          <Box
            className={styles.techDashboardNavRow}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 1 },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Box
              className={styles.techDashboardNavGroup}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Tooltip title="Back to Admin Master View" arrow>
                <Button
                  id="tech-dashboard-back-btn"
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon className={styles.techDashboardNavIcon} />}
                  onClick={() => (window.location.href = '/')}
                  className={styles.techDashboardCompactButton}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Admin Master View
                </Button>
              </Tooltip>
            </Box>

            {/* Period Navigation Controls */}
            <Box
              className={styles.techDashboardControls}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                justifyContent: { xs: 'space-between', sm: 'flex-end' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
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

              <Box
                className={styles.techDashboardPeriodPill}
                sx={{
                  flex: { xs: 1, sm: 'initial' },
                  minWidth: { xs: 0, sm: 140 },
                  textAlign: 'center',
                }}
              >
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
                <MenuItem value="week" sx={{ fontSize: '0.74rem', fontWeight: 600 }}>
                  Week View
                </MenuItem>
                <MenuItem value="month" sx={{ fontSize: '0.74rem', fontWeight: 600 }}>
                  Month View
                </MenuItem>
              </Select>
            </Box>
          </Box>

          {/* Title Row */}
          <Box className={styles.techDashboardTitleRow} sx={{ width: '100%' }}>
            <Box
              className={styles.techDashboardTitleLeft}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                width: '100%',
              }}
            >
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
            MAIN CONTENT AREA: CONDITIONAL DESKTOP MATRIX / MOBILE FEED
        ════════════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <Box className={styles.techDashboardLoadingBox}>
            <CircularProgress size={40} />
            <Typography className={styles.techDashboardLoadingText}>
              Loading schedule data…
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'auto' }}>
            {/* ─────────────────────────────────────────────────────────────
                1. DESKTOP & TABLET VIEW (lg:block / >= 1024px)
                Horizontal timeline grid matrix intact
            ───────────────────────────────────────────────────────────── */}
            <Box
              className={styles.techDashboardDesktopView}
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: '100%',
              }}
            >
              <Box className={styles.techDashboardGridScroll}>
                <Box className={styles.techDashboardGridInner}>
                  {/* ── Time Header Row (Sticky Horizontal Hourly Headers) ── */}
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

                  {/* ── Date Rows ── */}
                  {calendarDates.map((dateStr) => {
                    const isCurrentDay = dateStr === today;

                    return (
                      <Box
                        key={dateStr}
                        className={`${styles.techDashboardRow} ${
                          isCurrentDay ? styles.techDashboardRowToday : ''
                        }`}
                      >
                        {/* Row Date Label */}
                        <Box
                          className={`${styles.techDashboardRowLabel} ${
                            isCurrentDay ? styles.techDashboardRowLabelToday : ''
                          }`}
                        >
                          <Typography
                            className={`${styles.techDashboardDateText} ${
                              isCurrentDay ? styles.techDashboardDateTextToday : ''
                            }`}
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
                                className={`${styles.techDashboardTimeSlot} ${
                                  isCurrentDay ? styles.techDashboardTimeSlotToday : ''
                                }`}
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
              </Box>
            </Box>

            {/* ─────────────────────────────────────────────────────────────
                2. MOBILE & SMALL BREAKPOINT FEED (max-width: 1023px / lg:hidden)
                Sleek, chronological vertical-scrolling feed list layout
            ───────────────────────────────────────────────────────────── */}
            <Box
              className={styles.techDashboardMobileFeed}
              sx={{
                display: { xs: 'flex', lg: 'none' },
                flexDirection: 'column',
                width: '100%',
              }}
            >
              {calendarDates.map((dateStr) => {
                const isCurrentDay = dateStr === today;
                const dayJobs = jobsByDate[dateStr] || [];

                return (
                  <Box
                    key={dateStr}
                    className={`${styles.mobileDaySection} ${
                      isCurrentDay ? styles.mobileDaySectionToday : ''
                    }`}
                  >
                    {/* Full-width Daily Row Header Strip */}
                    <Box
                      className={`${styles.mobileDayHeader} ${
                        isCurrentDay ? styles.mobileDayHeaderToday : ''
                      }`}
                    >
                      <Box className={styles.mobileDayTitleGroup}>
                        <Typography className={styles.mobileDayText}>
                          {formatDateLabel(dateStr)}
                        </Typography>
                        {isCurrentDay && (
                          <span className={styles.techDashboardTodayBadge}>
                            Today
                          </span>
                        )}
                      </Box>
                      <Typography className={styles.mobileDayJobCount}>
                        {dayJobs.length} {dayJobs.length === 1 ? 'Job' : 'Jobs'}
                      </Typography>
                    </Box>

                    {/* Stacked Task Cards */}
                    <Box className={styles.mobileTasksList}>
                      {dayJobs.length === 0 ? (
                        <Box className={styles.mobileEmptyDay}>
                          <Typography className={styles.mobileEmptyText}>
                            No jobs scheduled for this date
                          </Typography>
                        </Box>
                      ) : (
                        dayJobs.map((job) => (
                          <Box
                            key={job.jobId}
                            className={styles.mobileTaskCard}
                            sx={{
                              borderLeft: `4px solid ${job.techColor || '#2196f3'}`,
                            }}
                            onClick={() => handleChipClick(job.jobId, job.srId)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleChipClick(job.jobId, job.srId);
                              }
                            }}
                          >
                            <Box className={styles.mobileTaskHeader}>
                              <Box className={styles.mobileTaskMainInfo}>
                                <Typography className={styles.mobileTaskJobId}>
                                  {job.srId}
                                </Typography>
                                <Typography className={styles.mobileTaskClient}>
                                  • {job.client || 'Unknown Client'}
                                </Typography>
                              </Box>
                              <Box className={styles.mobileTimePill}>
                                ⏱️ {formatHour(job.startHour)}
                              </Box>
                            </Box>
                            {job.service && (
                              <Typography className={styles.mobileTaskService}>
                                {job.service}
                              </Typography>
                            )}
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* ─────────────────────────────────────────────────────────────
                3. QUICK GUIDE FOOTER (Responsive collapsing text column)
            ───────────────────────────────────────────────────────────── */}
            <Box
              sx={{
                px: { xs: 1.5, lg: 2 },
                pb: 2,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <Box
                className={styles.techDashboardGuide}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: { xs: 1, sm: 2 },
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <Typography className={styles.techDashboardGuideTitle}>
                  <InfoOutlinedIcon fontSize="small" /> Quick Guide
                </Typography>
                <Typography className={styles.techDashboardGuideCopy}>
                  • Tap any job card to open the technician execution checklist.
                </Typography>
                <Typography className={styles.techDashboardGuideCopy}>
                  • Highlighted card/row represents Today. Use top controls to navigate dates.
                </Typography>
                <Typography className={styles.techDashboardGuideCopy}>
                  • Switch between <strong>Week View</strong> and <strong>Month View</strong> using the selector.
                </Typography>
                {scheduledJobs.length === 0 && (
                  <Typography className={styles.techDashboardGuideWarn}>
                    ⚠ No jobs scheduled yet — assign requests from the Admin Dispatch Center onto the timeline.
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
