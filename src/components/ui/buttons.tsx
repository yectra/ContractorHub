import { Button, type ButtonProps } from '@mui/material';
import { styled } from '@mui/material/styles';

export const PrimaryButton = styled((props: ButtonProps) => (
  <Button variant="contained" {...props} />
))(({ theme }) => ({
  textTransform: 'none',
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.common.white,
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const SecondaryButton = styled((props: ButtonProps) => <Button {...props} />)(
  ({ theme }) => ({
    textTransform: 'none',
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  }),
);
