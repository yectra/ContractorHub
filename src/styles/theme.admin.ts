import { createTheme } from '@mui/material/styles';
import baseTheme from './theme';

const adminTheme = createTheme({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    appbar: {
      main: '#f8fafc',
      light: '#e2e8f0',
      dark: '#cbd5e1',
    },
  },
  components: {
    ...baseTheme.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000',
        },
      },
    },
  },
});

export default adminTheme;
