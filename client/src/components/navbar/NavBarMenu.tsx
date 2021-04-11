import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
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
} from "@material-ui/core";

import { Face, ExitToApp } from "@material-ui/icons";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";
import * as Cookie from "js-cookie";
import { useHistory } from "react-router-dom";

type NavMenuItem = {
    name: string;
    action?: () => void;
    iconComponent: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
};

const useStyles = makeStyles((theme) => ({
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
    const userProfile = Cookie.getJSON("user");
    const classes = useStyles();
    const history = useHistory();
    const [anchor, setAnchor] = useState<undefined | HTMLElement>(undefined);
    const navMenuItems: NavMenuItem[] = [
        { name: "Profile", iconComponent: Face, action: () => history.push("profile") },
        { name: "Log Out", iconComponent: ExitToApp, action: () => window.location.href = "/api/logout" },
    ];

    const clickMenu = (e: React.MouseEvent<HTMLElement>) => {
        setAnchor(e.currentTarget);
    };

    const onClose = () => {
        setAnchor(undefined);
    };

    const isMenuOpened = () => {
        return Boolean(anchor);
    };

    const renderNavMenuItems = (navItems: NavMenuItem[]) => {
        return navItems.map((item) => (
            <MenuItem button onClick={onClose} key={item.name}>
                <ListItemIcon>
                    <item.iconComponent />
                </ListItemIcon>
                <ListItemText primary={item.name} onClick={item.action} />
            </MenuItem>
        ));
    };

    if (!userProfile) {
        return null;
    }

    const menu = !userProfile.username ? undefined : <Menu
            id="navbar-menu"
            anchorEl={anchor}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
            getContentAnchorEl={undefined}
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
                                src={userProfile.twitchUserProfile.profileImageUrl}
                            ></Avatar>
                        </Grid>
                        <Grid item>
                            <Box ml={1}>
                                <Typography>{userProfile.twitchUserProfile.displayName}</Typography>
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
