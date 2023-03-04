import React, { useContext, useState } from "react";
import { makeStyles } from "tss-react/mui";
import {
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    Typography,
    ListItemIcon,
    ListItemText,
    SvgIconTypeMap,
    Grid,
    Box,
    Theme
} from "@mui/material";

import { Face, ExitToApp } from "@mui/icons-material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/userContext";

type NavMenuItem = {
    name: string;
    action?: () => void;
    iconComponent: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
};

const useStyles = makeStyles()((theme: Theme) => ({
    root: {
        color: "white",
        ":hover": {
            border: 0,
        },
    },
    menu: {
        "&:hover": {
            backgroundColor: "black",
        },
    },
    small: {
        width: theme.spacing(4),
        height: theme.spacing(4),
    },
}));

const NavBarMenu: React.FC<any> = (props: any) => {
    const { classes } = useStyles();
    const history = useNavigate();
    const [anchor, setAnchor] = useState<undefined | HTMLElement>(undefined);
    const userContext = useContext(UserContext);
    const navMenuItems: NavMenuItem[] = [
        { name: "Profile", iconComponent: Face, action: () => history("profile") },
        { name: "Log Out", iconComponent: ExitToApp, action: () => window.location.href = "/api/logout" },
    ];

    const clickMenu = (e: React.MouseEvent<HTMLElement>) => {
        setAnchor(e.currentTarget);
    };

    const onClose = (e: any) => {
        setAnchor(undefined);
    };

    const isMenuOpened = () => {
        return Boolean(anchor);
    };

    const renderNavMenuItems = (navItems: NavMenuItem[]) => {
        return navItems.map((item) => (
            <MenuItem onClick={onClose} key={item.name}>
                <ListItemIcon>
                    <item.iconComponent />
                </ListItemIcon>
                <ListItemText primary={item.name} onClick={item.action} />
            </MenuItem>
        ));
    };

    if (!userContext.user.username || !userContext.user.twitchUserProfile) {
        return null;
    }

    const menu = <Menu
            id="navbar-menu"
            anchorEl={anchor}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
            open={isMenuOpened()}
            onClose={onClose}>
        {renderNavMenuItems(navMenuItems)}
    </Menu>;

    return (
        <React.Fragment>
            <IconButton className={classes.root} onClick={clickMenu} aria-owns={anchor ? "navbar-menu" : undefined}>
                <div className={classes.root}>
                    <Grid container alignItems="center">
                        <Grid item>
                            <Avatar
                                className={classes.small}
                                src={userContext.user.twitchUserProfile.profileImageUrl}
                            ></Avatar>
                        </Grid>
                        <Grid item>
                            <Box ml={1}>
                                <Typography>{userContext.user.twitchUserProfile.displayName}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </div>
            </IconButton>
            {menu}
        </React.Fragment>
    );
};

export default NavBarMenu;
