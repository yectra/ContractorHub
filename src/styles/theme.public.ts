import { createTheme } from '@mui/material/styles';
import baseTheme from './theme';

const publicTheme = createTheme({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
  },
});

export default publicTheme;
