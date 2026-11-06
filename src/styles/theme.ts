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
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontWeightLight: 350,
    fontWeightRegular: 450,
    fontWeightMedium: 550,
    fontWeightBold: 650,
    htmlFontSize: 14,
    h1: { fontSize: '2rem', fontWeight: 650, lineHeight: 1.2 },
    h2: { fontSize: '1.875rem', fontWeight: 650, lineHeight: 1.25 },
    h3: { fontSize: '1.75rem', fontWeight: 650, lineHeight: 1.3 },
    h4: { fontSize: '1.5rem', fontWeight: 550, lineHeight: 1.35, marginBottom: '0.5rem' },
    h5: { fontSize: '1.25rem', fontWeight: 550, lineHeight: 1.4 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '1rem', lineHeight: 1.45 },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.45,
      color: '#6b7280',
    },
    caption: {
      fontSize: '0.75rem',
      color: '#64748b',
    },
    button: {
      textTransform: 'none',
      fontWeight: 550,
    },
  },
  palette: {
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    appbar: {
      main: '#1e293b',
      light: '#334155',
      dark: '#0f172a',
    },
    datagrid: {
      header: '#cbd5e1',
      border: '#e2e8f0',
      rowEven: '#ffffff',
      rowOdd: '#f1f5f9',
      hover: '#e2e8f0',
      selected: '#dbeafe',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    action: {
      hover: '#f1f5f9',
      selected: '#e2e8f0',
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
        root: ({ ownerState }) => ({
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 550,
          fontSize: '0.875rem',
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            backgroundColor: '#2563eb',
            color: '#ffffff',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#1d4ed8',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            },
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: '#cbd5e1',
            color: '#334155',
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: '#94a3b8',
              backgroundColor: '#f8fafc',
            },
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          backgroundColor: '#f9fafb',
          paddingTop: 12,
          paddingBottom: 12,
          borderBottom: '1px solid #e2e8f0',
        },
        title: {
          fontSize: '0.875rem',
          fontWeight: 700,
          color: '#0f172a',
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
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.875rem',
          backgroundColor: '#ffffff',
          '& fieldset': {
            borderColor: '#e2e8f0',
          },
          '&:hover fieldset': {
            borderColor: '#cbd5e1',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#2563eb',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.875rem',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 650,
          color: '#0f172a',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '20px !important',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 20px',
          borderTop: '1px solid #e5e7eb',
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
        root: {
          fontSize: '0.875rem',
          color: '#374151',
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#cbd5e1',
          color: '#0f172a',
          fontWeight: 700,
          fontSize: '0.875rem',
          borderBottom: '1px solid #e2e8f0',
        },
        body: {
          fontSize: '0.875rem',
          color: '#0f172a',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 999,
        },
      },
    },
  },
});

export default theme;
