import React, { useState } from 'react';
import { 
  Box, 
  Avatar, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  IconButton,
  Tooltip,
  Divider,
  CircularProgress
} from '@mui/material';
import githubService from '../services/githubService';
import { useGitHubUser } from '../services/githubQueryHooks';

interface UserMenuProps {
  onLogout?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onLogout }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // Use React Query hook to fetch GitHub user data
  const { data: user, isLoading, error } = useGitHubUser();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    githubService.logout();
    if (onLogout) {
      onLogout();
    }
    // Force a reload to ensure the app resets to the login state
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  
  if (error || !user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title="Account settings">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ ml: 2 }}
          aria-controls={open ? 'account-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <Avatar 
            sx={{ width: 32, height: 32 }}
            alt={user.name || user.login}
            src={user.avatar_url}
          />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem disabled>
          {user.name || user.login}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserMenu;
