import React, { Props } from "react";
import { makeStyles, fade } from "@material-ui/core/styles";
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Typography,
} from "@material-ui/core";
import { Notifications, AccountBoxOutlined, LiveTv } from "@material-ui/icons";
import NavBarMenu from "./NavBarMenu";

type NavBarProps = {};
const sidebarWidth = 230;
const useStyles = makeStyles((theme) => ({
  appBar: {
    width: `calc(100% - ${sidebarWidth}px)`,
    marginLeft: sidebarWidth,
    backgroundColor: "#282C34",
  },
  rightMenu: {
    marginLeft: "auto",
    marginRight: -12,
  },
  iconButton: {
    color: "white",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
  },
}));

const NavBar: React.FC<NavBarProps> = (props: NavBarProps) => {
  const classes = useStyles();
  const watchChewie = () => {
    window.open("https://www.twitch.tv/chewiemelodies", "_blank");
  };
  return (
    <AppBar position="fixed" className={classes.appBar}>
      <Toolbar>
        <Typography>
          <div>Chewie Melodies</div>
        </Typography>

        <div className={classes.rightMenu}>
          <IconButton
            color="inherit"
            className={classes.iconButton}
            onClick={watchChewie}
          >
            <LiveTv />
          </IconButton>
          <IconButton color="inherit" className={classes.iconButton}>
            <Notifications />
          </IconButton>
          <IconButton color="inherit" className={classes.iconButton}>
            <AccountBoxOutlined />
          </IconButton>
          <NavBarMenu />
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
