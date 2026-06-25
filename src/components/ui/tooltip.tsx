import { Box, IconButton, SvgIcon, Tooltip } from '@mui/material';
import type { ReactNode } from 'react';

type LabelWithInfoProps = {
  label: ReactNode;
  info?: ReactNode;
};

export function LabelWithInfo({ label, info }: LabelWithInfoProps) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Box component="span" sx={{ fontWeight: 700 }}>
        {label}
      </Box>

      {info && (
        <Tooltip title={info} arrow>
          <IconButton
            size="small"
            sx={{
              border: '1px solid',
              padding: '2px',
              width: 18,
              height: 18,
            }}
            aria-label={`${typeof label === 'string' ? label : 'field'} info`}
          >
            <SvgIcon sx={{ fontSize: 14 }}>
              <path d="M11 9h2V7h-2v2zm0 8h2v-6h-2v6z" />
            </SvgIcon>
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
