import {
  DataGrid,
  type GridColDef,
  type GridRowClassNameParams,
  type DataGridProps,
} from '@mui/x-data-grid';
import { useTheme, useMediaQuery } from '@mui/material';

type BaseDataGridProps = Omit<
  DataGridProps,
  | 'rows'
  | 'columns'
  | 'getRowId'
  | 'getRowClassName'
  | 'pageSizeOptions'
  | 'disableColumnMenu'
  | 'disableColumnResize'
  | 'sx'
> & {
  rows: Record<string, unknown>[];
  columns: GridColDef[];
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  freezeColumns?: number;
};

export function BaseDataGrid({
  rows,
  columns,
  pageSize,
  onPageSizeChange,
  loading,
  freezeColumns = 0,
  ...rest
}: BaseDataGridProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate left position for sticky columns
  const getStickyStyles = () => {
    if (!isMobile || freezeColumns === 0) return {};

    const styles: Record<string, unknown> = {};
    let leftPosition = 0;

    for (let i = 0; i < Math.min(freezeColumns, columns.length); i++) {
      const field = columns[i].field;
      const width = columns[i].width || 100;

      // Sticky header cells
      (styles as Record<string, Record<string, string>>)[
        `& .MuiDataGrid-columnHeaders .MuiDataGrid-columnHeader[data-field="${field}"]`
      ] = {
        position: 'sticky !important',
        left: `${leftPosition}px !important`,
        backgroundColor: `${theme.palette.datagrid.header} !important`,
        zIndex: '101 !important',
      };

      // Sticky body cells - target within virtualScroller
      (styles as Record<string, Record<string, string>>)[
        `& .MuiDataGrid-virtualScroller .MuiDataGrid-cell[data-field="${field}"]`
      ] = {
        position: 'sticky !important',
        left: `${leftPosition}px !important`,
        zIndex: '100 !important',
        borderRight: `2px solid ${theme.palette.datagrid.border}`,
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
      };

      // Even row cells - inherit background
      styles[`& .even-row .MuiDataGrid-cell[data-field="${field}"]`] = {
        backgroundColor: `${theme.palette.datagrid.rowEven} !important`,
      };

      // Odd row cells - inherit background
      styles[`& .odd-row .MuiDataGrid-cell[data-field="${field}"]`] = {
        backgroundColor: `${theme.palette.datagrid.rowOdd} !important`,
      };

      // Hover state
      styles[`& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field="${field}"]`] = {
        backgroundColor: `${theme.palette.datagrid.hover} !important`,
      };

      leftPosition += width;
    }

    return styles;
  };

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      autoHeight
      disableColumnResize
      disableColumnMenu
      disableVirtualization={isMobile && freezeColumns > 0}
      getRowId={(row) => String(row.id)}
      initialState={{
        pagination: {
          paginationModel: { pageSize, page: 0 },
        },
      }}
      pageSizeOptions={[5, 10, 20, 50]}
      onPaginationModelChange={(model) => onPageSizeChange(model.pageSize)}
      getRowClassName={(params: GridRowClassNameParams) =>
        params.indexRelativeToCurrentPage % 2 === 0 ? 'even-row' : 'odd-row'
      }
      sx={{
        width: '100%',
        maxWidth: isMobile ? '100vw' : '100%',
        minHeight: 300,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.datagrid.border}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        backgroundColor: theme.palette.background.paper,
        '& .MuiDataGrid-main': {
          overflow: 'auto',
          maxWidth: isMobile ? 'calc(100vw - 32px)' : '100%',
        },
        '& .MuiDataGrid-virtualScroller': {
          overflowX: 'auto !important',
          overflowY: 'auto !important',
        },
        '& .MuiDataGrid-root': {
          width: '100%',
          maxWidth: '100%',
        },
        '& .MuiDataGrid-columnHeader': {
          backgroundColor: theme.palette.datagrid.header,
          color: theme.palette.text.primary,
          fontWeight: theme.typography.fontWeightBold,
        },
        '& .MuiDataGrid-columnSeparator': {
          display: 'none',
        },
        '& .MuiDataGrid-sortIcon': {
          fontSize: '0.875rem',
        },
        '& .MuiDataGrid-iconButtonContainer': {
          marginLeft: theme.spacing(0.5),
        },
        '& .MuiDataGrid-cell': {
          display: 'flex',
          alignItems: 'center',
          fontSize: '0.875rem',
          borderBottom: `1px solid ${theme.palette.datagrid.border}`,
        },
        '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
          outline: 'none',
          border: 'none',
          boxShadow: 'none',
        },
        '& .MuiDataGrid-row:hover': {
          backgroundColor: theme.palette.datagrid.hover,
        },
        '& .MuiDataGrid-row.Mui-selected:hover': {
          backgroundColor: theme.palette.datagrid.selected,
        },
        '& .even-row': {
          backgroundColor: theme.palette.datagrid.rowEven,
        },
        '& .odd-row': {
          backgroundColor: theme.palette.datagrid.rowOdd,
        },
        ...getStickyStyles(),
      }}
      {...rest}
    />
  );
}

export default BaseDataGrid;

