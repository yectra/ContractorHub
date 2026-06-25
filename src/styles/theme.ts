import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    appbar: Palette['primary'];
    datagrid: {
      header: string;
      border: string;
      rowEven: string;
      rowOdd: string;
      hover: string;
      selected: string;
    };
  }

  interface PaletteOptions {
    appbar?: PaletteOptions['primary'];
    datagrid?: {
      header?: string;
      border?: string;
      rowEven?: string;
      rowOdd?: string;
      hover?: string;
      selected?: string;
    };
  }
}

const theme = createTheme({
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightLight: 350,
    fontWeightRegular: 450,
    fontWeightMedium: 550,
    fontWeightBold: 650,
    htmlFontSize: 14,
    h1: { fontSize: '2rem' },
    h2: { fontSize: '1.875rem' },
    h3: { fontSize: '1.75rem' },
    h4: { fontSize: '1.5rem', marginBottom: '0.5rem' },
    h5: { fontSize: '1.25rem' },
    h6: { fontSize: '1rem' },
    body1: { fontSize: '1rem' },
    body2: {
      fontSize: '0.875rem',
      color: '#6b7280',
    },
  },
  palette: {
    background: {
      default: '#f8f8f8',
      paper: '#ffffff',
    },
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1e40af',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    appbar: {
      main: '#9ca3af',
      light: '#fbfbfc',
      dark: '#f3f4f6',
    },
    datagrid: {
      header: '#cbd5e1',
      border: '#e2e8f0',
      rowEven: '#ffffff',
      rowOdd: '#f1f5f9',
      hover: '#e2e8f0',
      selected: '#dbeafe',
    },
    action: {
      hover: '#d1d5db',
      selected: '#d1d5db',
    },
    divider: '#e5e7eb',
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) =>
          ownerState.variant === 'contained' && ownerState.color === 'primary'
            ? {
                backgroundColor: '#2563eb',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1d4ed8',
                },
              }
            : {},
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          backgroundColor: '#f9fafb',
          paddingTop: 12,
          paddingBottom: 12,
        },
        title: {
          fontSize: '0.875rem',
          fontWeight: 700,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: theme.typography.body2.fontSize,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: theme.typography.h4.fontSize,
          padding: theme.spacing(2),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          paddingTop: '20px !important',
        },
      },
    },
  },
});

export default theme;
