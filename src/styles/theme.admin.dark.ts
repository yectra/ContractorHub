import { createTheme } from '@mui/material/styles';
import adminTheme from './theme.admin';

const darkAdminTheme = createTheme({
  ...adminTheme,
  palette: {
    ...adminTheme.palette,
    mode: 'dark',
    appbar: {
      main: '#111827',
      light: '#1f2937',
      dark: '#374151',
    },
  },
});

export default darkAdminTheme;
