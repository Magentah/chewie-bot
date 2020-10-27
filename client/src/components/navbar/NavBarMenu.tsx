import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    Typography,
    ListItem,
    ListItemIcon,
    ListItemText,
    SvgIconTypeMap,
} from "@material-ui/core";

import { Face, Settings, ExitToApp } from "@material-ui/icons";
import { OverridableComponent } from "@material-ui/core/OverridableComponent";

type NavMenuItem = {
    name: string;
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
    const classes = useStyles();
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const navMenuItems: Array<NavMenuItem> = [
        { name: "Profile", iconComponent: Face },
        { name: "Settings", iconComponent: Settings },
        { name: "Log Out", iconComponent: ExitToApp },
    ];

    const clickMenu = (e: React.MouseEvent<HTMLElement>) => {
        setAnchor(e.currentTarget);
    };

    const onClose = () => {
        setAnchor(null);
    };

    const isMenuOpened = () => {
        return Boolean(anchor);
    };

    const user = {
        avatar:
            "https://static-cdn.jtvnw.net/jtv_user_pictures/d86a44c2-eeb9-4416-b365-560fc2f81904-profile_image-70x70.png",
    };

    const renderNavMenuItems = (navMenuItems: Array<NavMenuItem>) => {
        return navMenuItems.map((item) => (
            <MenuItem button onClick={onClose} key={item.name}>
                <ListItemIcon>
                    <item.iconComponent />
                </ListItemIcon>
                <ListItemText primary={item.name} />
            </MenuItem>
        ));
    };

    return (
        <React.Fragment>
            <IconButton className={classes.root} onClick={clickMenu} aria-owns={anchor ? "navbar-menu" : undefined}>
                <div className={classes.root}>
                    <Avatar src={user.avatar} className={classes.small} />
                </div>
            </IconButton>
            <Menu
                id="navbar-menu"
                anchorEl={anchor}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
                getContentAnchorEl={null}
                open={isMenuOpened()}
                onClose={onClose}
            >
                {renderNavMenuItems(navMenuItems)}
            </Menu>
        </React.Fragment>
    );
};

export default NavBarMenu;
