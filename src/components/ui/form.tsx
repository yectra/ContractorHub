import {
  InputAdornment,
  Select,
  TextField,
  Typography,
  type SelectProps,
  type TextFieldProps,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { styled } from '@mui/material/styles';

export const StyledSelect = styled((props: SelectProps) => (
  <Select {...props} />
))(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  color: theme.typography.body2.color,
  fontSize: theme.typography.body2.fontSize,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.action.hover,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.action.active,
  },
}));

export const FormLabel = styled(Typography)(() => ({
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  letterSpacing: '0.2px',
  textTransform: 'uppercase',
  marginBottom: '8px',
}));

export const StyledSearchInput = styled((props: TextFieldProps) => (
  <TextField
    {...props}
    slotProps={{
      ...props.slotProps,
      input: {
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        ...props.slotProps?.input,
      },
    }}
  />
))(({ theme }) => ({
  flex: 1,
  '& .MuiOutlinedInput-root': {
    fontSize: theme.typography.body2.fontSize,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    '& fieldset': {
      borderColor: theme.palette.divider,
    },
    '&:hover fieldset': {
      borderColor: theme.palette.action.hover,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.action.active,
    },
  },
}));
