import React, { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { makeStyles } from "tss-react/mui";
import { List, ListItem, ListItemIcon, ListItemText, Divider, Drawer, Icon, Theme, useTheme, IconButton } from "@mui/material";

import { Route, DashboardRoutes } from "../../Routes";
import { UserContext } from "../../contexts/userContext";
import { Brightness7, Brightness4 } from "@mui/icons-material";
import { ColorModeContext } from "defaultTheme";

const width = 235;
const useStyles = makeStyles()((theme: Theme) => {
    return {
        root: {
            flexShrink: 0,
            width,
        },
        nested: {
            paddingLeft: theme.spacing(4),
        },
        drawer: {
            width,
        },
        drawerPaper: {
            width,
        },
        iconButtonContainer: {
            minHeight: theme.mixins.toolbar.minHeight,
            textAlign: "center"
        },
    };
});

const SideBar: React.FC<any> = (props: any) => {
    const isOpened: boolean = true;
    const location = useLocation();
    const history = useNavigate();
    const { classes } = useStyles();
    const userContext = useContext(UserContext);
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);

    const reroute = (path: string) => {
        history(path);
    };
    const renderRoutes = (routes: Route[]) => {
        const listItems = routes.map((r: Route, i: number) => {
            if (userContext.user.userLevel < r.minUserLevel || r.hideInSidebar === true) {
                return null;
            }

            return (
                <React.Fragment key={r.name + r.minUserLevel}>
                    <Divider />
                    {r.makeDivider ? r.makeDivider(userContext.user.userLevel) : undefined}
                    <ListItem button selected={r.path === location.pathname} onClick={() => reroute(r.path)}>
                        {r.icon && (
                            <ListItemIcon>
                                {typeof r.icon === "string" ? <Icon>{r.icon}</Icon> : <r.icon />}
                            </ListItemIcon>
                        )}
                        <ListItemText primary={r.name} />
                    </ListItem>
                    {i === routes.length - 1 && <Divider />}
                </React.Fragment>
            );
        });

        return (<List> {listItems} </List>);
    };

    return (
        <div className={classes.root}>
            <Drawer variant="persistent" open={isOpened} anchor="left" classes={{ paper: classes.drawerPaper }}>
                <div className={classes.iconButtonContainer}>
                    <IconButton style={{"margin": "0.3em auto"}} onClick={colorMode.toggleColorMode} color="inherit" title="Toggle dark mode">
                        {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>
                </div>

                {renderRoutes(DashboardRoutes)}
            </Drawer>
        </div>
    );
};

export default SideBar;
