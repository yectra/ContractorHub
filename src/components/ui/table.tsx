import {
  Box,
  Chip,
  IconButton,
  TableBody,
  TableContainer,
  TableHead,
  type IconButtonProps,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { styled } from '@mui/material/styles';

export const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  boxShadow: `0 1px 0 ${theme.palette.datagrid.border}`,
}));

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.datagrid.header,
  '& th': {
    fontWeight: theme.typography.fontWeightBold,
    backgroundColor: theme.palette.datagrid.header,
    borderBottom: `1px solid ${theme.palette.datagrid.border}`,
    padding: theme.spacing(1.5),
    color: theme.palette.text.primary,
  },
}));

export const StyledTableBody = styled(TableBody)(({ theme }) => ({
  '& tr:nth-of-type(even)': {
    backgroundColor: theme.palette.datagrid.rowEven,
  },
  '& tr:nth-of-type(odd)': {
    backgroundColor: theme.palette.datagrid.rowOdd,
  },
  '& tr:hover': {
    backgroundColor: theme.palette.datagrid.hover,
  },
  '& td': {
    padding: theme.spacing(1.5),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
    borderBottom: `1px solid ${theme.palette.datagrid.border}`,
  },
}));

export const StyledTableToolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
  [theme.breakpoints.up('md')]: {
    flexWrap: 'nowrap',
  },
}));

export const StyledTableToolbarGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  alignItems: 'center',
  [theme.breakpoints.up('md')]: {
    justifyContent: 'flex-end',
  },
}));

export const ActionMenuButton = styled((props: IconButtonProps) => (
  <IconButton {...props}>
    <MoreVertIcon fontSize={props.size === 'large' ? 'medium' : props.size} />
  </IconButton>
))(({ theme }) => ({
  color: '#9ca3af',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const StatusChip = styled(Chip)(({ theme }) => ({
  backgroundColor: '#ecfdf5',
  color: '#065f46',
  fontSize: '13px',
  fontWeight: 600,
  borderRadius: '999px',
  padding: '6px 10px',
  [theme.breakpoints.down('sm')]: {
    fontSize: '12px',
    padding: '4px 8px',
  },
}));
