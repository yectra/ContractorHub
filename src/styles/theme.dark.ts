import { createTheme } from '@mui/material/styles';
import baseTheme from './theme';

const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    mode: 'dark',
  },
});

export default darkTheme;
