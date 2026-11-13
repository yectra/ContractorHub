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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import { useServiceRequests, useScheduledJobs, useTechnicians } from '../hooks/useDispatchData';
import AppLayout from './layout/AppLayout';
import styles from '../styles/UI/TechDashboard.module.scss';
import { formatJobNumber, getCanonicalJobId } from '../utils/formatters';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Time columns: 7 AM â†’ 7 PM (13 one-hour slots, matching Admin Dashboard) */
const HOUR_COLUMNS = Array.from({ length: 13 }, (_, i) => i + 7);


// â”€â”€â”€ Date Utility Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
 * Week View  â†’ 7 days starting from the Monday of the week containing cursor
 * Month View â†’ all days in the calendar month of the cursor
 */
function buildCalendarDates(cursor: Date, viewMode: 'week' | 'month'): string[] {
  if (viewMode === 'week') {
    // Snap to the Monday of the cursor's week
    const monday = new Date(cursor);
    const dow = monday.getDay(); // 0=Sun â€¦ 6=Sat
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
 * Week View  -> "Jul 26 - Aug 1, 2026"
 * Month View -> "July 2026"
 */
function buildLabel(cursor: Date, viewMode: 'week' | 'month'): string {
  const toUtcCalendarDate = (date: Date) =>
    new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  if (viewMode === 'month') {
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(toUtcCalendarDate(cursor));
  }

  // Week view: compute Monday-Sunday span
  const monday = new Date(cursor);
  const dow = monday.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diff);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const startLabel = formatter.format(toUtcCalendarDate(monday));
  const endLabel = formatter.format(toUtcCalendarDate(sunday));

  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${startLabel}, ${monday.getFullYear()} - ${endLabel}, ${sunday.getFullYear()}`;
  }
  return `${startLabel} - ${endLabel}, ${sunday.getFullYear()}`;
}

/** Format a YYYY-MM-DD string into "Mon, Jul 9" */
function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Format an integer hour into "7:00 AM" / "1:00 PM" matching Admin Dashboard */
function formatHour(hour: number): string {
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

// â”€â”€â”€ ScheduledJobCard Sub-component (Desktop Matrix Tile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ScheduledJobCardProps {
  jobId: string;
  srId: string;
  client: string;
  service: string;
  serviceType?: string;
  service_name?: string;
  techColor?: string;
  onClick: () => void;
}

function ScheduledJobCard({
  jobId,
  srId,
  client,
  service,
  serviceType,
  service_name,
  techColor,
  onClick,
}: ScheduledJobCardProps) {
  const displayService = serviceType || service_name || service;
  const canonicalId = getCanonicalJobId({ serviceRequestId: srId, id: jobId });
  const formattedJobNumber = formatJobNumber(canonicalId);
  const clientName = client || 'Unknown';

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
      title={`${formattedJobNumber} — ${displayService ? `${displayService} | ` : ''}${clientName}`}
    >
      <Typography variant="caption" className={styles.techJobId}>
        {formattedJobNumber}
      </Typography>
      {displayService && (
        <Typography variant="caption" className={styles.techJobService}>
          {displayService}
        </Typography>
      )}
      <Typography variant="caption" className={styles.techJobClient}>
        {clientName}
      </Typography>
    </Box>
  );
}

// â”€â”€â”€ Types & Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ViewMode = 'week' | 'month';

type JobItemData = {
  jobId: string;
  srId: string;
  client: string;
  service: string;
  serviceType: string;
  service_name: string;
  techColor: string;
  startHour: number;
};

export default function TechDashboard() {
  const routerNavigate = useNavigate();

  const { serviceRequests, loading: srLoading } = useServiceRequests();
  const { scheduledJobs, loading: jobsLoading } = useScheduledJobs();
  const { technicians } = useTechnicians();

  // ── Navigation state ──────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // â”€â”€ Step backward / forward â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Derived calendar dates (rows / list items) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const calendarDates = useMemo(
    () => buildCalendarDates(currentDate, viewMode),
    [currentDate, viewMode]
  );

  // â”€â”€ Center label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const centerLabel = useMemo(
    () => buildLabel(currentDate, viewMode),
    [currentDate, viewMode]
  );

  // â”€â”€ Today string (for row/card highlighting) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const today = todayStr();

  // â”€â”€ Chronologically Grouped Jobs by Date (for mobile feed & matrix lookup) â”€
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

      const serviceName =
        sr?.service ||
        (job as unknown as { serviceType?: string; service?: string }).serviceType ||
        (job as unknown as { service?: string }).service ||
        'Service';

      const canonicalId = getCanonicalJobId(job);

      map[date].push({
        jobId: job.id || '',
        srId: canonicalId || job.serviceRequestId || job.id || '',
        client: sr?.client || 'Unknown',
        service: serviceName,
        serviceType: serviceName,
        service_name: serviceName,
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

  // â”€â”€ Desktop matrix lookup: "YYYY-MM-DD::HH" â†’ array of chip data â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Navigate to FieldExecution with context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChipClick = (jobId: string, srId: string) => {
    sessionStorage.setItem('previousView', 'TECH_DASHBOARD');
    sessionStorage.setItem('selectedJobId', jobId);
    sessionStorage.setItem('selectedSrId', srId);
    routerNavigate(`/technician?jobId=${encodeURIComponent(jobId)}&srId=${encodeURIComponent(srId)}`);
  };

  const isLoading = srLoading || jobsLoading;

  return (
    <AppLayout
      title="Technician Schedule"
      subtitle="Live Calendar & Assigned Job Execution"
      activePage="tech-dashboard"
      showBackButton
      backTo="/admin"
      fullWidth
      noScroll
    >
      <Box
        className={styles.techDashboardRoot}
        sx={{
          flex: 1,
          minHeight: 0,
          height: 'calc(100vh - 96px)',
          width: '100%',
          maxWidth: '100vw',
          p: { xs: 1, sm: 1.5 },
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <Box className={styles.techDashboardPanel} sx={{ width: '100%', height: '100%' }}>
          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              CALENDAR SUB-HEADER (Title, Stats & Period Navigation Controls)
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <Box className={styles.techDashboardHeader} sx={{ width: '100%' }}>
            {/* Calendar Controls & Navigation Row */}
            <Box
              className={styles.techDashboardNavRow}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 1.5, md: 1 },
                alignItems: { xs: 'stretch', md: 'center' },
                justifyContent: { xs: 'flex-start', md: 'space-between' },
                width: '100%',
                margin: '0 0 8px',
                padding: '0 0 8px',
              }}
            >
              {/* Title & Stats */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
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

              {/* Period Navigation Controls */}
              <Box
                className={styles.techDashboardControls}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  justifyContent: { xs: 'space-between', md: 'flex-end' },
                  width: { xs: '100%', md: 'auto' },
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

            <Typography variant="body2" className={styles.techDashboardSubtitle}>
              Interactive multi-day chronological technician schedule & task overview
            </Typography>
          </Box>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            MAIN CONTENT AREA: CONDITIONAL DESKTOP MATRIX / MOBILE FEED
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {isLoading ? (
          <Box className={styles.techDashboardLoadingBox}>
            <CircularProgress size={40} />
            <Typography className={styles.techDashboardLoadingText}>
              Loading schedule dataâ€¦
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'auto' }}>
            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                1. DESKTOP & TABLET VIEW (lg:block / >= 1024px)
                Horizontal timeline grid matrix intact
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <Box
              className={styles.techDashboardDesktopView}
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: '100%',
              }}
            >
              <Box className={styles.techDashboardGridScroll}>
                <Box className={styles.techDashboardGridInner}>
                  {/* â”€â”€ Time Header Row (Sticky Horizontal Hourly Headers) â”€â”€ */}
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

                  {/* â”€â”€ Date Rows â”€â”€ */}
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
                                    serviceType={chip.serviceType}
                                    service_name={chip.service_name}
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

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                2. MOBILE & SMALL BREAKPOINT FEED (max-width: 1023px / lg:hidden)
                Sleek, chronological vertical-scrolling feed list layout
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                                  {formatJobNumber(job.srId)}
                                </Typography>
                                {(job.serviceType || job.service) && (
                                  <span className={styles.mobileTaskServiceBadge}>
                                    {job.serviceType || job.service}
                                  </span>
                                )}
                                <Typography className={styles.mobileTaskClient}>
                                  â€¢ {job.client || 'Unknown Client'}
                                </Typography>
                              </Box>
                              <Box className={styles.mobileTimePill}>
                                â±ï¸ {formatHour(job.startHour)}
                              </Box>
                            </Box>
                            {(job.serviceType || job.service) && (
                              <Typography className={styles.mobileTaskService}>
                                {job.serviceType || job.service}
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

            {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                3. QUICK GUIDE FOOTER (Responsive collapsing text column)
            â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  â€¢ Tap any job card to open the technician execution checklist.
                </Typography>
                <Typography className={styles.techDashboardGuideCopy}>
                  â€¢ Highlighted card/row represents Today. Use top controls to navigate dates.
                </Typography>
                <Typography className={styles.techDashboardGuideCopy}>
                  â€¢ Switch between <strong>Week View</strong> and <strong>Month View</strong> using the selector.
                </Typography>
                {scheduledJobs.length === 0 && (
                  <Typography className={styles.techDashboardGuideWarn}>
                    âš  No jobs scheduled yet â€” assign requests from the Admin Dispatch Center onto the timeline.
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
    </AppLayout>
  );
}
